import numpy as np
import pandas as pd
from pathlib import Path

# Fix the random seed so you get the same dataset every time you run this.
# Change this number if you want a different random split.
np.random.seed(42)
CROP_PROFILES = {

    # ── CEREALS ──────────────────────────────────────────────────────────────
    "maize": dict(
        N=(80,120), P=(40,70), K=(40,60), pH=(5.8,7.0),
        rainfall=(500,900), temp=(18,28), humidity=(55,80),
        soils=["loamy","silty"],
        seasons=["long_rains","short_rains"],
        regions=["highland","sub_humid"],
        irrigation_prob=0.3, n=320
    ),
    "rice": dict(
        N=(100,140), P=(40,70), K=(35,55), pH=(5.5,7.0),
        rainfall=(1200,2500), temp=(22,32), humidity=(75,95),
        soils=["clay","silty"],
        seasons=["long_rains"],
        regions=["coastal","sub_humid"],
        irrigation_prob=0.7, n=250
    ),
    "wheat": dict(
        N=(60,100), P=(30,60), K=(30,50), pH=(6.0,7.5),
        rainfall=(450,700), temp=(12,22), humidity=(40,65),
        soils=["loamy","clay"],
        seasons=["dry"],
        regions=["highland"],
        irrigation_prob=0.5, n=200
    ),
    "sorghum": dict(
        N=(50,90), P=(30,55), K=(30,50), pH=(5.5,7.5),
        rainfall=(300,600), temp=(24,34), humidity=(30,60),
        soils=["sandy","loamy"],
        seasons=["short_rains","dry"],
        regions=["semi_arid","arid"],
        irrigation_prob=0.2, n=280
    ),
    "millet": dict(
        N=(40,75), P=(25,50), K=(25,45), pH=(5.5,7.0),
        rainfall=(200,450), temp=(26,38), humidity=(25,55),
        soils=["sandy"],
        seasons=["short_rains","dry"],
        regions=["semi_arid","arid"],
        irrigation_prob=0.1, n=250
    ),

    # ── LEGUMES ──────────────────────────────────────────────────────────────
    "beans": dict(
        N=(20,45), P=(50,80), K=(40,65), pH=(6.0,7.5),
        rainfall=(400,700), temp=(16,26), humidity=(50,75),
        soils=["loamy","silty"],
        seasons=["long_rains","short_rains"],
        regions=["highland","sub_humid"],
        irrigation_prob=0.25, n=300
    ),
    "lentils": dict(
        N=(15,40), P=(45,75), K=(35,55), pH=(6.0,8.0),
        rainfall=(250,500), temp=(14,24), humidity=(35,60),
        soils=["loamy","clay"],
        seasons=["dry","transitional"],
        regions=["highland","semi_arid"],
        irrigation_prob=0.4, n=180
    ),
    "chickpea": dict(
        N=(15,40), P=(40,70), K=(35,60), pH=(5.5,7.0),
        rainfall=(400,700), temp=(15,25), humidity=(40,65),
        soils=["loamy","sandy"],
        seasons=["dry","transitional"],
        regions=["highland","semi_arid"],
        irrigation_prob=0.35, n=180
    ),
    "groundnut": dict(
        N=(20,50), P=(50,80), K=(50,80), pH=(5.5,7.0),
        rainfall=(500,900), temp=(24,33), humidity=(45,70),
        soils=["sandy","loamy"],
        seasons=["long_rains"],
        regions=["sub_humid","coastal"],
        irrigation_prob=0.2, n=220
    ),

    # ── ROOT & TUBER ─────────────────────────────────────────────────────────
    "cassava": dict(
        N=(40,80), P=(30,60), K=(60,100), pH=(5.5,7.0),
        rainfall=(600,1200), temp=(22,32), humidity=(60,85),
        soils=["sandy","loamy"],
        seasons=["long_rains"],
        regions=["coastal","sub_humid"],
        irrigation_prob=0.15, n=260
    ),
    "potato": dict(
        N=(100,150), P=(60,100), K=(100,160), pH=(5.0,6.5),
        rainfall=(500,900), temp=(10,20), humidity=(60,80),
        soils=["loamy","silty"],
        seasons=["long_rains","transitional"],
        regions=["highland"],
        irrigation_prob=0.45, n=220
    ),
    "sweetpotato": dict(
        N=(50,90), P=(40,70), K=(80,130), pH=(5.5,7.0),
        rainfall=(450,800), temp=(20,30), humidity=(55,80),
        soils=["sandy","loamy"],
        seasons=["long_rains","short_rains"],
        regions=["sub_humid","highland"],
        irrigation_prob=0.2, n=200
    ),

    # ── VEGETABLES & FRUITS ──────────────────────────────────────────────────
    "tomato": dict(
        N=(80,130), P=(60,100), K=(100,160), pH=(6.0,7.0),
        rainfall=(400,700), temp=(18,28), humidity=(50,75),
        soils=["loamy","silty"],
        seasons=["dry","transitional"],
        regions=["highland","sub_humid"],
        irrigation_prob=0.8, n=240
    ),
    "onion": dict(
        N=(80,120), P=(50,80), K=(80,130), pH=(6.0,7.5),
        rainfall=(300,600), temp=(16,26), humidity=(40,65),
        soils=["loamy","sandy"],
        seasons=["dry"],
        regions=["highland","semi_arid"],
        irrigation_prob=0.75, n=200
    ),
    "cabbage": dict(
        N=(100,150), P=(50,90), K=(80,130), pH=(6.0,7.5),
        rainfall=(450,750), temp=(12,22), humidity=(55,80),
        soils=["loamy","clay"],
        seasons=["long_rains","short_rains"],
        regions=["highland"],
        irrigation_prob=0.5, n=180
    ),
    "banana": dict(
        N=(150,200), P=(40,80), K=(150,220), pH=(5.5,7.0),
        rainfall=(1000,2000), temp=(22,32), humidity=(70,90),
        soils=["loamy","clay"],
        seasons=["long_rains"],
        regions=["coastal","sub_humid"],
        irrigation_prob=0.3, n=220
    ),
    "mango": dict(
        N=(60,100), P=(30,60), K=(50,90), pH=(5.5,7.5),
        rainfall=(500,1200), temp=(24,36), humidity=(40,70),
        soils=["sandy","loamy"],
        seasons=["dry","transitional"],
        regions=["coastal","semi_arid"],
        irrigation_prob=0.2, n=180
    ),

    # ── CASH CROPS ───────────────────────────────────────────────────────────
    "coffee": dict(
        N=(100,150), P=(40,80), K=(80,130), pH=(5.5,6.5),
        rainfall=(1200,2000), temp=(15,24), humidity=(65,85),
        soils=["loamy","silty"],
        seasons=["long_rains"],
        regions=["highland"],
        irrigation_prob=0.15, n=200
    ),
    "tea": dict(
        N=(120,180), P=(30,60), K=(60,100), pH=(4.5,6.0),
        rainfall=(1500,2500), temp=(12,22), humidity=(70,90),
        soils=["loamy","silty"],
        seasons=["long_rains"],
        regions=["highland"],
        irrigation_prob=0.1, n=180
    ),
    "sugarcane": dict(
        N=(150,220), P=(40,80), K=(100,180), pH=(5.5,7.5),
        rainfall=(1200,2000), temp=(22,36), humidity=(60,85),
        soils=["loamy","clay"],
        seasons=["long_rains"],
        regions=["coastal","sub_humid"],
        irrigation_prob=0.5, n=200
    ),
    "cotton": dict(
        N=(80,130), P=(40,70), K=(50,90), pH=(5.8,7.5),
        rainfall=(500,1000), temp=(22,34), humidity=(40,65),
        soils=["loamy","clay"],
        seasons=["long_rains"],
        regions=["sub_humid","coastal"],
        irrigation_prob=0.35, n=180
    ),
    "sunflower": dict(
        N=(50,90), P=(40,70), K=(50,90), pH=(6.0,7.5),
        rainfall=(400,750), temp=(20,32), humidity=(35,60),
        soils=["loamy","sandy"],
        seasons=["short_rains","dry"],
        regions=["semi_arid","sub_humid"],
        irrigation_prob=0.25, n=180
    ),
}


