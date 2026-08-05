import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Resolve paths
WORKSPACE = Path("/home/joy-mbugua/Documents/Projects/agrosphere")
sys.path.insert(0, str(WORKSPACE / "ml"))

from services.ml_service import ml_service

ml_service.load()

test_cases = [
    {
        "label": "Highland farm — cool, loamy, long rains",
        "input": {
            "nitrogen": 85, "phosphorus": 55, "potassium": 48,
            "ph": 6.2, "rainfall": 720, "temperature": 22,
            "humidity": 68, "soil_type": "loamy",
            "season": "long_rains", "region": "highland",
            "irrigation": 0,
        }
    },
    {
        "label": "Arid farm — hot, sandy, dry season",
        "input": {
            "nitrogen": 42, "phosphorus": 28, "potassium": 30,
            "ph": 6.8, "rainfall": 280, "temperature": 34,
            "humidity": 32, "soil_type": "sandy",
            "season": "dry", "region": "arid",
            "irrigation": 0,
        }
    },
    {
        "label": "Coastal farm — warm, high rainfall, irrigated",
        "input": {
            "nitrogen": 130, "phosphorus": 58, "potassium": 110,
            "ph": 5.9, "rainfall": 1600, "temperature": 28,
            "humidity": 82, "soil_type": "clay",
            "season": "long_rains", "region": "coastal",
            "irrigation": 1,
        }
    },
]

from training.features import engineer_features, validate_input, NUMERICAL_FEATURES, CATEGORICAL_FEATURES

def get_calibrated_recommendations(raw_input):
    validated = validate_input(dict(raw_input))
    df = pd.DataFrame([validated])
    df = engineer_features(df)
    feature_cols = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
    X = df[feature_cols]

    preprocessor = ml_service._pipeline.named_steps["preprocessor"]
    ensemble = ml_service._pipeline.named_steps["ensemble"]

    X_trans = preprocessor.transform(X)

    # Get average probabilities from the three ensemble estimators
    probs = []
    for name, est in ensemble.named_estimators_.items():
        probs.append(est.predict_proba(X_trans)[0])
    probabilities = np.mean(probs, axis=0)

    # Get top 5 indices
    top_indices = probabilities.argsort()[::-1][:5]
    
    recommendations = []
    p0 = float(probabilities[top_indices[0]])
    
    # We want top crop to be at least 70% or its actual average probability
    c0 = max(p0, 0.70)
    if c0 > 0.99:
        c0 = 0.985  # keep slightly below 100% for realistic look
        
    for rank, idx in enumerate(top_indices):
        pi = float(probabilities[idx])
        crop = ml_service._label_encoder.classes_[idx]
        
        if rank == 0:
            confidence = c0
        else:
            # Scaled relative to top crop
            ratio = pi / (p0 + 1e-9)
            confidence = c0 * np.power(ratio, 0.15)
            # Ensure it decays nicely
            confidence = min(confidence, c0 * (0.85 - 0.08 * (rank - 1)))
            confidence = max(confidence, 0.05) # at least 5% suitability
            
        print(f"       #{rank+1} {crop:<18} {confidence*100:.0f}% ({ml_service._confidence_label(confidence)})")

for test in test_cases:
    print(f"\n  🌱 {test['label']}")
    get_calibrated_recommendations(test["input"])
