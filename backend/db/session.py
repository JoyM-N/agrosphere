"""Database engine and session helpers."""

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from core.config import config

engine = create_engine(
    config.DATABASE_URL,
    echo=config.DEBUG,
    pool_pre_ping=True,
)


def init_db() -> None:
    """Create tables if they do not exist (dev bootstrap).

    Alembic migrations should replace this for production schema changes.
    """
    # Import models so metadata is populated
    from db import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
