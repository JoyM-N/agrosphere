"""Weather endpoints — Open-Meteo forecasts, persistence, farm weather."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import select

from core.deps import CurrentUser, SessionDep, require_farm_owner
from db.models import WeatherSnapshotRecord
from services.weather_enrichment import (
    derive_influence_features,
    fetch_and_optionally_store,
    get_or_fetch_farm_weather,
)
from services.weather_service import WeatherSnapshot

router = APIRouter(prefix="/api/weather", tags=["weather"])


class WeatherSnapshotOut(WeatherSnapshot):
    id: Optional[UUID] = None
    cached: bool = False
    features: dict[str, Any] = Field(default_factory=dict)


@router.get("/forecast", response_model=WeatherSnapshotOut)
async def get_forecast(
    latitude: Optional[float] = Query(default=None, ge=-90, le=90),
    longitude: Optional[float] = Query(default=None, ge=-180, le=180),
    region: Optional[str] = Query(default=None),
) -> WeatherSnapshotOut:
    """
    Public forecast endpoint (not persisted — no farm context).
    Pass lat/lon, or a region name to use AgroSphere defaults.
    """
    if (latitude is None) ^ (longitude is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide both latitude and longitude, or neither (use region)",
        )

    try:
        snapshot, _ = await fetch_and_optionally_store(
            None,
            latitude=latitude,
            longitude=longitude,
            region=region,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather provider unavailable: {e}",
        ) from e

    return WeatherSnapshotOut(
        **snapshot.model_dump(),
        features=derive_influence_features(snapshot),
        cached=False,
    )


@router.get("/farms/{farm_id}", response_model=WeatherSnapshotOut)
async def get_farm_weather(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
    refresh: bool = Query(default=False),
) -> WeatherSnapshotOut:
    """Authenticated weather for a farm — cached ~1h, then refreshed & stored."""
    farm = require_farm_owner(session, user, farm_id)
    try:
        snapshot, record = await get_or_fetch_farm_weather(
            session,
            farm_id=farm.id,
            user_id=user.id,
            latitude=farm.latitude,
            longitude=farm.longitude,
            region=farm.region,
            force_refresh=refresh,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather provider unavailable: {e}",
        ) from e

    cached = not refresh and record.fetched_at is not None
    # If we just fetched, cached=False; if reused from DB without force, True
    # get_or_fetch doesn't tell us — approximate via features match
    return WeatherSnapshotOut(
        **snapshot.model_dump(),
        id=record.id,
        features=record.features or derive_influence_features(snapshot),
        cached=cached,
    )


@router.get("/farms/{farm_id}/history")
def list_farm_weather_history(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Recent stored forecasts for a farm."""
    require_farm_owner(session, user, farm_id)
    rows = session.exec(
        select(WeatherSnapshotRecord)
        .where(WeatherSnapshotRecord.farm_id == farm_id)
        .order_by(WeatherSnapshotRecord.fetched_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": r.id,
            "fetched_at": r.fetched_at,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "source": r.source,
            "features": r.features,
            "alerts": (r.payload or {}).get("alerts", []),
        }
        for r in rows
    ]
