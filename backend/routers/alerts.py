"""Farm alerts API — rule + weather driven."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from core.deps import CurrentUser, SessionDep
from services.alerts_service import build_farm_alerts

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertItem(BaseModel):
    level: str
    kind: str
    message: str
    source: str


class AlertsResponse(BaseModel):
    farm_id: Optional[str]
    farm_name: Optional[str] = None
    region: Optional[str] = None
    generated_at: str
    weather_ok: bool = False
    season: Optional[str] = None
    features: dict[str, Any] = {}
    alerts: list[AlertItem]
    summary: dict[str, int]


@router.get("", response_model=AlertsResponse)
async def list_alerts(
    user: CurrentUser,
    session: SessionDep,
    farm_id: Optional[UUID] = None,
) -> AlertsResponse:
    data = await build_farm_alerts(session, user, farm_id)
    return AlertsResponse(
        farm_id=data.get("farm_id"),
        farm_name=data.get("farm_name"),
        region=data.get("region"),
        generated_at=data["generated_at"],
        weather_ok=bool(data.get("weather_ok")),
        season=data.get("season") if isinstance(data.get("season"), str) else None,
        features=data.get("features") or {},
        alerts=[AlertItem(**a) for a in data["alerts"]],
        summary=data["summary"],
    )
