"""
AgroSphere Crops Router
=========================
What this file does:
  Defines the /api/crops endpoints.
  This is what the frontend calls when a farmer submits their data.

Endpoints:
  POST /api/crops/recommend  →  full recommendation + AI explanation
  GET  /api/crops/classes    →  list of all 35 supported crops
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from services.ml_bridge import predict, get_crop_classes
from services.gemini_service import explain_recommendation

router = APIRouter(prefix="/api/crops", tags=["crops"])


# ─── Request schema ───────────────────────────────────────────────────────────
# Pydantic validates every field automatically.
# If a farmer sends ph=15 or temperature="hot", FastAPI
# rejects it with a clear error before it reaches the model.

class RecommendationRequest(BaseModel):
    # Soil measurements
    nitrogen:    float = Field(..., ge=0,   le=200, description="mg/kg")
    phosphorus:  float = Field(..., ge=0,   le=200, description="mg/kg")
    potassium:   float = Field(..., ge=0,   le=200, description="mg/kg")
    ph:          float = Field(..., ge=3.0, le=10.0)
    rainfall:    float = Field(..., ge=0,   le=3000, description="mm/year")
    temperature: float = Field(..., ge=5,   le=50,   description="Celsius")
    humidity:    float = Field(..., ge=10,  le=100,  description="percent")

    # Context
    soil_type:  Literal[
        "loamy","sandy","clay","silty","peaty","saline","laterite"
    ]
    season:     Literal[
        "long_rains","short_rains","dry","transitional"
    ]
    region:     Literal[
        "coastal","highland","semi_arid","sub_humid","arid"
    ]
    irrigation: Literal[0, 1]

    # Optional settings
    language:   str = "en"    # "en" or "sw" (Swahili)
    top_k:      int = Field(5, ge=1, le=10)
    # Guest path: pull live weather and overwrite climate before ML
    use_live_weather: bool = False
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)

    class Config:
        json_schema_extra = {
            "example": {
                "nitrogen": 85, "phosphorus": 55, "potassium": 48,
                "ph": 6.2, "rainfall": 720, "temperature": 22,
                "humidity": 68, "soil_type": "loamy",
                "season": "long_rains", "region": "highland",
                "irrigation": 0, "language": "en",
                "use_live_weather": True,
            }
        }


# ─── Response schema ──────────────────────────────────────────────────────────

class CropResult(BaseModel):
    rank:             int
    crop:             str
    confidence:       float
    confidence_pct:   str
    confidence_label: str
    is_primary:       bool


class RecommendationResponse(BaseModel):
    success:              bool
    top_crop:             str
    recommendations:      list[CropResult]
    soil_fertility_score: float
    drought_risk:         str
    model_version:        str
    explanation:          str
    tips:                 list[str]
    climate_warning:      str
    weather:              Optional[dict] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/recommend", response_model=RecommendationResponse)
async def recommend_crops(request: RecommendationRequest):
    """
    Core endpoint — the heart of AgroSphere.

    Flow:
    1. FastAPI validates all inputs automatically
    2. Optional live weather enrichment of climate fields
    3. ML model runs inference (~5ms)
    4. Gemini generates farmer explanation (~1-2s)
    5. Combined result returned to frontend
    """
    farm_data = request.model_dump(
        exclude={"language", "top_k", "use_live_weather", "latitude", "longitude"}
    )
    weather_meta = None
    snapshot = None

    if request.use_live_weather:
        try:
            from services.weather_enrichment import (
                apply_weather_to_farm_data,
                escalate_drought_risk,
                fetch_and_optionally_store,
                merge_climate_warning,
            )

            snapshot, _ = await fetch_and_optionally_store(
                None,
                latitude=request.latitude,
                longitude=request.longitude,
                region=request.region,
            )
            farm_data = apply_weather_to_farm_data(
                farm_data, snapshot, overwrite_climate=True
            )
            weather_meta = farm_data.get("_weather")
        except Exception as e:
            weather_meta = {"error": str(e), "overwrite_climate": False}

    ml_input = {k: v for k, v in farm_data.items() if not k.startswith("_")}

    try:
        ml_result = predict(ml_input, top_k=request.top_k)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    drought_risk = ml_result.drought_risk
    if snapshot is not None and weather_meta and "features" in weather_meta:
        drought_risk = escalate_drought_risk(
            drought_risk, weather_meta["features"]
        )

    ai_result = await explain_recommendation(
        top_crop        = ml_result.top_crop,
        recommendations = [r.model_dump() for r in ml_result.recommendations],
        soil_fertility  = ml_result.soil_fertility_score,
        drought_risk    = drought_risk,
        farm_context    = ml_input,
        language        = request.language,
    )

    climate_warning = ai_result.get("climate_warning", "")
    if snapshot is not None:
        from services.weather_enrichment import merge_climate_warning
        climate_warning = merge_climate_warning(climate_warning, snapshot)

    return RecommendationResponse(
        success              = True,
        top_crop             = ml_result.top_crop,
        recommendations      = [
            CropResult(**r.model_dump())
            for r in ml_result.recommendations
        ],
        soil_fertility_score = ml_result.soil_fertility_score,
        drought_risk         = drought_risk,
        model_version        = ml_result.model_version,
        explanation          = ai_result.get("explanation", ""),
        tips                 = ai_result.get("tips", []),
        climate_warning      = climate_warning,
        weather              = weather_meta,
    )


@router.get("/classes")
def get_classes():
    """Returns all 35 crop names the model supports."""
    crops = get_crop_classes()
    return {"crops": crops, "count": len(crops)}