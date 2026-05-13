"""
AgroSphere Feature Engineering
================================
What this file does:
  Defines every feature transformation used by the model.
  Both the training pipeline AND the live inference service
  import from this single file.

Why this matters:
  The most common ML production bug is "training/serving skew" —
  where you transform data one way during training and a slightly
  different way when a real farmer submits their data. The model
  then sees inputs it has never seen before and performs badly.

  By keeping ALL transformations here, training and inference
  are guaranteed to be identical. Change it in one place,
  it changes everywhere.

What gets imported by other files:
  - NUMERICAL_FEATURES  : list of numeric column names
  - CATEGORICAL_FEATURES: list of categorical column names
  - TARGET_COL          : the column we are predicting ("crop")
  - engineer_features() : adds computed columns to any DataFrame
  - validate_input()    : checks a farmer's input for errors
"""

import numpy as np
import pandas as pd
from typing import List


# ─── Feature lists ────────────────────────────────────────────────────────────
# These lists define exactly which columns go into the model.
# The order matters — the preprocessor expects this exact order.

NUMERICAL_FEATURES: List[str] = [
    # Raw measurements the farmer provides
    "nitrogen",
    "phosphorus",
    "potassium",
    "ph",
    "rainfall",
    "temperature",
    "humidity",
    # Engineered features we compute below
    "npk_ratio",
    "drought_index",
    "soil_fertility_score",
    "temp_humidity_index",
    "rainfall_per_degree",
]

CATEGORICAL_FEATURES: List[str] = [
    "soil_type",
    "season",
    "region",
    "irrigation",   # 0 or 1, treated as category not number
]

# The column our model predicts
TARGET_COL: str = "crop"

# Every raw column a farmer must provide
ALL_RAW_FEATURES: List[str] = [
    "nitrogen",
    "phosphorus",
    "potassium",
    "ph",
    "rainfall",
    "temperature",
    "humidity",
    "soil_type",
    "season",
    "region",
    "irrigation",
]


