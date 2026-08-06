"""Initial AgroSphere schema: users, farms, soil_profiles, recommendations.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

userrole = postgresql.ENUM("farmer", "admin", name="userrole", create_type=False)


def upgrade() -> None:
    userrole.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "farmer", "admin", name="userrole", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(
        op.f("ix_users_username"), "users", ["username"], unique=True
    )

    op.create_table(
        "farms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("region", sa.String(length=40), nullable=False),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("county", sa.String(length=80), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_farms_user_id"), "farms", ["user_id"], unique=False)

    op.create_table(
        "soil_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("nitrogen", sa.Float(), nullable=False),
        sa.Column("phosphorus", sa.Float(), nullable=False),
        sa.Column("potassium", sa.Float(), nullable=False),
        sa.Column("ph", sa.Float(), nullable=False),
        sa.Column("soil_type", sa.String(length=40), nullable=False),
        sa.Column("rainfall", sa.Float(), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False),
        sa.Column("humidity", sa.Float(), nullable=False),
        sa.Column("season", sa.String(length=40), nullable=False),
        sa.Column("irrigation", sa.Integer(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_soil_profiles_farm_id"),
        "soil_profiles",
        ["farm_id"],
        unique=False,
    )

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "input_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("top_crop", sa.String(length=80), nullable=False),
        sa.Column(
            "results", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("soil_fertility_score", sa.Float(), nullable=False),
        sa.Column("drought_risk", sa.String(length=20), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column(
            "tips", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("climate_warning", sa.Text(), nullable=False),
        sa.Column("model_version", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recommendations_farm_id"),
        "recommendations",
        ["farm_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recommendations_user_id"),
        "recommendations",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_recommendations_user_id"), table_name="recommendations"
    )
    op.drop_index(
        op.f("ix_recommendations_farm_id"), table_name="recommendations"
    )
    op.drop_table("recommendations")
    op.drop_index(op.f("ix_soil_profiles_farm_id"), table_name="soil_profiles")
    op.drop_table("soil_profiles")
    op.drop_index(op.f("ix_farms_user_id"), table_name="farms")
    op.drop_table("farms")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    userrole.drop(op.get_bind(), checkfirst=True)
