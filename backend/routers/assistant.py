"""Assistant chat API — Gemini grounded on farm/weather/recommendation context."""

from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, Field

from core.deps import CurrentUser, SessionDep
from services.assistant_service import chat_with_context
from services.farm_context import build_farm_context

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    farm_id: Optional[UUID] = None
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    language: str = "en"


class ChatResponse(BaseModel):
    reply: str
    source: str
    farm_id: Optional[str] = None
    context_used: bool
    has_recommendation: bool
    has_weather: bool
    has_confirmed_location: bool = False


@router.post("/chat", response_model=ChatResponse)
async def assistant_chat(
    body: ChatRequest,
    user: CurrentUser,
    session: SessionDep,
) -> ChatResponse:
    pack = await build_farm_context(session, user, body.farm_id)
    history = [m.model_dump() for m in body.history]

    # Optional language nudge prepended for Swahili
    message = body.message.strip()
    if body.language == "sw":
        message = f"(Please reply in Swahili.)\n{message}"

    result = await chat_with_context(
        message=message,
        context_text=pack["context_text"],
        history=history,
        has_farm=pack.get("farm") is not None,
    )

    weather = pack.get("weather")
    has_weather = bool(weather) and "error" not in (weather or {})
    farm = pack.get("farm") or {}
    lat, lon = farm.get("latitude"), farm.get("longitude")
    has_confirmed_location = lat is not None and lon is not None

    return ChatResponse(
        reply=result["reply"],
        source=result["source"],
        farm_id=farm.get("id") if farm else None,
        context_used=pack.get("farm") is not None,
        has_recommendation=pack.get("recommendation") is not None,
        has_weather=has_weather,
        has_confirmed_location=has_confirmed_location,
    )


@router.get("/context")
async def assistant_context(
    user: CurrentUser,
    session: SessionDep,
    farm_id: Optional[UUID] = None,
) -> dict:
    """UI: what context the assistant will use."""
    pack = await build_farm_context(session, user, farm_id)
    farm = pack.get("farm") or {}
    weather = pack.get("weather")
    has_weather = bool(weather) and "error" not in (weather or {})
    return {
        "farm": pack.get("farm"),
        "soil": pack.get("soil"),
        "recommendation": pack.get("recommendation"),
        "weather": pack.get("weather"),
        "has_recommendation": pack.get("recommendation") is not None,
        "has_weather": has_weather,
        "has_confirmed_location": (
            farm.get("latitude") is not None and farm.get("longitude") is not None
        ),
        "context_preview": (pack.get("context_text") or "")[:1200],
    }
