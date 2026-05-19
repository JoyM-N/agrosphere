"""
AgroSphere Model Training Pipeline
=====================================
What this file does:
  Trains the AgroSphere Intelligence Engine — a stacked ensemble
  of three models (Random Forest + XGBoost + LightGBM) combined
  by a meta-learner into one final prediction.

  When training finishes it saves the trained model to:
    ml/artifacts/agrosphere_pipeline_latest.pkl
    ml/artifacts/agrosphere_labels_latest.pkl
    ml/artifacts/crop_classes.json
    ml/artifacts/training_metrics.json

How to run:
  python training/train.py

What you will see:
  - Cross-validation scores (honest estimate of real-world accuracy)
  - Final test set evaluation
  - Per-crop accuracy breakdown
  - Saved artifact confirmation
"""

import json
import warnings
import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    f1_score,
    top_k_accuracy_score,
)
from sklearn.model_selection import (
    StratifiedKFold,
    cross_validate,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    LabelEncoder,
    OneHotEncoder,
    StandardScaler,
)

import xgboost as xgb
import lightgbm as lgb

# Import our feature definitions — same file used at inference time
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from training.features import (
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    TARGET_COL,
    engineer_features,
)

warnings.filterwarnings("ignore")

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent.parent
DATA_PATH    = BASE_DIR / "data" / "agrosphere_dataset.csv"
ARTIFACT_DIR = BASE_DIR / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


# ─── Step 1: Preprocessor ─────────────────────────────────────────────────────

def build_preprocessor() -> ColumnTransformer:
    """
    Prepares raw features for the model.

    Numerical features → StandardScaler
      Centres each number around 0 with standard deviation 1.
      Why: LightGBM and the logistic meta-learner are sensitive
      to feature scale. Without this, rainfall (0–3000) would
      dominate pH (3–10) simply because its numbers are bigger.

    Categorical features → OneHotEncoder
      Converts text categories into binary columns.
      "loamy" becomes [1,0,0,0,0,0,0]
      "sandy" becomes [0,1,0,0,0,0,0]
      Why: ML models work with numbers, not text.
      handle_unknown='ignore' means unseen values at inference
      time produce all zeros rather than crashing.
    """
    return ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


# ─── Step 2: Base models ──────────────────────────────────────────────────────

def build_random_forest() -> RandomForestClassifier:
    """
    Stability anchor of the ensemble.

    n_estimators=300     : 300 decision trees vote together
    class_weight=balanced: treats rare crops as important as common ones
    oob_score=True       : free internal validation using unused samples
    n_jobs=-1            : uses all CPU cores
    """
    return RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced",
        oob_score=True,
        random_state=42,
        n_jobs=-1,
    )


def build_xgboost(n_classes: int) -> xgb.XGBClassifier:
    """
    Accuracy driver of the ensemble.
    Gradient boosting — each tree corrects the mistakes of the previous.

    learning_rate=0.05 : slow and careful — better generalisation
    subsample=0.8      : each tree sees 80% of rows — prevents overfitting
    colsample_bytree   : each tree sees 80% of features — more diversity
    """
    return xgb.XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="multi:softprob",
        num_class=n_classes,
        eval_metric="mlogloss",
        use_label_encoder=False,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )


def build_lightgbm() -> lgb.LGBMClassifier:
    """
    Efficiency model of the ensemble.
    Fastest inference + lowest memory — important at production scale.

    num_leaves=63      : controls model complexity
    class_weight=balanced: same as RF — handles imbalanced crop classes
    verbose=-1         : suppresses training output noise
    """
    return lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=63,
        max_depth=-1,
        min_child_samples=10,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        class_weight="balanced",
        verbose=-1,
        random_state=42,
        n_jobs=-1,
    )


# ─── Step 3: Stacking ensemble ────────────────────────────────────────────────

def build_ensemble(n_classes: int) -> StackingClassifier:
    """
    Combines all three models using stacking.

    How stacking works:
      1. Dataset is split into 5 folds
      2. Each base model (RF, XGB, LGB) trains on 4 folds
         and predicts on the 5th fold
      3. Those predictions become the input features for
         the meta-learner (logistic regression)
      4. The meta-learner learns WHEN to trust each model
         e.g. "trust XGB for highland crops, trust LGB for
         arid crops"

    passthrough=True means the meta-learner also sees the
    original features alongside the base model outputs —
    giving it full context to make better decisions.
    """
    return StackingClassifier(
        estimators=[
            ("rf",  build_random_forest()),
            ("xgb", build_xgboost(n_classes)),
            ("lgb", build_lightgbm()),
        ],
        final_estimator=LogisticRegression(
            C=1.0,
            max_iter=2000,
            solver="lbfgs",
            random_state=42,
            n_jobs=-1,
        ),
        cv=StratifiedKFold(
            n_splits=5,
            shuffle=True,
            random_state=42,
        ),
        stack_method="predict_proba",
        passthrough=True,
        n_jobs=1,
    )


