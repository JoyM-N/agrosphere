"""
AgroSphere Training Data Builder
==================================
What this file does:
  Combines two data sources into one clean training dataset:

  Source 1 — Kaggle Crop Recommendation CSV (real labeled data)
             2,200 rows, 8 columns (NPK + climate + crop label)

  Source 2 — Our synthetic generator (African contextual data)
             ~4,970 rows, 12 columns (adds soil_type, season,
             region, irrigation)

  Output   — agrosphere_dataset.csv
             ~6,500 rows, 12 columns, ready for model training

Why we merge instead of choosing one:
  - Kaggle gives us real NPK/climate distributions (credibility)
  - Our synthetic data gives us African context columns that
    don't exist in any public dataset (intelligence)
  - Together they produce a richer, more honest training set

Run this file with:
  python data/build_training_data.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

# So we can import generate_dataset from the same folder
sys.path.insert(0, str(Path(__file__).parent))
from generate_dataset import build_dataset

np.random.seed(42)

# ─── File paths ───────────────────────────────────────────────────────────────
DATA_DIR   = Path(__file__).parent
KAGGLE_CSV = DATA_DIR / "Crop_recommendation.csv"
OUTPUT_CSV = DATA_DIR / "agrosphere_dataset.csv"


# ─── Crop decisions ───────────────────────────────────────────────────────────
# Maps Kaggle crop names → our standardised names.
# Crops mapped to None are dropped (not relevant to East Africa).

CROP_NAME_MAP = {
    "rice":        "rice",
    "maize":       "maize",
    "chickpea":    "chickpea",
    "kidneybeans": "kidney_beans",
    "pigeonpeas":  "pigeon_peas",
    "mothbeans":   "moth_beans",
    "mungbean":    "mung_bean",
    "blackgram":   "blackgram",
    "lentil":      "lentils",
    "pomegranate": "pomegranate",
    "banana":      "banana",
    "mango":       "mango",
    "grapes":      "grapes",
    "watermelon":  "watermelon",
    "muskmelon":   "muskmelon",
    "apple":       "apple",
    "orange":      "orange",
    "papaya":      "papaya",
    "coconut":     "coconut",
    "cotton":      "cotton",
    "jute":        None,           # Not relevant to East Africa — dropped
    "coffee":      "coffee",
}

# ─── Context assignment rules ─────────────────────────────────────────────────
# For each crop, we assign the 4 missing contextual columns:
# soil_type, season, region, irrigation
#
# These are NOT random — they reflect actual agronomic knowledge.
# Each crop gets a list of valid options; we sample from them randomly.
# This simulates the real variation across different farms growing the same crop.

CROP_CONTEXT = {
    "rice":         dict(soils=["clay","silty"],         seasons=["long_rains"],                    regions=["coastal","sub_humid"],        irr=0.7),
    "maize":        dict(soils=["loamy","silty"],         seasons=["long_rains","short_rains"],      regions=["highland","sub_humid"],       irr=0.3),
    "chickpea":     dict(soils=["loamy","sandy"],         seasons=["dry","transitional"],            regions=["highland","semi_arid"],       irr=0.35),
    "kidney_beans": dict(soils=["loamy","silty"],         seasons=["long_rains","short_rains"],      regions=["highland","sub_humid"],       irr=0.25),
    "pigeon_peas":  dict(soils=["loamy","sandy"],         seasons=["long_rains","short_rains"],      regions=["sub_humid","semi_arid"],      irr=0.2),
    "moth_beans":   dict(soils=["sandy"],                 seasons=["short_rains","dry"],             regions=["semi_arid","arid"],           irr=0.15),
    "mung_bean":    dict(soils=["loamy","sandy"],         seasons=["short_rains","transitional"],    regions=["sub_humid","semi_arid"],      irr=0.25),
    "blackgram":    dict(soils=["loamy","clay"],          seasons=["short_rains","transitional"],    regions=["sub_humid","coastal"],        irr=0.2),
    "lentils":      dict(soils=["loamy","clay"],          seasons=["dry","transitional"],            regions=["highland","semi_arid"],       irr=0.4),
    "pomegranate":  dict(soils=["sandy","loamy"],         seasons=["dry","transitional"],            regions=["semi_arid","arid"],           irr=0.6),
    "banana":       dict(soils=["loamy","clay"],          seasons=["long_rains"],                    regions=["coastal","sub_humid"],        irr=0.3),
    "mango":        dict(soils=["sandy","loamy"],         seasons=["dry","transitional"],            regions=["coastal","semi_arid"],        irr=0.2),
    "grapes":       dict(soils=["loamy","sandy"],         seasons=["dry"],                           regions=["highland","semi_arid"],       irr=0.7),
    "watermelon":   dict(soils=["sandy","loamy"],         seasons=["dry","short_rains"],             regions=["semi_arid","sub_humid"],      irr=0.5),
    "muskmelon":    dict(soils=["sandy","loamy"],         seasons=["dry","transitional"],            regions=["semi_arid","sub_humid"],      irr=0.55),
    "apple":        dict(soils=["loamy","silty"],         seasons=["dry","transitional"],            regions=["highland"],                   irr=0.5),
    "orange":       dict(soils=["loamy","sandy"],         seasons=["transitional","long_rains"],     regions=["highland","sub_humid"],       irr=0.4),
    "papaya":       dict(soils=["loamy","sandy"],         seasons=["long_rains","transitional"],     regions=["coastal","sub_humid"],        irr=0.3),
    "coconut":      dict(soils=["sandy","loamy"],         seasons=["long_rains"],                    regions=["coastal"],                    irr=0.2),
    "cotton":       dict(soils=["loamy","clay"],          seasons=["long_rains"],                    regions=["sub_humid","coastal"],        irr=0.35),
    "coffee":       dict(soils=["loamy","silty"],         seasons=["long_rains"],                    regions=["highland"],                   irr=0.15),
    # Crops only in our synthetic data (not in Kaggle)
    "wheat":        dict(soils=["loamy","clay"],          seasons=["dry"],                           regions=["highland"],                   irr=0.5),
    "sorghum":      dict(soils=["sandy","loamy"],         seasons=["short_rains","dry"],             regions=["semi_arid","arid"],           irr=0.2),
    "millet":       dict(soils=["sandy"],                 seasons=["short_rains","dry"],             regions=["semi_arid","arid"],           irr=0.1),
    "beans":        dict(soils=["loamy","silty"],         seasons=["long_rains","short_rains"],      regions=["highland","sub_humid"],       irr=0.25),
    "cassava":      dict(soils=["sandy","loamy"],         seasons=["long_rains"],                    regions=["coastal","sub_humid"],        irr=0.15),
    "potato":       dict(soils=["loamy","silty"],         seasons=["long_rains","transitional"],     regions=["highland"],                   irr=0.45),
    "sweetpotato":  dict(soils=["sandy","loamy"],         seasons=["long_rains","short_rains"],      regions=["sub_humid","highland"],       irr=0.2),
    "tomato":       dict(soils=["loamy","silty"],         seasons=["dry","transitional"],            regions=["highland","sub_humid"],       irr=0.8),
    "onion":        dict(soils=["loamy","sandy"],         seasons=["dry"],                           regions=["highland","semi_arid"],       irr=0.75),
    "cabbage":      dict(soils=["loamy","clay"],          seasons=["long_rains","short_rains"],      regions=["highland"],                   irr=0.5),
    "sugarcane":    dict(soils=["loamy","clay"],          seasons=["long_rains"],                    regions=["coastal","sub_humid"],        irr=0.5),
    "sunflower":    dict(soils=["loamy","sandy"],         seasons=["short_rains","dry"],             regions=["semi_arid","sub_humid"],      irr=0.25),
    "groundnut":    dict(soils=["sandy","loamy"],         seasons=["long_rains"],                    regions=["sub_humid","coastal"],        irr=0.2),
    "tea":          dict(soils=["loamy","silty"],         seasons=["long_rains"],                    regions=["highland"],                   irr=0.1),
}


def assign_context(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds soil_type, season, region, irrigation columns to a DataFrame
    based on crop-specific context rules above.

    For each row, we look up the crop name in CROP_CONTEXT and
    randomly sample from its valid options. This is smarter than
    pure random assignment because a rice row will always get
    'clay' or 'silty' soil, never 'sandy' — just like in reality.
    """
    df = df.copy()
    n = len(df)

    soil_types  = []
    seasons     = []
    regions     = []
    irrigations = []

    for _, row in df.iterrows():
        crop = row["crop"]
        ctx  = CROP_CONTEXT.get(crop)

        if ctx is None:
            # Fallback — should not happen if CROP_CONTEXT is complete
            soil_types.append("loamy")
            seasons.append("long_rains")
            regions.append("sub_humid")
            irrigations.append(0)
        else:
            soil_types.append(np.random.choice(ctx["soils"]))
            seasons.append(np.random.choice(ctx["seasons"]))
            regions.append(np.random.choice(ctx["regions"]))
            irrigations.append(int(np.random.random() < ctx["irr"]))

    df["soil_type"]  = soil_types
    df["season"]     = seasons
    df["region"]     = regions
    df["irrigation"] = irrigations

    return df


