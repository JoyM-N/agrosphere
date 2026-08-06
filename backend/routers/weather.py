"""Weather endpoints — Open-Meteo backed forecasts + farm weather."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from core.deps import CurrentUser, SessionDep, require_farm_owner
from services.weather_service import (
    WeatherSnapshot,
    fetch_weather,
    resolve_coordinates,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])


class WeatherQuery(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    region: Optional[str] = None


@router.get("/forecast", response_model=WeatherSnapshot)
async def get_forecast(
    latitude: Optional[float] = Query(default=None, ge=-90, le=90),
    longitude: Optional[float] = Query(default=None, ge=-180, le=180),
    region: Optional[str] = Query(default=None),
) -> WeatherSnapshot:
    """
    Public forecast endpoint.
    Pass lat/lon, or a region name to use AgroSphere defaults.
    """
    if (latitude is None) ^ (longitude is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide both latitude and longitude, or neither (use region)",
        )

    lat, lon = resolve_coordinates(
        latitude=latitude,
        longitude=longitude,
        region=region,
    )
    try:
        return await fetch_weather(lat, lon)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather provider unavailable: {e}",
        ) from e


@router.get("/farms/{farm_id}", response_model=WeatherSnapshot)
async def get_farm_weather(
    farm_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> WeatherSnapshot:
    """Authenticated weather for a specific farm (uses saved coords or region)."""
    farm = require_farm_owner(session, user, farm_id)
    lat, lon = resolve_coordinates(
        latitude=farm.latitude,
        longitude=farm.longitude,
        region=farm.region,
    )
    try:
        return await fetch_weather(lat, lon)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather provider unavailable: {e}",
        ) from e