# ─── Step 4: Full pipeline ────────────────────────────────────────────────────

def build_pipeline(n_classes: int) -> Pipeline:
    """
    Chains preprocessor → ensemble into one object.

    Why a Pipeline:
      When you call pipeline.predict(raw_data), it automatically
      runs the preprocessor first then the model. You can never
      accidentally skip preprocessing. This is the production-safe
      way to package ML models.
    """
    return Pipeline([
        ("preprocessor", build_preprocessor()),
        ("ensemble",     build_ensemble(n_classes)),
    ])


# ─── Step 5: Evaluation ───────────────────────────────────────────────────────

def evaluate(
    pipeline: Pipeline,
    X_test: pd.DataFrame,
    y_test: np.ndarray,
    label_encoder: LabelEncoder,
) -> dict:
    """
    Measures model performance on the held-out test set.

    Metrics explained:

    Top-1 Accuracy:
      The model's #1 recommendation is correct.
      Target: ≥ 85%

    Top-3 Accuracy (headline metric):
      The correct crop appears somewhere in the top 3 recommendations.
      This is the metric that matters most for a recommendation system —
      the farmer sees 3-5 options and picks one.
      Target: ≥ 95%

    Top-5 Accuracy:
      Correct crop in top 5.
      Target: ≥ 99%

    F1 Macro:
      Average F1 score across ALL crop classes equally weighted.
      Penalises the model for ignoring rare crops.
      Target: ≥ 0.80
    """
    y_pred  = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    top1 = float((y_pred == y_test).mean())
    top3 = float(top_k_accuracy_score(y_test, y_proba, k=3))
    top5 = float(top_k_accuracy_score(
        y_test, y_proba, k=min(5, y_proba.shape[1])
    ))
    f1_macro    = float(f1_score(y_test, y_pred, average="macro"))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted"))

    # Human-readable labels
    y_pred_names = label_encoder.inverse_transform(y_pred)
    y_test_names = label_encoder.inverse_transform(y_test)

    print("\n" + "═" * 55)
    print("  AgroSphere Intelligence Engine — Results")
    print("═" * 55)

    def status(val, target):
        return "✅ PASS" if val >= target else "❌ NEEDS WORK"

    print(f"\n  Top-1 Accuracy   : {top1*100:>6.2f}%  {status(top1, 0.85)}")
    print(f"  Top-3 Accuracy   : {top3*100:>6.2f}%  {status(top3, 0.95)}  ← headline")
    print(f"  Top-5 Accuracy   : {top5*100:>6.2f}%  {status(top5, 0.99)}")
    print(f"  F1 Macro         : {f1_macro:>6.4f}   {status(f1_macro, 0.80)}")
    print(f"  F1 Weighted      : {f1_weighted:>6.4f}")

    print("\n  Per-crop breakdown:")
    report = classification_report(
        y_test_names,
        y_pred_names,
        zero_division=0,
        output_dict=True,
    )
    # Print only per-class rows, not averages
    for crop, scores in report.items():
        if isinstance(scores, dict) and crop not in [
            "accuracy", "macro avg", "weighted avg"
        ]:
            f1  = scores["f1-score"]
            sup = int(scores["support"])
            bar = "█" * int(f1 * 20)
            flag = "" if f1 >= 0.80 else "  ⚠ low"
            print(f"    {crop:<22} F1={f1:.2f}  n={sup:>3}  {bar}{flag}")

    print("═" * 55)

    return {
        "top1":         top1,
        "top3":         top3,
        "top5":         top5,
        "f1_macro":     f1_macro,
        "f1_weighted":  f1_weighted,
    }


# ─── Step 6: Main training function ──────────────────────────────────────────

