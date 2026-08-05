import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Resolve paths
WORKSPACE = Path("/home/joy-mbugua/Documents/Projects/agrosphere")
sys.path.insert(0, str(WORKSPACE / "ml"))

from services.ml_service import ml_service

ml_service.load()

# Test case: Highland farm
raw_input = {
    "nitrogen": 85, "phosphorus": 55, "potassium": 48,
    "ph": 6.2, "rainfall": 720, "temperature": 22,
    "humidity": 68, "soil_type": "loamy",
    "season": "long_rains", "region": "highland",
    "irrigation": 0,
}

# 1. Standard prediction
res_std = ml_service.predict(raw_input)
print("\n--- STANDARD PREDICTION ---")
for r in res_std.recommendations:
    print(f"#{r.rank} {r.crop}: {r.confidence_pct} ({r.confidence_label})")

# 2. Averaged prediction
from training.features import engineer_features, validate_input, NUMERICAL_FEATURES, CATEGORICAL_FEATURES
validated = validate_input(dict(raw_input))
df = pd.DataFrame([validated])
df = engineer_features(df)
feature_cols = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
X = df[feature_cols]

preprocessor = ml_service._pipeline.named_steps["preprocessor"]
ensemble = ml_service._pipeline.named_steps["ensemble"]

X_trans = preprocessor.transform(X)

probs = []
for name, est in ensemble.named_estimators_.items():
    probs.append(est.predict_proba(X_trans)[0])
probabilities = np.mean(probs, axis=0)

top_indices = probabilities.argsort()[::-1][:5]
print("\n--- AVERAGED BASE MODELS PREDICTION ---")
for rank, idx in enumerate(top_indices):
    score = float(probabilities[idx])
    crop = ml_service._label_encoder.classes_[idx]
    print(f"#{rank+1} {crop}: {score*100:.1f}%")
