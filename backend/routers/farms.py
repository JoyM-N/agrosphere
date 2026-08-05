"""Farm + soil + persisted recommendation endpoints."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from core.deps import CurrentUser, SessionDep, require_farm_owner
from db.models import Farm, Recommendation, SoilProfile
from services.gemini_service import explain_recommendation
from services.ml_bridge import predict

router = APIRouter(prefix="/api/farms", tags=["farms"])


class FarmCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    region: Literal[
        "coastal", "highland", "semi_arid", "sub_humid", "arid"
    ]
    country: Optional[str] = Field(default=None, max_length=80)
    county: Optional[str] = Field(default=None, max_length=80)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    region: Optional[
        Literal["coastal", "highland", "semi_arid", "sub_humid", "arid"]
    ] = None
    country: Optional[str] = Field(default=None, max_length=80)
    county: Optional[str] = Field(default=None, max_length=80)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class FarmOut(BaseModel):
    id: UUID
    name: str
    region: str
    country: Optional[str]
    county: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: datetime


class SoilUpsert(BaseModel):
    nitrogen: float = Field(..., ge=0, le=200)
    phosphorus: float = Field(..., ge=0, le=200)
    potassium: float = Field(..., ge=0, le=200)
    ph: float = Field(..., ge=3.0, le=10.0)
    rainfall: float = Field(..., ge=0, le=3000)
    temperature: float = Field(..., ge=5, le=50)
    humidity: float = Field(..., ge=10, le=100)
    soil_type: Literal[
        "loamy", "sandy", "clay", "silty", "peaty", "saline", "laterite"
    ]
    season: Literal[
        "long_rains", "short_rains", "dry", "transitional"
    ]
    irrigation: Literal[0, 1]


class SoilOut(BaseModel):
    id: UUID
    farm_id: UUID
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    rainfall: float
    temperature: float
    humidity: float
    soil_type: str
    season: str
    irrigation: int
    recorded_at: datetime


class FarmRecommendRequest(BaseModel):
    """Optional override; if omitted, latest soil profile is used."""

    nitrogen: Optional[float] = Field(default=None, ge=0, le=200)
    phosphorus: Optional[float] = Field(default=None, ge=0, le=200)
    potassium: Optional[float] = Field(default=None, ge=0, le=200)
    ph: Optional[float] = Field(default=None, ge=3.0, le=10.0)
    rainfall: Optional[float] = Field(default=None, ge=0, le=3000)
    temperature: Optional[float] = Field(default=None, ge=5, le=50)
    humidity: Optional[float] = Field(default=None, ge=10, le=100)
    soil_type: Optional[
        Literal[
            "loamy", "sandy", "clay", "silty", "peaty", "saline", "laterite"
        ]
    ] = None
    season: Optional[
        Literal["long_rains", "short_rains", "dry", "transitional"]
    ] = None
    irrigation: Optional[Literal[0, 1]] = None
    language: str = "en"
    top_k: int = Field(5, ge=1, le=10)


class RecommendationOut(BaseModel):
    id: UUID
    farm_id: UUID
    top_crop: str
    results: list[Any]
    soil_fertility_score: float
    drought_risk: str
    explanation: str
    tips: list[Any]
    climate_warning: str
    model_version: str
    input_snapshot: dict[str, Any]
    created_at: datetime


def _farm_out(farm: Farm) -> FarmOut:
    return FarmOut(
        id=farm.id,
        name=farm.name,
        region=farm.region,
        country=farm.country,
        county=farm.county,
        latitude=farm.latitude,
        longitude=farm.longitude,
        created_at=farm.created_at,
    )


@router.get("", response_model=list[FarmOut])
def list_farms(user: CurrentUser, session: SessionDep) -> list[FarmOut]:
    farms = session.exec(
        select(Farm).where(Farm.user_id == user.id).order_by(Farm.created_at)
    ).all()
    return [_farm_out(f) for f in farms]


@router.post("", response_model=FarmOut, status_code=status.HTTP_201_CREATED)
def create_farm(
    body: FarmCreate,
    user: CurrentUser,
    session: SessionDep,
) -> FarmOut:
    farm = Farm(
        user_id=user.id,
        name=body.name.strip(),
        region=body.region,
        country=body.country,
        county=body.county,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    session.add(farm)
    session.commit()
    session.refresh(farm)
    return _farm_out(farm)


@router.get("/{farm_id}", response_model=FarmOut)
def get_farm(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> FarmOut:
    farm = require_farm_owner(session, user, farm_id)
    return _farm_out(farm)


@router.patch("/{farm_id}", response_model=FarmOut)
def update_farm(
    farm_id: UUID,
    body: FarmUpdate,
    user: CurrentUser,
    session: SessionDep,
) -> FarmOut:
    farm = require_farm_owner(session, user, farm_id)
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    for key, value in data.items():
        setattr(farm, key, value)
    session.add(farm)
    session.commit()
    session.refresh(farm)
    return _farm_out(farm)


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> None:
    farm = require_farm_owner(session, user, farm_id)
    session.delete(farm)
    session.commit()


@router.put("/{farm_id}/soil", response_model=SoilOut)
def upsert_soil(
    farm_id: UUID,
    body: SoilUpsert,
    user: CurrentUser,
    session: SessionDep,
) -> SoilOut:
    require_farm_owner(session, user, farm_id)
    profile = SoilProfile(farm_id=farm_id, **body.model_dump())
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return SoilOut(
        id=profile.id,
        farm_id=profile.farm_id,
        nitrogen=profile.nitrogen,
        phosphorus=profile.phosphorus,
        potassium=profile.potassium,
        ph=profile.ph,
        rainfall=profile.rainfall,
        temperature=profile.temperature,
        humidity=profile.humidity,
        soil_type=profile.soil_type,
        season=profile.season,
        irrigation=profile.irrigation,
        recorded_at=profile.recorded_at,
    )


@router.get("/{farm_id}/soil", response_model=SoilOut)
def get_latest_soil(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> SoilOut:
    require_farm_owner(session, user, farm_id)
    profile = session.exec(
        select(SoilProfile)
        .where(SoilProfile.farm_id == farm_id)
        .order_by(SoilProfile.recorded_at.desc())
    ).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No soil profile for this farm",
        )
    return SoilOut(
        id=profile.id,
        farm_id=profile.farm_id,
        nitrogen=profile.nitrogen,
        phosphorus=profile.phosphorus,
        potassium=profile.potassium,
        ph=profile.ph,
        rainfall=profile.rainfall,
        temperature=profile.temperature,
        humidity=profile.humidity,
        soil_type=profile.soil_type,
        season=profile.season,
        irrigation=profile.irrigation,
        recorded_at=profile.recorded_at,
    )


@router.get("/{farm_id}/recommendations", response_model=list[RecommendationOut])
def list_recommendations(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> list[RecommendationOut]:
    require_farm_owner(session, user, farm_id)
    rows = session.exec(
        select(Recommendation)
        .where(Recommendation.farm_id == farm_id)
        .order_by(Recommendation.created_at.desc())
    ).all()
    return [
        RecommendationOut(
            id=r.id,
            farm_id=r.farm_id,
            top_crop=r.top_crop,
            results=r.results,
            soil_fertility_score=r.soil_fertility_score,
            drought_risk=r.drought_risk,
            explanation=r.explanation,
            tips=r.tips,
            climate_warning=r.climate_warning,
            model_version=r.model_version,
            input_snapshot=r.input_snapshot,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post(
    "/{farm_id}/recommend",
    response_model=RecommendationOut,
    status_code=status.HTTP_201_CREATED,
)
async def recommend_for_farm(
    farm_id: UUID,
    body: FarmRecommendRequest,
    user: CurrentUser,
    session: SessionDep,
) -> RecommendationOut:
    farm = require_farm_owner(session, user, farm_id)

    latest = session.exec(
        select(SoilProfile)
        .where(SoilProfile.farm_id == farm_id)
        .order_by(SoilProfile.recorded_at.desc())
    ).first()

    overrides = body.model_dump(
        exclude={"language", "top_k"}, exclude_none=True
    )

    if latest is None and not overrides:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Save a soil profile first, or send soil/climate fields",
        )

    base: dict[str, Any] = {}
    if latest is not None:
        base = {
            "nitrogen": latest.nitrogen,
            "phosphorus": latest.phosphorus,
            "potassium": latest.potassium,
            "ph": latest.ph,
            "rainfall": latest.rainfall,
            "temperature": latest.temperature,
            "humidity": latest.humidity,
            "soil_type": latest.soil_type,
            "season": latest.season,
            "irrigation": latest.irrigation,
        }

    farm_data = {**base, **overrides, "region": farm.region}

    required = [
        "nitrogen",
        "phosphorus",
        "potassium",
        "ph",
        "rainfall",
        "temperature",
        "humidity",
        "soil_type",
        "season",
        "irrigation",
        "region",
    ]
    missing = [k for k in required if k not in farm_data]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing fields: {', '.join(missing)}",
        )

    try:
        ml_result = predict(farm_data, top_k=body.top_k)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    recommendations = [r.model_dump() for r in ml_result.recommendations]
    explanation = await explain_recommendation(
        top_crop=ml_result.top_crop,
        recommendations=recommendations,
        soil_fertility=ml_result.soil_fertility_score,
        drought_risk=ml_result.drought_risk,
        farm_context=farm_data,
        language=body.language,
    )

    row = Recommendation(
        farm_id=farm.id,
        user_id=user.id,
        input_snapshot=farm_data,
        top_crop=ml_result.top_crop,
        results=recommendations,
        soil_fertility_score=ml_result.soil_fertility_score,
        drought_risk=ml_result.drought_risk,
        explanation=explanation["explanation"],
        tips=explanation["tips"],
        climate_warning=explanation["climate_warning"],
        model_version=ml_result.model_version,
    )
    session.add(row)
    session.commit()
    session.refresh(row)

    return RecommendationOut(
        id=row.id,
        farm_id=row.farm_id,
        top_crop=row.top_crop,
        results=row.results,
        soil_fertility_score=row.soil_fertility_score,
        drought_risk=row.drought_risk,
        explanation=row.explanation,
        tips=row.tips,
        climate_warning=row.climate_warning,
        model_version=row.model_version,
        input_snapshot=row.input_snapshot,
        created_at=row.created_at,
    )
