"""
AgroSphere FastAPI Application
================================
Entry point for the backend server.

Start the server with:
  uvicorn main:app --reload --port 8000

Then visit:
  http://localhost:8000/docs     ← interactive API documentation
  http://localhost:8000/health   ← confirm server is running
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from core.config import config
from routers.crops import router as crops_router
from services.ml_bridge import load_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once when the server starts.
    Loads the ML model into memory so it's ready for requests.
    """
    print(f"\n[ {config.APP_NAME} ] Starting up...")
    config.validate()
    load_model()
    print(f"[ {config.APP_NAME} ] Ready\n")
    yield
    # Shutdown
    print(f"[ {config.APP_NAME} ] Shutting down...")


app = FastAPI(
    title="AgroSphere Intelligence API",
    description=(
        "AI-powered agricultural decision support "
        "for smallholder farmers in Africa"
    ),
    version=config.APP_VERSION,
    lifespan=lifespan,
)

# Allow the Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        config.FRONTEND_URL,
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route groups
app.include_router(crops_router)


@app.get("/health")
def health():
    """Quick check that the server is running."""
    return {
        "status":       "ok",
        "app":          config.APP_NAME,
        "version":      config.APP_VERSION,
    }