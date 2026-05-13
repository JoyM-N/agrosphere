"""
AgroSphere Backend Configuration
===================================
What this file does:
  Reads all environment variables from the .env file and
  makes them available as a typed config object.

  Every other file imports from here instead of reading
  environment variables directly. This means:
  - One place to change settings
  - Type safety on all config values
  - Clear error if a required variable is missing
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load the .env file
load_dotenv()


class Config:
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Paths
    ML_ARTIFACTS_PATH: Path = Path(
        os.getenv("ML_ARTIFACTS_PATH", "../ml/artifacts")
    )
    ML_SOURCE_PATH: Path = Path(
        os.getenv("ML_SOURCE_PATH", "../ml")
    )

    # App
    APP_NAME: str    = os.getenv("APP_NAME", "AgroSphere")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool      = os.getenv("DEBUG", "True") == "True"

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def validate(self):
        """Call this at startup to catch missing config early."""
        errors = []
        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is not set in .env")
        if not self.ML_ARTIFACTS_PATH.exists():
            errors.append(
                f"ML_ARTIFACTS_PATH not found: {self.ML_ARTIFACTS_PATH}"
            )
        if errors:
            for e in errors:
                print(f"  ⚠  Config warning: {e}")


# Single instance imported everywhere
config = Config()