def sample_crop(crop_name: str, profile: dict) -> pd.DataFrame:
    """
    Generates n realistic sample rows for one crop.
    Uses normal distribution around the ideal midpoint with 12% spread.
    The clip() call ensures values stay within biologically possible ranges.
    """
    n = profile["n"]

    def noise(lo, hi):
        """Sample n values normally distributed between lo and hi."""
        mid   = (lo + hi) / 2
        spread = (hi - lo) * 0.12     # 12% of range as standard deviation
        return np.random.normal(mid, spread, n).clip(lo * 0.75, hi * 1.25)

    df = pd.DataFrame({
        "nitrogen":    noise(*profile["N"]),
        "phosphorus":  noise(*profile["P"]),
        "potassium":   noise(*profile["K"]),
        "ph":          np.random.uniform(*profile["pH"], n).round(1),
        "rainfall":    noise(*profile["rainfall"]),
        "temperature": noise(*profile["temp"]),
        "humidity":    noise(*profile["humidity"]),
        "soil_type":   np.random.choice(profile["soils"], n),
        "season":      np.random.choice(profile["seasons"], n),
        "region":      np.random.choice(profile["regions"], n),
        "irrigation":  (np.random.random(n) < profile["irrigation_prob"]).astype(int),
        "crop":        crop_name,
    })

    # Round numeric columns to 2 decimal places — cleaner CSV
    for col in ["nitrogen","phosphorus","potassium","rainfall","temperature","humidity"]:
        df[col] = df[col].round(2)

    return df


def build_dataset() -> pd.DataFrame:
    """Combines all crop samples into one shuffled dataset."""
    frames = [sample_crop(name, profile)
              for name, profile in CROP_PROFILES.items()]

    df = pd.concat(frames, ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"Total rows       : {len(df)}")
    print(f"Crop classes     : {df['crop'].nunique()}")
    print(f"Columns          : {list(df.columns)}")
    print(f"Missing values   : {df.isnull().sum().sum()}")
    print(f"\nSamples per crop:")
    print(df["crop"].value_counts().to_string())
    return df


# ─── Run directly ─────────────────────────────────────────────────────────────
# When you run:  python data/generate_dataset.py
# It creates the CSV file in the data/ folder.

if __name__ == "__main__":
    output_path = Path(__file__).parent / "agrosphere_dataset.csv"
    df = build_dataset()
    df.to_csv(output_path, index=False)
    print(f"\nDataset saved to: {output_path}")