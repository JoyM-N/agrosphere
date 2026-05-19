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

    class Config:
        json_schema_extra = {
            "example": {
                "nitrogen": 85, "phosphorus": 55, "potassium": 48,
                "ph": 6.2, "rainfall": 720, "temperature": 22,
                "humidity": 68, "soil_type": "loamy",
                "season": "long_rains", "region": "highland",
                "irrigation": 0, "language": "en"
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


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/recommend", response_model=RecommendationResponse)
async def recommend_crops(request: RecommendationRequest):
    """
    Core endpoint — the heart of AgroSphere.

    Flow:
    1. FastAPI validates all inputs automatically
    2. ML model runs inference (~5ms)
    3. Gemini generates farmer explanation (~1-2s)
    4. Combined result returned to frontend

    The ML result is fast. Gemini is the slow part.
    In a future optimisation, we can return the ML result
    immediately and stream the explanation separately.
    """
    # Build input dict for ML model
    farm_data = request.model_dump(exclude={"language", "top_k"})

    # Step 1 — ML prediction
    try:
        ml_result = predict(farm_data, top_k=request.top_k)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Step 2 — AI explanation
    ai_result = await explain_recommendation(
        top_crop        = ml_result.top_crop,
        recommendations = [r.model_dump() for r in ml_result.recommendations],
        soil_fertility  = ml_result.soil_fertility_score,
        drought_risk    = ml_result.drought_risk,
        farm_context    = farm_data,
        language        = request.language,
    )

    return RecommendationResponse(
        success              = True,
        top_crop             = ml_result.top_crop,
        recommendations      = [
            CropResult(**r.model_dump())
            for r in ml_result.recommendations
        ],
        soil_fertility_score = ml_result.soil_fertility_score,
        drought_risk         = ml_result.drought_risk,
        model_version        = ml_result.model_version,
        explanation          = ai_result.get("explanation", ""),
        tips                 = ai_result.get("tips", []),
        climate_warning      = ai_result.get("climate_warning", ""),
    )


@router.get("/classes")
def get_classes():
    """Returns all 35 crop names the model supports."""
    crops = get_crop_classes()
    return {"crops": crops, "count": len(crops)}