"""SQLModel table definitions — Phase 1 spine."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    farmer = "farmer"
    admin = "admin"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=320)
    username: str = Field(index=True, unique=True, max_length=80)
    password_hash: str = Field(max_length=255)
    role: UserRole = Field(default=UserRole.farmer)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class Farm(SQLModel, table=True):
    __tablename__ = "farms"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=120)
    region: str = Field(max_length=40)
    country: Optional[str] = Field(default=None, max_length=80)
    county: Optional[str] = Field(default=None, max_length=80)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class SoilProfile(SQLModel, table=True):
    __tablename__ = "soil_profiles"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    farm_id: UUID = Field(foreign_key="farms.id", index=True)
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    soil_type: str = Field(max_length=40)
    rainfall: float
    temperature: float
    humidity: float
    season: str = Field(max_length=40)
    irrigation: int = Field(default=0, ge=0, le=1)
    recorded_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class Recommendation(SQLModel, table=True):
    __tablename__ = "recommendations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    farm_id: UUID = Field(foreign_key="farms.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    input_snapshot: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False),
    )
    top_crop: str = Field(max_length=80)
    results: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False),
    )
    soil_fertility_score: float
    drought_risk: str = Field(max_length=20)
    explanation: str = Field(default="", sa_column=Column(Text, nullable=False))
    tips: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False),
    )
    climate_warning: str = Field(
        default="", sa_column=Column(Text, nullable=False)
    )
    model_version: str = Field(max_length=40)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
