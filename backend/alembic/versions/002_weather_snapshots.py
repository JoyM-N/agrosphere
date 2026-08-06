"""Add weather_snapshots and link recommendations to forecasts.

Revision ID: 002_weather_snapshots
Revises: 001_initial_schema
Create Date: 2026-08-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_weather_snapshots"
down_revision: Union[str, Sequence[str], None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weather_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column(
            "payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "features", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_weather_snapshots_farm_id"),
        "weather_snapshots",
        ["farm_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_weather_snapshots_user_id"),
        "weather_snapshots",
        ["user_id"],
        unique=False,
    )

    op.add_column(
        "recommendations",
        sa.Column("weather_snapshot_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_recommendations_weather_snapshot_id"),
        "recommendations",
        ["weather_snapshot_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_recommendations_weather_snapshot_id",
        "recommendations",
        "weather_snapshots",
        ["weather_snapshot_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_recommendations_weather_snapshot_id",
        "recommendations",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_recommendations_weather_snapshot_id"),
        table_name="recommendations",
    )
    op.drop_column("recommendations", "weather_snapshot_id")
    op.drop_index(
        op.f("ix_weather_snapshots_user_id"), table_name="weather_snapshots"
    )
    op.drop_index(
        op.f("ix_weather_snapshots_farm_id"), table_name="weather_snapshots"
    )
    op.drop_table("weather_snapshots")
