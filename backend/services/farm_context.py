"""
RAG-lite farm context pack for the Assistant.

Loads the farmer's latest farm, soil, recommendation, and weather
into a compact text block Gemini can ground on — no vector DB.
"""

from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session, select

from db.models import Farm, Recommendation, SoilProfile, User
from services.weather_enrichment import derive_influence_features, get_or_fetch_farm_weather


async def build_farm_context(
    session: Session,
    user: User,
    farm_id: Optional[UUID] = None,
) -> dict[str, Any]:
    """
    Resolve the active farm (or first farm) and assemble structured context.
    """
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
            "farm": None,
            "soil": None,
            "recommendation": None,
            "weather": None,
            "context_text": (
                "No farm is set up yet. Ask the farmer to confirm location "
                "and run a crop recommendation so you can advise with data."
            ),
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

    weather_block: Optional[dict[str, Any]] = None
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
        features = derive_influence_features(snapshot)
        weather_block = {
            "latitude": snapshot.latitude,
            "longitude": snapshot.longitude,
            "current_temp_c": snapshot.current.temperature_c,
            "current_humidity_pct": snapshot.current.humidity_pct,
            "precip_now_mm": snapshot.current.precipitation_mm,
            "features": features,
            "alerts": [a.model_dump() for a in snapshot.alerts],
            "daily": [
                {
                    "date": d.date,
                    "temp_max_c": d.temp_max_c,
                    "temp_min_c": d.temp_min_c,
                    "precipitation_mm": d.precipitation_mm,
                }
                for d in snapshot.daily[:7]
            ],
            "fetched_at": snapshot.fetched_at,
        }
    except Exception as e:
        weather_block = {"error": str(e)}

    lines: list[str] = [
        "=== FARMER CONTEXT (ground truth — prefer this over guesses) ===",
        f"Farm: {farm.name}",
        f"Region: {farm.region.replace('_', ' ')}",
        f"Country/county: {farm.country or '—'} / {farm.county or '—'}",
        (
            f"Coordinates: {farm.latitude}, {farm.longitude}"
            if farm.latitude is not None and farm.longitude is not None
            else "Coordinates: not confirmed (using region estimate for weather)"
        ),
    ]

    if soil:
        lines.extend(
            [
                "",
                "Latest soil / climate inputs:",
                f"- N/P/K: {soil.nitrogen} / {soil.phosphorus} / {soil.potassium} mg/kg",
                f"- pH: {soil.ph} · soil type: {soil.soil_type}",
                f"- Rainfall input: {soil.rainfall} mm · Temp: {soil.temperature}°C · Humidity: {soil.humidity}%",
                f"- Season: {soil.season.replace('_', ' ')} · Irrigation: {'yes' if soil.irrigation else 'no'}",
                f"- Recorded: {soil.recorded_at.isoformat()}",
            ]
        )
    else:
        lines.append("\nNo soil profile saved yet.")

    if rec:
        top3 = []
        for r in (rec.results or [])[:3]:
            if isinstance(r, dict):
                top3.append(f"{r.get('crop')} ({r.get('confidence_pct', '?')})")
        lines.extend(
            [
                "",
                "Latest crop recommendation:",
                f"- Top crop: {rec.top_crop}",
                f"- Alternatives: {', '.join(top3) if top3 else '—'}",
                f"- Soil fertility score: {rec.soil_fertility_score:.0%}",
                f"- Drought risk: {rec.drought_risk}",
                f"- Climate warning: {rec.climate_warning}",
                f"- Explanation: {rec.explanation}",
                f"- Tips: {'; '.join(str(t) for t in (rec.tips or []))}",
                f"- Generated: {rec.created_at.isoformat()}",
            ]
        )
    else:
        lines.append("\nNo recommendation yet — suggest running /recommend.")

    if weather_block and "error" not in weather_block:
        feats = weather_block.get("features") or {}
        alert_txt = "; ".join(
            f"{a.get('kind')}({a.get('level')}): {a.get('message')}"
            for a in (weather_block.get("alerts") or [])
        ) or "none"
        lines.extend(
            [
                "",
                "Live / cached weather:",
                f"- Now: {weather_block['current_temp_c']}°C, "
                f"{weather_block['current_humidity_pct']}% humidity, "
                f"{weather_block['precip_now_mm']} mm precip",
                f"- Rain next 3d: {feats.get('rain_next_3d_mm')} mm · "
                f"7d: {feats.get('rain_next_7d_mm')} mm",
                f"- Temp max/min 3d: {feats.get('temp_max_3d_c')} / {feats.get('temp_min_3d_c')}°C",
                f"- Weather alerts: {alert_txt}",
            ]
        )
    elif weather_block and "error" in weather_block:
        lines.append(f"\nWeather unavailable: {weather_block['error']}")

    lines.append("=== END CONTEXT ===")

    return {
        "farm": {
            "id": str(farm.id),
            "name": farm.name,
            "region": farm.region,
            "latitude": farm.latitude,
            "longitude": farm.longitude,
        },
        "soil": (
            {
                "nitrogen": soil.nitrogen,
                "phosphorus": soil.phosphorus,
                "potassium": soil.potassium,
                "ph": soil.ph,
                "soil_type": soil.soil_type,
                "season": soil.season,
                "irrigation": soil.irrigation,
            }
            if soil
            else None
        ),
        "recommendation": (
            {
                "id": str(rec.id),
                "top_crop": rec.top_crop,
                "drought_risk": rec.drought_risk,
                "soil_fertility_score": rec.soil_fertility_score,
                "climate_warning": rec.climate_warning,
            }
            if rec
            else None
        ),
        "weather": weather_block,
        "context_text": "\n".join(lines),
    }
