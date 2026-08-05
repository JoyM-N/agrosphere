"""
AgroSphere Backend Configuration
=================================
Reads environment variables once and exposes a typed config object.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # Paths
    ML_ARTIFACTS_PATH: Path = Path(
        os.getenv("ML_ARTIFACTS_PATH", "../ml/artifacts")
    )
    ML_SOURCE_PATH: Path = Path(
        os.getenv("ML_SOURCE_PATH", "../ml")
    )

    # App
    APP_NAME: str = os.getenv("APP_NAME", "AgroSphere")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "True") == "True"

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://agrosphere:agrosphere@localhost:5433/agrosphere",
    )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-access-secret-change-me")
    JWT_REFRESH_SECRET: str = os.getenv(
        "JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"
    )
    JWT_ACCESS_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "15")
    )
    JWT_REFRESH_EXPIRE_DAYS: int = int(
        os.getenv("JWT_REFRESH_EXPIRE_DAYS", "14")
    )
    JWT_ALGORITHM: str = "HS256"
    REFRESH_COOKIE_NAME: str = "agrosphere_refresh"

    def validate(self) -> None:
        """Call at startup to catch missing config early."""
        errors: list[str] = []
        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is not set in .env")
        if not self.ML_ARTIFACTS_PATH.exists():
            errors.append(
                f"ML_ARTIFACTS_PATH not found: {self.ML_ARTIFACTS_PATH}"
            )
        if self.JWT_SECRET.startswith("dev-") or self.JWT_SECRET == (
            "change-me-access-secret-use-long-random-string"
        ):
            errors.append(
                "JWT_SECRET is using a weak/default value — set a strong secret"
            )
        if errors:
            for e in errors:
                print(f"  ⚠  Config warning: {e}")


config = Config()