# ─── Feature engineering ──────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds five computed columns to the DataFrame.

    Call this on BOTH training data and live farmer inputs.
    Never call it twice on the same DataFrame.

    Input:  DataFrame with ALL_RAW_FEATURES columns present
    Output: Same DataFrame with 5 new columns added
    """
    df = df.copy()

    # ── 1. NPK Ratio ──────────────────────────────────────────────────────────
    # Nitrogen divided by combined phosphorus + potassium.
    #
    # Why useful: Legumes (beans, lentils) fix their own nitrogen so they
    # show LOW ratios. Heavy feeders (maize, sugarcane) show HIGH ratios.
    # This single number captures a lot of crop-family information.
    #
    # The +1e-6 prevents division by zero if P and K are both 0.
    df["npk_ratio"] = df["nitrogen"] / (
        df["phosphorus"] + df["potassium"] + 1e-6
    )

    # ── 2. Drought Index ──────────────────────────────────────────────────────
    # Rainfall divided by temperature.
    #
    # Why useful: 300mm of rain at 18°C (cool highland) is very different
    # from 300mm at 36°C (hot semi-arid). High evaporation at high temps
    # means the effective moisture available to crops is much lower.
    # Low value = drought stress risk. High value = waterlogging risk.
    df["drought_index"] = df["rainfall"] / (
        df["temperature"] + 1e-6
    )

    # ── 3. Soil Fertility Score ───────────────────────────────────────────────
    # A single 0–1 score summarising overall soil health.
    #
    # Why useful: Instead of the model learning separately that
    # "high N AND high P AND high K AND pH near 6.5 = fertile",
    # we give it one pre-computed signal. This reduces the learning
    # burden and makes the model more reliable on small datasets.
    #
    # Weights reflect agronomic importance for African staple crops:
    #   Nitrogen   35% — primary growth driver
    #   Phosphorus 25% — root and flowering
    #   Potassium  20% — disease resistance
    #   pH         20% — nutrient availability gate
    #              (optimal ~6.5, drops off on both sides)
    n_score  = (df["nitrogen"].clip(0, 200) / 200)
    p_score  = (df["phosphorus"].clip(0, 200) / 200)
    k_score  = (df["potassium"].clip(0, 200) / 200)
    ph_score = np.maximum(0, 1 - np.abs(df["ph"] - 6.5) / 3.5)

    df["soil_fertility_score"] = (
        0.35 * n_score +
        0.25 * p_score +
        0.20 * k_score +
        0.20 * ph_score
    )

    # ── 4. Temperature-Humidity Index ─────────────────────────────────────────
    # Weighted combination of temperature and humidity.
    #
    # Why useful: High temperature + high humidity together create
    # fungal disease pressure (e.g. blight, rust, mildew). This index
    # captures that combined stress in one number. Crops like tea and
    # coffee thrive in cool-humid. Millet thrives in hot-dry.
    df["temp_humidity_index"] = (
        df["temperature"] * 0.6 +
        df["humidity"] * 0.4
    )

    # ── 5. Rainfall Per Degree ────────────────────────────────────────────────
    # How much rainfall per degree of temperature.
    #
    # Why useful: Distinguishes tropical highland (cool + adequate rain)
    # from tropical lowland (hot + same rain amount but higher loss).
    # Useful for separating tea/wheat/potato from rice/sugarcane/coconut.
    df["rainfall_per_degree"] = df["rainfall"] / (
        df["temperature"].clip(lower=1)
    )

    return df


# ─── Input validation ─────────────────────────────────────────────────────────

def validate_input(data: dict) -> dict:
    """
    Validates a raw farmer input dictionary before prediction.

    Checks:
    - All required fields are present
    - Numeric fields are within realistic agronomic ranges
    - Categorical fields contain only valid values

    Returns the cleaned input dict if valid.
    Raises ValueError with a clear message if anything is wrong.

    This runs on every live API request before the model sees the data.
    """

    # Valid ranges for numeric fields
    # Format: field_name → (min, max, unit_label)
    NUMERIC_RANGES = {
        "nitrogen":    (0,    200,  "mg/kg"),
        "phosphorus":  (0,    200,  "mg/kg"),
        "potassium":   (0,    200,  "mg/kg"),
        "ph":          (3.0,  10.0, "pH units"),
        "rainfall":    (0,    3000, "mm/year"),
        "temperature": (5,    50,   "°C"),
        "humidity":    (10,   100,  "%"),
    }

    # Valid options for categorical fields
    VALID_CATEGORIES = {
        "soil_type": [
            "loamy", "sandy", "clay", "silty",
            "peaty", "saline", "laterite"
        ],
        "season": [
            "long_rains", "short_rains", "dry", "transitional"
        ],
        "region": [
            "coastal", "highland", "semi_arid", "sub_humid", "arid"
        ],
        "irrigation": [0, 1, "0", "1", True, False],
    }

    errors = []

    # Check numeric fields
    for field, (lo, hi, unit) in NUMERIC_RANGES.items():
        val = data.get(field)

        if val is None:
            errors.append(f"Missing field: '{field}'")
            continue

        try:
            val = float(val)
        except (TypeError, ValueError):
            errors.append(
                f"'{field}' must be a number, got: {val!r}"
            )
            continue

        if not (lo <= val <= hi):
            errors.append(
                f"'{field}' value {val} is out of range "
                f"[{lo} to {hi} {unit}]"
            )

        data[field] = round(val, 4)

    # Check categorical fields
    for field, valid_values in VALID_CATEGORIES.items():
        val = data.get(field)

        if val is None:
            errors.append(f"Missing field: '{field}'")
            continue

        if val not in valid_values:
            errors.append(
                f"'{field}' value {val!r} is not valid. "
                f"Choose from: {valid_values}"
            )

    # If any errors found, raise them all at once
    # so the farmer/developer sees everything wrong in one go
    if errors:
        error_list = "\n".join(f"  • {e}" for e in errors)
        raise ValueError(
            f"Input validation failed:\n{error_list}"
        )

    # Normalise irrigation to integer
    data["irrigation"] = int(data["irrigation"])

    return data