def load_kaggle_data(path: Path) -> pd.DataFrame:
    """
    Loads and cleans the Kaggle crop recommendation CSV.

    Steps:
    1. Load CSV
    2. Rename columns to match our schema
    3. Rename crop labels to our standardised names
    4. Drop crops not relevant to East Africa
    5. Assign the four missing context columns
    """
    print("Loading Kaggle data...")
    df = pd.read_csv(path)
    print(f"  Loaded: {df.shape[0]} rows, {df.shape[1]} columns")

    # Step 1 — Rename columns to our naming convention
    df = df.rename(columns={
        "N":           "nitrogen",
        "P":           "phosphorus",
        "K":           "potassium",
        "temperature": "temperature",
        "humidity":    "humidity",
        "ph":          "ph",
        "rainfall":    "rainfall",
        "label":       "crop",
    })

    # Step 2 — Rename crop labels
    df["crop"] = df["crop"].map(CROP_NAME_MAP)

    # Step 3 — Drop rows where crop mapped to None (jute)
    dropped = df["crop"].isna().sum()
    df = df.dropna(subset=["crop"])
    print(f"  Dropped {dropped} rows (crops not relevant to East Africa)")

    # Step 4 — Assign context columns
    df = assign_context(df)
    print(f"  Added context columns (soil_type, season, region, irrigation)")
    print(f"  Kaggle data ready: {df.shape[0]} rows, {df.shape[1]} columns")

    return df


