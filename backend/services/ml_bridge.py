

import sys
import importlib.util
from pathlib import Path

# Resolve paths relative to this file's location
# This file is at: backend/services/ml_bridge.py
# ML root is at:   ml/
ML_ROOT         = Path(__file__).resolve().parent.parent.parent / "ml"
ML_SERVICE_FILE = ML_ROOT / "services" / "ml_service.py"

if not ML_ROOT.exists():
    raise FileNotFoundError(
        f"ML folder not found at: {ML_ROOT}\n"
        f"Expected structure:\n"
        f"  agrosphere/\n"
        f"    ml/\n"
        f"    backend/  ← you are here"
    )

if not ML_SERVICE_FILE.exists():
    raise FileNotFoundError(
        f"ml_service.py not found at: {ML_SERVICE_FILE}"
    )

# Add ml/ root to path so ml_service can import training.features
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

# Load ml_service.py directly — avoids naming conflicts
# between backend/services/ and ml/services/
_spec = importlib.util.spec_from_file_location(
    "agrosphere_ml_service",
    ML_SERVICE_FILE,
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules["agrosphere_ml_service"] = _mod
_spec.loader.exec_module(_mod)

# Extract what routers need
ml_service       = _mod.ml_service
PredictionResult = _mod.PredictionResult


def load_model() -> None:
    ml_service.load()

def predict(input_data: dict, top_k: int = 5):
    return ml_service.predict(input_data, top_k=top_k)

def get_crop_classes() -> list:
    return ml_service.crop_classes

def get_model_version() -> str:
    return ml_service.version