"""Database engine, sessions, and Alembic migration runner."""

from collections.abc import Generator
from pathlib import Path

from sqlmodel import Session, create_engine

from core.config import config

engine = create_engine(
    config.DATABASE_URL,
    echo=config.DEBUG,
    pool_pre_ping=True,
)


def run_migrations() -> None:
    """Apply pending Alembic migrations up to head."""
    from alembic import command
    from alembic.config import Config

    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("sqlalchemy.url", config.DATABASE_URL)
    command.upgrade(alembic_cfg, "head")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
