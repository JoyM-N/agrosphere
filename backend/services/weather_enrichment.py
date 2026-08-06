"""
Weather enrichment for crop recommendations.

The trained ML model only knows rainfall / temperature / humidity.
We do NOT add new model columns here (that would require retraining).

Instead we:
  1. Derive climate inputs from the live/cached forecast
  2. Blend them into farm_data before predict()
  3. Escalate drought_risk / climate warnings using forecast features
  4. Persist snapshots so history and analytics can reuse them
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session, select

from db.models import WeatherSnapshotRecord, utcnow
from services.weather_service import (
    WeatherSnapshot,
    fetch_weather,
    resolve_coordinates,
)

# Reuse a farm forecast if newer than this.
WEATHER_CACHE_TTL = timedelta(hours=1)

_DROUGHT_RANK = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
_RANK_DROUGHT = {v: k for k, v in _DROUGHT_RANK.items()}


def derive_influence_features(snapshot: WeatherSnapshot) -> dict[str, Any]:
    """Compact features used for recommend influence + storage."""
    daily = snapshot.daily
    next3 = daily[:3]
    next7 = daily[:7]

    rain_3d = sum(d.precipitation_mm for d in next3) if next3 else 0.0
    rain_7d = sum(d.precipitation_mm for d in next7) if next7 else 0.0
    temp_max_3d = max((d.temp_max_c for d in next3), default=snapshot.current.temperature_c)
    temp_min_3d = min((d.temp_min_c for d in next3), default=snapshot.current.temperature_c)
    avg_temp_3d = (
        sum((d.temp_max_c + d.temp_min_c) / 2 for d in next3) / len(next3)
        if next3
        else snapshot.current.temperature_c
    )

    return {
        "rain_next_3d_mm": round(rain_3d, 2),
        "rain_next_7d_mm": round(rain_7d, 2),
        "temp_max_3d_c": round(temp_max_3d, 2),
        "temp_min_3d_c": round(temp_min_3d, 2),
        "temp_avg_3d_c": round(avg_temp_3d, 2),
        "current_temp_c": snapshot.current.temperature_c,
        "current_humidity_pct": snapshot.current.humidity_pct,
        "rainfall_annual_proxy_mm": snapshot.suggest_rainfall_mm_year_proxy,
        "alert_kinds": [a.kind for a in snapshot.alerts],
        "alert_levels": [a.level for a in snapshot.alerts],
    }


def climate_inputs_from_snapshot(snapshot: WeatherSnapshot) -> dict[str, float]:
    """Map forecast → ML climate fields (same schema the model already knows)."""
    features = derive_influence_features(snapshot)
    # Prefer short-horizon average temp over a single instantaneous reading
    temperature = features["temp_avg_3d_c"]
    humidity = snapshot.suggest_humidity
    # Prefer seasonal-ish proxy, but floor/ceil to model bounds
    rainfall = max(50.0, min(3000.0, snapshot.suggest_rainfall_mm_year_proxy))
    return {
        "temperature": round(float(temperature), 2),
        "humidity": round(float(humidity), 2),
        "rainfall": round(float(rainfall), 1),
    }


def apply_weather_to_farm_data(
    farm_data: dict[str, Any],
    snapshot: WeatherSnapshot,
    *,
    overwrite_climate: bool = True,
) -> dict[str, Any]:
    """
    Returns a copy of farm_data with climate fields influenced by weather
    and a `_weather` metadata block for input_snapshot transparency.
    """
    enriched = dict(farm_data)
    features = derive_influence_features(snapshot)
    climate = climate_inputs_from_snapshot(snapshot)

    before = {
        "temperature": enriched.get("temperature"),
        "humidity": enriched.get("humidity"),
        "rainfall": enriched.get("rainfall"),
    }

    if overwrite_climate:
        enriched.update(climate)

    enriched["_weather"] = {
        "source": snapshot.source,
        "fetched_at": snapshot.fetched_at,
        "latitude": snapshot.latitude,
        "longitude": snapshot.longitude,
        "features": features,
        "alerts": [a.model_dump() for a in snapshot.alerts],
        "climate_before": before,
        "climate_after": {
            "temperature": enriched.get("temperature"),
            "humidity": enriched.get("humidity"),
            "rainfall": enriched.get("rainfall"),
        },
        "overwrite_climate": overwrite_climate,
    }
    return enriched


def escalate_drought_risk(base_risk: str, features: dict[str, Any]) -> str:
    """Raise drought risk when the forecast shows dry conditions."""
    rank = _DROUGHT_RANK.get(base_risk, 1)
    rain_3d = float(features.get("rain_next_3d_mm") or 0)
    temp_max = float(features.get("temp_max_3d_c") or 0)

    if rain_3d < 2:
        rank = max(rank, 3)  # critical
    elif rain_3d < 8:
        rank = max(rank, 2)  # high
    elif rain_3d < 15 and temp_max >= 32:
        rank = max(rank, 2)

    return _RANK_DROUGHT.get(rank, base_risk)


def merge_climate_warning(
    ai_warning: str,
    snapshot: WeatherSnapshot,
) -> str:
    warning_alerts = [
        a.message for a in snapshot.alerts if a.level in ("warning", "watch")
    ]
    if not warning_alerts:
        return ai_warning
    weather_line = warning_alerts[0]
    if not ai_warning:
        return weather_line
    if weather_line.lower() in ai_warning.lower():
        return ai_warning
    return f"{ai_warning} Live forecast: {weather_line}"


def snapshot_from_record(record: WeatherSnapshotRecord) -> WeatherSnapshot:
    return WeatherSnapshot.model_validate(record.payload)


def get_cached_farm_weather(
    session: Session,
    farm_id: UUID,
    *,
    max_age: timedelta = WEATHER_CACHE_TTL,
) -> Optional[WeatherSnapshotRecord]:
    record = session.exec(
        select(WeatherSnapshotRecord)
        .where(WeatherSnapshotRecord.farm_id == farm_id)
        .order_by(WeatherSnapshotRecord.fetched_at.desc())
    ).first()
    if record is None:
        return None
    fetched = record.fetched_at
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - fetched > max_age:
        return None
    return record


async def get_or_fetch_farm_weather(
    session: Session,
    *,
    farm_id: UUID,
    user_id: Optional[UUID],
    latitude: Optional[float],
    longitude: Optional[float],
    region: str,
    force_refresh: bool = False,
) -> tuple[WeatherSnapshot, WeatherSnapshotRecord]:
    lat, lon = resolve_coordinates(
        latitude=latitude,
        longitude=longitude,
        region=region,
    )

    if not force_refresh:
        cached = get_cached_farm_weather(session, farm_id)
        if cached is not None:
            # Stale if farmer moved the pin since this pull
            if (
                abs(cached.latitude - lat) < 1e-4
                and abs(cached.longitude - lon) < 1e-4
            ):
                return snapshot_from_record(cached), cached

    snapshot = await fetch_weather(lat, lon)
    features = derive_influence_features(snapshot)
    record = WeatherSnapshotRecord(
        farm_id=farm_id,
        user_id=user_id,
        latitude=snapshot.latitude,
        longitude=snapshot.longitude,
        source=snapshot.source,
        payload=snapshot.model_dump(),
        features=features,
        fetched_at=utcnow(),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return snapshot, record


async def fetch_and_optionally_store(
    session: Optional[Session],
    *,
    latitude: Optional[float],
    longitude: Optional[float],
    region: Optional[str],
    farm_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
) -> tuple[WeatherSnapshot, Optional[WeatherSnapshotRecord]]:
    lat, lon = resolve_coordinates(
        latitude=latitude,
        longitude=longitude,
        region=region,
    )
    snapshot = await fetch_weather(lat, lon)

    if session is None or farm_id is None:
        return snapshot, None

    features = derive_influence_features(snapshot)
    record = WeatherSnapshotRecord(
        farm_id=farm_id,
        user_id=user_id,
        latitude=snapshot.latitude,
        longitude=snapshot.longitude,
        source=snapshot.source,
        payload=snapshot.model_dump(),
        features=features,
        fetched_at=utcnow(),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return snapshot, record