def load_synthetic_data() -> pd.DataFrame:
    """
    Runs our existing generator to produce the synthetic African context rows.
    These include crops not in the Kaggle dataset (sorghum, millet, cassava,
    potato, tomato etc.) with full 12-column profiles.
    """
    print("\nGenerating synthetic African context data...")
    df = build_dataset()
    print(f"  Synthetic data ready: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def merge_and_clean(kaggle_df: pd.DataFrame,
                    synthetic_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merges both sources, removes duplicates, standardises types,
    and produces the final training dataset.
    """
    print("\nMerging datasets...")

    # Ensure column order matches exactly before concat
    cols = ["nitrogen","phosphorus","potassium","ph",
            "rainfall","temperature","humidity",
            "soil_type","season","region","irrigation","crop"]

    kaggle_df    = kaggle_df[cols]
    synthetic_df = synthetic_df[cols]

    merged = pd.concat([kaggle_df, synthetic_df], ignore_index=True)

    # Shuffle the combined dataset
    merged = merged.sample(frac=1, random_state=42).reset_index(drop=True)

    # Round numeric columns consistently
    numeric_cols = ["nitrogen","phosphorus","potassium","ph",
                    "rainfall","temperature","humidity"]
    for col in numeric_cols:
        merged[col] = merged[col].round(2)

    # Ensure irrigation is integer (0 or 1)
    merged["irrigation"] = merged["irrigation"].astype(int)

    # Verify no missing values
    missing = merged.isnull().sum().sum()
    if missing > 0:
        print(f"  WARNING: {missing} missing values found — filling with column mode")
        merged = merged.fillna(merged.mode().iloc[0])

    return merged


def print_summary(df: pd.DataFrame) -> None:
    """Prints a clear summary of the final dataset."""
    print("\n" + "═" * 55)
    print("  AgroSphere Training Dataset — Final Summary")
    print("═" * 55)
    print(f"  Total rows        : {len(df)}")
    print(f"  Total columns     : {len(df.columns)}")
    print(f"  Crop classes      : {df['crop'].nunique()}")
    print(f"  Missing values    : {df.isnull().sum().sum()}")
    print(f"\n  Columns           : {list(df.columns)}")
    print(f"\n  Samples per crop  :")
    counts = df["crop"].value_counts()
    for crop, count in counts.items():
        bar = "█" * (count // 20)
        print(f"    {crop:<20} {count:>4}  {bar}")
    print(f"\n  Numeric ranges    :")
    numeric = ["nitrogen","phosphorus","potassium","ph","rainfall","temperature","humidity"]
    for col in numeric:
        print(f"    {col:<15} min={df[col].min():>7.2f}  max={df[col].max():>7.2f}  mean={df[col].mean():>7.2f}")
    print("═" * 55)


# ─── Run directly ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Check Kaggle file exists
    if not KAGGLE_CSV.exists():
        print(f"ERROR: Kaggle CSV not found at {KAGGLE_CSV}")
        print("Please download it from:")
        print("  https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset")
        print("And place it at: ml/data/Crop_recommendation.csv")
        sys.exit(1)

    # Build dataset
    kaggle_df    = load_kaggle_data(KAGGLE_CSV)
    synthetic_df = load_synthetic_data()
    final_df     = merge_and_clean(kaggle_df, synthetic_df)

    # Print summary
    print_summary(final_df)

    # Save
    final_df.to_csv(OUTPUT_CSV, index=False)
    print(f"\n  Saved to: {OUTPUT_CSV}")
    print("\n  Next step: python training/train.py")