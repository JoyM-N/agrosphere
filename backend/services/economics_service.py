"""
Farm economics + rule-based sustainability (Phase 4).

Economics: curated region-static price/cost tables.
Sustainability: explicit water / soil / climate rules — not ML.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session, select

from data.crop_economics import (
    CROP_ECONOMICS,
    DISCLAIMER,
    REGION_FACTORS,
)
from db.models import Farm, Recommendation, SoilProfile, User
from services.weather_enrichment import derive_influence_features, get_or_fetch_farm_weather


def _norm_crop(name: str) -> str:
    return (name or "").strip().lower().replace(" ", "_").replace("-", "_")


def estimate_crop_economics(
    crop: str,
    region: str,
    *,
    confidence: Optional[float] = None,
) -> Optional[dict[str, Any]]:
    key = _norm_crop(crop)
    base = CROP_ECONOMICS.get(key)
    if not base:
        return None

    factors = REGION_FACTORS.get(region, REGION_FACTORS["highland"])
    yld = base["yield_per_acre"] * factors["yield"]
    price = base["price_kes"] * factors["price"]
    inputs = base["input_cost_kes"] * factors["cost"]
    labour = base["labour_cost_kes"] * factors["cost"]
    # Mild confidence dampener: lower ML confidence → slightly lower expected yield
    if confidence is not None and 0 < confidence <= 1:
        yld *= 0.85 + 0.15 * confidence

    revenue = yld * price
    cost = inputs + labour
    margin = revenue - cost
    margin_pct = (margin / revenue * 100) if revenue > 0 else 0.0

    return {
        "crop": key,
        "display": base["display"],
        "unit": base["unit"],
        "cycle_months": base["cycle_months"],
        "water_intensity": base["water_intensity"],
        "yield_per_acre": round(yld, 1),
        "price_kes": round(price, 0),
        "input_cost_kes": round(inputs, 0),
        "labour_cost_kes": round(labour, 0),
        "estimated_cost_kes_per_acre": round(cost, 0),
        "estimated_revenue_kes_per_acre": round(revenue, 0),
        "estimated_margin_kes_per_acre": round(margin, 0),
        "margin_pct": round(margin_pct, 1),
        "region_factor": factors,
        "assumptions": [
            f"Typical yield ~{round(yld, 1)} {base['unit']}/acre in {region.replace('_', ' ')}",
            f"Farmgate-style price ~KES {round(price):,.0f} per {base['unit']}",
            f"Inputs + labour ~KES {round(cost):,.0f}/acre",
        ],
    }


def score_sustainability(
    *,
    crop: Optional[str],
    region: str,
    soil: Optional[SoilProfile],
    drought_risk: Optional[str],
    soil_fertility: Optional[float],
    weather_features: dict[str, Any],
    irrigation: int = 0,
) -> dict[str, Any]:
    """
    Rule-based index 0–100. Explicit pillars — do not present as ML.
    """
    crop_key = _norm_crop(crop) if crop else ""
    crop_meta = CROP_ECONOMICS.get(crop_key, {})
    water_need = crop_meta.get("water_intensity", "medium")

    rain_3d = float(weather_features.get("rain_next_3d_mm") or 0)
    rain_7d = float(weather_features.get("rain_next_7d_mm") or 0)
    temp_max = float(
        weather_features.get("temp_max_3d_c")
        or weather_features.get("current_temp_c")
        or 28
    )

    # ── Water pillar ───────────────────────────────────────────────────
    water_score = 70
    water_reasons: list[str] = []
    if water_need == "high":
        water_score -= 15
        water_reasons.append("This crop usually needs a lot of water.")
        if irrigation:
            water_score += 20
            water_reasons.append("Irrigation available — helps high water need.")
        elif rain_7d < 15:
            water_score -= 20
            water_reasons.append(f"Only ~{rain_7d:.0f} mm rain expected in 7 days.")
        elif rain_7d >= 30:
            water_score += 10
            water_reasons.append(f"Good rain ahead (~{rain_7d:.0f} mm / 7 days).")
    elif water_need == "low":
        water_score += 15
        water_reasons.append("Crop is relatively drought-tolerant.")
        if rain_7d < 8 and not irrigation:
            water_score -= 5
            water_reasons.append("Still dry ahead — mulch to keep moisture.")
    else:
        water_reasons.append("Medium water need.")
        if irrigation:
            water_score += 10
            water_reasons.append("Irrigation cushions dry spells.")
        if rain_7d >= 20:
            water_score += 8
            water_reasons.append(f"Decent rain ahead (~{rain_7d:.0f} mm / 7d).")
        elif rain_7d < 8 and not irrigation:
            water_score -= 12
            water_reasons.append(f"Light rain ahead (~{rain_7d:.0f} mm / 7d).")

    if region in ("arid", "semi_arid") and water_need == "high" and not irrigation:
        water_score -= 15
        water_reasons.append(f"{region.replace('_', ' ')} region + thirsty crop is risky.")

    water_score = int(max(0, min(100, water_score)))

    # ── Soil pillar ────────────────────────────────────────────────────
    soil_score = 55
    soil_reasons: list[str] = []
    if soil_fertility is not None:
        soil_score = int(40 + soil_fertility * 55)
        soil_reasons.append(f"Soil fertility index from last analysis: {soil_fertility:.0%}.")
    if soil is not None:
        if 5.5 <= soil.ph <= 7.5:
            soil_score += 10
            soil_reasons.append(f"pH {soil.ph} is in a friendly range for most crops.")
        elif soil.ph < 5.0 or soil.ph > 8.0:
            soil_score -= 15
            soil_reasons.append(f"pH {soil.ph} may limit nutrients — amend with manure/lime as needed.")
        else:
            soil_reasons.append(f"pH {soil.ph} is workable with care.")
        if soil.soil_type in ("loamy", "silty"):
            soil_score += 8
            soil_reasons.append(f"{soil.soil_type} soil generally holds nutrients well.")
        elif soil.soil_type in ("sandy", "saline"):
            soil_score -= 8
            soil_reasons.append(f"{soil.soil_type} soil needs more organic matter / care.")
    else:
        soil_reasons.append("No soil profile yet — score is provisional. Run a recommendation.")

    soil_score = int(max(0, min(100, soil_score)))

    # ── Climate pillar ─────────────────────────────────────────────────
    climate_score = 70
    climate_reasons: list[str] = []
    risk = (drought_risk or "moderate").lower()
    risk_pen = {"low": 5, "moderate": -5, "high": -20, "critical": -35}.get(risk, -5)
    climate_score += risk_pen
    climate_reasons.append(f"Drought risk from last recommendation: {risk}.")

    if temp_max >= 35:
        climate_score -= 15
        climate_reasons.append(f"Hot spell ahead (up to ~{temp_max:.0f}°C).")
    elif temp_max >= 32:
        climate_score -= 8
        climate_reasons.append(f"Warm days ahead (~{temp_max:.0f}°C max).")

    if rain_3d >= 40:
        climate_score -= 5
        climate_reasons.append(f"Heavy short-term rain (~{rain_3d:.0f} mm / 3d) — watch waterlogging.")
    if rain_7d < 5 and risk in ("high", "critical"):
        climate_score -= 10
        climate_reasons.append("Very dry week combined with high drought risk.")

    if region == "highland" and crop_key in ("potato", "tea", "wheat", "apple"):
        climate_score += 8
        climate_reasons.append("Highland climate often suits this crop.")
    if region in ("arid", "semi_arid") and crop_key in ("sorghum", "millet", "cassava", "pigeon_peas"):
        climate_score += 10
        climate_reasons.append("Crop matches dryland conditions well.")

    climate_score = int(max(0, min(100, climate_score)))

    # Weighted overall
    overall = int(round(0.35 * water_score + 0.35 * soil_score + 0.30 * climate_score))
    if overall >= 80:
        grade = "A"
    elif overall >= 65:
        grade = "B"
    elif overall >= 50:
        grade = "C"
    elif overall >= 35:
        grade = "D"
    else:
        grade = "E"

    tips: list[str] = []
    if water_score < 55:
        tips.append("Add mulch and, if possible, irrigation before planting a thirsty crop.")
    if soil_score < 55:
        tips.append("Improve soil with compost or manure; retest nutrients when you can.")
    if climate_score < 55:
        tips.append("Delay planting until a wetter window, or choose a more drought-tolerant crop.")
    if not tips:
        tips.append("Conditions look manageable — still confirm weather the week you plant.")

    return {
        "score": overall,
        "grade": grade,
        "method": "rule_based_v1",
        "method_note": (
            "Sustainability score from water, soil, and climate rules — "
            "not a machine-learning model."
        ),
        "pillars": {
            "water": {"score": water_score, "reasons": water_reasons},
            "soil": {"score": soil_score, "reasons": soil_reasons},
            "climate": {"score": climate_score, "reasons": climate_reasons},
        },
        "tips": tips,
    }


async def build_economics_report(
    session: Session,
    user: User,
    farm_id: Optional[UUID] = None,
    crop: Optional[str] = None,
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
            "currency": "KES",
            "source": "curated_region_static_v1",
            "disclaimer": DISCLAIMER,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "focus": None,
            "alternatives": [],
            "sustainability": score_sustainability(
                crop=None,
                region="highland",
                soil=None,
                drought_risk=None,
                soil_fertility=None,
                weather_features={},
            ),
            "price_table": [
                estimate_crop_economics(c, "highland")
                for c in ("maize", "beans", "potato", "sorghum", "tomato")
                if estimate_crop_economics(c, "highland")
            ],
            "message": "Set up a farm and run a recommendation for personalised economics.",
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

    weather_features: dict[str, Any] = {}
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
        weather_features = derive_influence_features(snapshot)
    except Exception:
        weather_features = {}

    focus_crop = _norm_crop(crop) if crop else None
    if not focus_crop and rec:
        focus_crop = _norm_crop(rec.top_crop)

    conf: Optional[float] = None
    if rec and rec.results:
        first = rec.results[0]
        if isinstance(first, dict) and "confidence" in first:
            try:
                conf = float(first["confidence"])
            except (TypeError, ValueError):
                conf = None

    focus = (
        estimate_crop_economics(focus_crop, farm.region, confidence=conf)
        if focus_crop
        else None
    )

    alternatives: list[dict[str, Any]] = []
    if rec and isinstance(rec.results, list):
        for row in rec.results[:5]:
            if not isinstance(row, dict):
                continue
            cname = row.get("crop")
            if not cname:
                continue
            cconf = row.get("confidence")
            try:
                cconf_f = float(cconf) if cconf is not None else None
            except (TypeError, ValueError):
                cconf_f = None
            est = estimate_crop_economics(str(cname), farm.region, confidence=cconf_f)
            if est:
                est["ml_confidence_pct"] = row.get("confidence_pct")
                est["ml_rank"] = row.get("rank")
                alternatives.append(est)

    # If no rec alternatives, show a few regional staples
    if not alternatives:
        staples = {
            "highland": ["maize", "potato", "beans", "cabbage", "wheat"],
            "coastal": ["cassava", "coconut", "mango", "tomato", "maize"],
            "semi_arid": ["sorghum", "millet", "pigeon_peas", "groundnut", "beans"],
            "arid": ["sorghum", "millet", "cassava", "pigeon_peas"],
            "sub_humid": ["maize", "beans", "banana", "sweetpotato", "tomato"],
        }.get(farm.region, ["maize", "beans", "sorghum"])
        for c in staples:
            est = estimate_crop_economics(c, farm.region)
            if est:
                alternatives.append(est)

    irrigation = int(soil.irrigation) if soil else 0
    drought = rec.drought_risk if rec else None
    fertility = rec.soil_fertility_score if rec else None

    sustainability = score_sustainability(
        crop=focus_crop or (alternatives[0]["crop"] if alternatives else None),
        region=farm.region,
        soil=soil,
        drought_risk=drought,
        soil_fertility=fertility,
        weather_features=weather_features,
        irrigation=irrigation,
    )

    # Compact price table for UI (focus + alts unique)
    seen: set[str] = set()
    price_table: list[dict[str, Any]] = []
    for row in ([focus] if focus else []) + alternatives:
        if not row or row["crop"] in seen:
            continue
        seen.add(row["crop"])
        price_table.append(row)

    return {
        "farm_id": str(farm.id),
        "farm_name": farm.name,
        "region": farm.region,
        "currency": "KES",
        "source": "curated_region_static_v1",
        "disclaimer": DISCLAIMER,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "focus": focus,
        "alternatives": alternatives,
        "sustainability": sustainability,
        "price_table": price_table,
        "has_recommendation": rec is not None,
        "weather_features": {
            "rain_next_3d_mm": weather_features.get("rain_next_3d_mm"),
            "rain_next_7d_mm": weather_features.get("rain_next_7d_mm"),
            "temp_max_3d_c": weather_features.get("temp_max_3d_c"),
        },
    }
