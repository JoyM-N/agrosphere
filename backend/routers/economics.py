"""Economics & sustainability API."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from core.deps import CurrentUser, SessionDep
from data.crop_economics import CROP_ECONOMICS, DISCLAIMER, REGION_FACTORS
from services.economics_service import build_economics_report, estimate_crop_economics

router = APIRouter(prefix="/api/economics", tags=["economics"])


class EconomicsResponse(BaseModel):
    farm_id: Optional[str] = None
    farm_name: Optional[str] = None
    region: Optional[str] = None
    currency: str = "KES"
    source: str
    disclaimer: str
    generated_at: str
    focus: Optional[dict[str, Any]] = None
    alternatives: list[dict[str, Any]] = Field(default_factory=list)
    sustainability: dict[str, Any]
    price_table: list[dict[str, Any]] = Field(default_factory=list)
    has_recommendation: bool = False
    weather_features: dict[str, Any] = Field(default_factory=dict)
    message: Optional[str] = None


@router.get("", response_model=EconomicsResponse)
async def get_economics(
    user: CurrentUser,
    session: SessionDep,
    farm_id: Optional[UUID] = None,
    crop: Optional[str] = Query(default=None, description="Override focus crop"),
) -> EconomicsResponse:
    data = await build_economics_report(session, user, farm_id, crop)
    return EconomicsResponse(**data)


@router.get("/catalog")
def economics_catalog(
    region: str = Query(default="highland"),
) -> dict[str, Any]:
    """Browse curated price/cost rows for a region (no auth required for transparency)."""
    rows = []
    for key in sorted(CROP_ECONOMICS.keys()):
        est = estimate_crop_economics(key, region)
        if est:
            rows.append(est)
    return {
        "region": region,
        "currency": "KES",
        "source": "curated_region_static_v1",
        "disclaimer": DISCLAIMER,
        "region_factors": REGION_FACTORS.get(region, REGION_FACTORS["highland"]),
        "crops": rows,
    }
