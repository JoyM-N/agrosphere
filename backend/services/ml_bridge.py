"""
AgroSphere ML Bridge
======================
Uses importlib.util to load ml_service directly from its file.
This is the only reliable approach when two sibling folders
both contain a 'services' subfolder — it bypasses Python's
module name resolution entirely.
"""

import sys
import importlib.util
from pathlib import Path

# ── Absolute paths ────────────────────────────────────────────────────────────
ML_ROOT         = Path("C:/Users/HP/agrosphere/ml")
ML_SERVICE_FILE = ML_ROOT / "services" / "ml_service.py"

# ── ml/ root on sys.path so ml_service can import training.features ───────────
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

# ── Load ml_service.py directly from file ─────────────────────────────────────
_spec = importlib.util.spec_from_file_location(
    "agrosphere_ml_service",   # unique internal name, no conflicts
    ML_SERVICE_FILE,
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules["agrosphere_ml_service"] = _mod
_spec.loader.exec_module(_mod)

# ── Extract singleton and type ─────────────────────────────────────────────────
ml_service       = _mod.ml_service
PredictionResult = _mod.PredictionResult


# ── Public API called by all routers ──────────────────────────────────────────

def load_model() -> None:
    """Called once at FastAPI startup."""
    ml_service.load()

def predict(input_data: dict, top_k: int = 5):
    """Runs crop recommendation inference."""
    return ml_service.predict(input_data, top_k=top_k)

def get_crop_classes() -> list:
    """Returns all 35 supported crop names."""
    return ml_service.crop_classes

def get_model_version() -> str:
    return ml_service.version