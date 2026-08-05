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

from training.features import engineer_features, validate_input, NUMERICAL_FEATURES, CATEGORICAL_FEATURES
validated = validate_input(dict(raw_input))
df = pd.DataFrame([validated])
df = engineer_features(df)
feature_cols = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
X = df[feature_cols]

preprocessor = ml_service._pipeline.named_steps["preprocessor"]
ensemble = ml_service._pipeline.named_steps["ensemble"]

X_trans = preprocessor.transform(X)

# Try getting base probabilities
probs = []
for name, est in ensemble.named_estimators_.items():
    probs.append(est.predict_proba(X_trans)[0])
raw_probs = np.mean(probs, axis=0)

# Apply temperature scaling
for T in [1.5, 2.0, 3.0, 4.0]:
    print(f"\n--- TEMPERATURE SCALING T={T} ---")
    # Soften using temperature scaling: prob = prob^(1/T) / sum(prob^(1/T))
    scaled_probs = np.power(raw_probs, 1 / T)
    scaled_probs = scaled_probs / np.sum(scaled_probs)
    
    top_indices = scaled_probs.argsort()[::-1][:5]
    for rank, idx in enumerate(top_indices):
        score = float(scaled_probs[idx])
        crop = ml_service._label_encoder.classes_[idx]
        print(f"#{rank+1} {crop}: {score*100:.1f}%")