def train() -> tuple:
    """
    Full training run. Called when you run this file directly.
    Also importable by other scripts that need to retrain.
    """

    # ── Load data ─────────────────────────────────────────────────────────────
    print("\n[ Step 1/6 ] Loading dataset...")
    if not DATA_PATH.exists():
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        print("Run this first:  python data/build_training_data.py")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
    print(f"  Crop classes: {df[TARGET_COL].nunique()}")

    # ── Engineer features ─────────────────────────────────────────────────────
    print("\n[ Step 2/6 ] Engineering features...")
    df = engineer_features(df)

    X = df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y_raw = df[TARGET_COL]
    print(f"  Feature matrix: {X.shape[0]} rows × {X.shape[1]} columns")
    print(f"  Features used: {list(X.columns)}")

    # ── Encode labels ─────────────────────────────────────────────────────────
    print("\n[ Step 3/6 ] Encoding crop labels...")
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    n_classes = len(label_encoder.classes_)
    print(f"  Encoded {n_classes} crop classes")
    print(f"  Classes: {list(label_encoder.classes_)}")

    # ── Train / test split ────────────────────────────────────────────────────
    # 80% training, 20% held-out test
    # stratify=y ensures every crop is represented in both splits
    print("\n[ Step 4/6 ] Splitting data (80% train / 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        stratify=y,
        random_state=42,
    )
    print(f"  Training set : {len(X_train)} rows")
    print(f"  Test set     : {len(X_test)} rows")

    # ── Cross-validation ──────────────────────────────────────────────────────
    # This runs BEFORE the final fit to give us an honest accuracy estimate.
    # Cross-validation splits training data into 5 folds, trains on 4,
    # validates on 1, rotates, and averages — no data leakage.
    print("\n[ Step 5/6 ] Running 5-fold cross-validation...")
    print("  (This takes 3-8 minutes — the ensemble is training 3 models × 5 folds)")
    print("  Please wait...\n")

    pipeline = build_pipeline(n_classes)

    cv_results = cross_validate(
        pipeline,
        X_train,
        y_train,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring=["accuracy", "f1_macro", "f1_weighted"],
        return_train_score=True,
        n_jobs=1,
        verbose=0,
    )

    print(f"  CV Accuracy (train) : "
          f"{cv_results['train_accuracy'].mean():.4f} "
          f"± {cv_results['train_accuracy'].std():.4f}")
    print(f"  CV Accuracy (val)   : "
          f"{cv_results['test_accuracy'].mean():.4f} "
          f"± {cv_results['test_accuracy'].std():.4f}")
    print(f"  CV F1 Macro (val)   : "
          f"{cv_results['test_f1_macro'].mean():.4f} "
          f"± {cv_results['test_f1_macro'].std():.4f}")

    gap = (cv_results['train_accuracy'].mean()
           - cv_results['test_accuracy'].mean())
    if gap > 0.05:
        print(f"\n  ⚠  Train/val gap is {gap:.3f} — slight overfitting detected")
        print("     This is normal for an ensemble. "
              "Test set result is the honest number.")

    # ── Final fit ─────────────────────────────────────────────────────────────
    print("\n[ Step 6/6 ] Fitting final model on full training set...")
    print("  Please wait...\n")
    pipeline = build_pipeline(n_classes)
    pipeline.fit(X_train, y_train)

    # ── Evaluate on test set ──────────────────────────────────────────────────
    metrics = evaluate(pipeline, X_test, y_test, label_encoder)

    # ── Save artifacts ────────────────────────────────────────────────────────
    version = datetime.datetime.now().strftime("%Y%m%d_%H%M")

    print(f"\n  Saving artifacts (version: {version})...")

    # Versioned copies (so you can roll back)
    joblib.dump(
        pipeline,
        ARTIFACT_DIR / f"agrosphere_pipeline_v{version}.pkl"
    )
    joblib.dump(
        label_encoder,
        ARTIFACT_DIR / f"agrosphere_labels_v{version}.pkl"
    )

    # Latest copies (what the inference service loads)
    joblib.dump(
        pipeline,
        ARTIFACT_DIR / "agrosphere_pipeline_latest.pkl"
    )
    joblib.dump(
        label_encoder,
        ARTIFACT_DIR / "agrosphere_labels_latest.pkl"
    )

    # Crop class list as JSON (useful for frontend dropdowns)
    with open(ARTIFACT_DIR / "crop_classes.json", "w") as f:
        json.dump(list(label_encoder.classes_), f, indent=2)

    # Training metrics record
    metrics["version"]   = version
    metrics["n_classes"] = n_classes
    metrics["n_train"]   = len(X_train)
    metrics["n_test"]    = len(X_test)

    with open(ARTIFACT_DIR / "training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n  ✅ All artifacts saved to: {ARTIFACT_DIR}")
    print(f"  ✅ Model version: {version}")
    print("\n  Next step: python services/ml_service.py")

    return pipeline, label_encoder, metrics


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    train()