"""
Rule + weather driven farm alerts (drought, planting window, heat, rain, etc.).

Computed on demand — no separate alerts table in Phase 3.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session, select

from db.models import Farm, Recommendation, SoilProfile, User
from services.weather_enrichment import derive_influence_features, get_or_fetch_farm_weather
from services.weather_service import WeatherAlert

# East Africa simplified planting calendars (month 1–12)
PLANTING_MONTHS: dict[str, set[int]] = {
    "long_rains": {3, 4, 5},
    "short_rains": {10, 11, 12},
    "dry": set(),  # discourage without irrigation
    "transitional": {2, 6, 9},
}


def _level_rank(level: str) -> int:
    return {"info": 0, "watch": 1, "warning": 2, "critical": 3}.get(level, 0)


def _planting_alerts(
    *,
    season: Optional[str],
    irrigation: int,
    rain_7d: float,
    rain_3d: float,
    month: int,
) -> list[WeatherAlert]:
    alerts: list[WeatherAlert] = []
    season = season or "long_rains"
    window = PLANTING_MONTHS.get(season, PLANTING_MONTHS["long_rains"])
    in_calendar = month in window

    if season == "dry" and not irrigation:
        alerts.append(
            WeatherAlert(
                level="warning",
                kind="planting_window",
                message=(
                    "Dry season without irrigation — delay planting or arrange water. "
                    "Mulch if you already have crops in the ground."
                ),
            )
        )
        return alerts

    if in_calendar and rain_7d >= 20 and rain_3d >= 5:
        alerts.append(
            WeatherAlert(
                level="info",
                kind="planting_window",
                message=(
                    f"Good planting window for the {season.replace('_', ' ')} season: "
                    f"about {rain_7d:.0f} mm rain expected over 7 days. "
                    "Prepare seedbed and plant early in the rains."
                ),
            )
        )
    elif in_calendar and rain_7d < 8:
        alerts.append(
            WeatherAlert(
                level="watch",
                kind="planting_window",
                message=(
                    f"It is {season.replace('_', ' ')} season on the calendar, but rain "
                    f"looks light ({rain_7d:.0f} mm / 7 days). Wait for a wetter spell "
                    "or use irrigation if you plant now."
                ),
            )
        )
    elif not in_calendar and season != "dry":
        alerts.append(
            WeatherAlert(
                level="info",
                kind="planting_window",
                message=(
                    f"Outside the usual {season.replace('_', ' ')} planting months. "
                    "Focus on land prep, soil health, and watching the next forecast."
                ),
            )
        )

    if irrigation and rain_7d < 10:
        alerts.append(
            WeatherAlert(
                level="info",
                kind="planting_window",
                message=(
                    "Rain is limited but you have irrigation — you can still plant "
                    "drought-tolerant crops if soil moisture is managed."
                ),
            )
        )

    return alerts


def _recommendation_alerts(rec: Optional[Recommendation]) -> list[WeatherAlert]:
    if rec is None:
        return []
    alerts: list[WeatherAlert] = []
    risk = (rec.drought_risk or "low").lower()
    if risk in ("high", "critical"):
        alerts.append(
            WeatherAlert(
                level="warning" if risk == "high" else "critical",
                kind="drought",
                message=(
                    f"Your latest recommendation marked drought risk as {risk} "
                    f"for {rec.top_crop}. Prioritize mulching and water-saving practices."
                ),
            )
        )
    if rec.climate_warning:
        alerts.append(
            WeatherAlert(
                level="watch",
                kind="drought",
                message=rec.climate_warning,
            )
        )
    return alerts


async def build_farm_alerts(
    session: Session,
    user: User,
    farm_id: Optional[UUID] = None,
) -> dict[str, Any]:
    farm: Optional[Farm] = None
    if farm_id is not None:
        farm = session.get(Farm, farm_id)
        if farm is None or farm.user_id != user.id:
            farm = None
    if farm is None:
        farm = session.exec(
            select(Farm)
            .where(Farm.user_id == user.id)
            .order_by(Farm.created_at)
        ).first()

    if farm is None:
        return {
            "farm_id": None,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "alerts": [
                {
                    "level": "info",
                    "kind": "planting_window",
                    "message": (
                        "Set up your farm and confirm location to receive "
                        "weather and planting alerts."
                    ),
                    "source": "system",
                }
            ],
            "summary": {"total": 1, "warnings": 0, "watches": 0},
        }

    soil = session.exec(
        select(SoilProfile)
        .where(SoilProfile.farm_id == farm.id)
        .order_by(SoilProfile.recorded_at.desc())
    ).first()

    rec = session.exec(
        select(Recommendation)
        .where(Recommendation.farm_id == farm.id)
        .order_by(Recommendation.created_at.desc())
    ).first()

    weather_alerts: list[WeatherAlert] = []
    features: dict[str, Any] = {}
    weather_ok = False
    try:
        snapshot, _ = await get_or_fetch_farm_weather(
            session,
            farm_id=farm.id,
            user_id=user.id,
            latitude=farm.latitude,
            longitude=farm.longitude,
            region=farm.region,
            force_refresh=False,
        )
        weather_alerts = list(snapshot.alerts)
        features = derive_influence_features(snapshot)
        weather_ok = True
    except Exception as e:
        weather_alerts = [
            WeatherAlert(
                level="watch",
                kind="drought",
                message=f"Could not refresh weather ({e}). Check connectivity and try again.",
            )
        ]

    month = datetime.now(timezone.utc).month
    season = soil.season if soil else (rec.input_snapshot or {}).get("season") if rec else None
    irrigation = int(soil.irrigation) if soil else int((rec.input_snapshot or {}).get("irrigation") or 0)
    rain_7d = float(features.get("rain_next_7d_mm") or 0)
    rain_3d = float(features.get("rain_next_3d_mm") or 0)

    planting = _planting_alerts(
        season=season if isinstance(season, str) else "long_rains",
        irrigation=irrigation,
        rain_7d=rain_7d,
        rain_3d=rain_3d,
        month=month,
    )
    from_rec = _recommendation_alerts(rec)

    # Deduplicate by kind+message
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for a in [*weather_alerts, *planting, *from_rec]:
        key = f"{a.kind}|{a.message}"
        if key in seen:
            continue
        seen.add(key)
        source = (
            "weather"
            if a in weather_alerts
            else "planting"
            if a in planting
            else "recommendation"
        )
        merged.append(
            {
                "level": a.level,
                "kind": a.kind,
                "message": a.message,
                "source": source,
            }
        )

    merged.sort(key=lambda x: -_level_rank(x["level"]))

    warnings = sum(1 for a in merged if a["level"] in ("warning", "critical"))
    watches = sum(1 for a in merged if a["level"] == "watch")

    return {
        "farm_id": str(farm.id),
        "farm_name": farm.name,
        "region": farm.region,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "weather_ok": weather_ok,
        "features": features,
        "season": season,
        "alerts": merged,
        "summary": {
            "total": len(merged),
            "warnings": warnings,
            "watches": watches,
        },
    }
