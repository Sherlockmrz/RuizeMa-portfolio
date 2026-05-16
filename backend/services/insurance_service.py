from __future__ import annotations

import os
import sys
import warnings
import contextlib
from functools import lru_cache
from pathlib import Path
from typing import Any

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INSURANCE_ROOT = PROJECT_ROOT / "original_projects" / "Insurance-Cost-Predictor"
INSURANCE_APP = INSURANCE_ROOT / "app"


@lru_cache(maxsize=1)
def _shared_module():
    if str(INSURANCE_APP) not in sys.path:
        sys.path.insert(0, str(INSURANCE_APP))
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with open(os.devnull, "w") as devnull:
            with contextlib.redirect_stdout(devnull), contextlib.redirect_stderr(devnull):
                import shared  # type: ignore

    return shared


def _money(value: float) -> float:
    return round(float(value), 2)


def _trace(profile: dict[str, Any], pred: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "id": "ins-input",
            "title": "User input form",
            "status": "complete",
            "tool": "page_cost_predictor._profile_form",
            "input": str(profile),
            "output": "Validated profile dictionary",
            "explanation": "The FastAPI endpoint mirrors the Streamlit profile fields: age, BMI, children, sex, region, and smoking status.",
        },
        {
            "id": "ins-route",
            "title": "Block 2 routing",
            "status": "complete",
            "tool": "make_prediction",
            "input": profile["smoker_status"],
            "output": pred["segment"],
            "explanation": "Known smoker status routes directly to a subgroup Random Forest; unknown status uses the logistic classifier probability to blend subgroup predictions.",
        },
        {
            "id": "ins-subgroup",
            "title": "Subgroup regressors",
            "status": "complete",
            "tool": "rf_regressor_smoker / rf_regressor_nonsmoker",
            "input": "Encoded tree features",
            "output": f"smoker=${pred['smoker_cost']:,.0f}, non-smoker=${pred['nonsmoker_cost']:,.0f}",
            "explanation": "The endpoint loads the original saved Random Forest subgroup model artifacts.",
        },
        {
            "id": "ins-quantile",
            "title": "Uncertainty band",
            "status": "review",
            "tool": "QuantileRegressor q10/q50/q90",
            "input": "Linear encoded features",
            "output": f"${pred['q10']:,.0f} - ${pred['q90']:,.0f}",
            "explanation": "The original app fits quantile models for the 80% interval around the annual cost estimate.",
        },
        {
            "id": "ins-explain",
            "title": "Feature explanation",
            "status": "complete",
            "tool": "feature_importance x median deviation",
            "input": "Tree feature importances and dataset medians",
            "output": f"{len(pred['impacts'])} ranked drivers",
            "explanation": "The original app computes directional local drivers as feature importance multiplied by deviation from the dataset median.",
        },
    ]


def predict_insurance(profile: dict[str, Any]) -> dict[str, Any]:
    shared = _shared_module()
    original_profile = {
        "age": int(profile["age"]),
        "bmi": float(profile["bmi"]),
        "children": int(profile["children"]),
        "sex": profile["sex"],
        "region": profile["region"],
        "smoker_status": profile["smoker_status"],
    }
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with open(os.devnull, "w") as devnull:
            with contextlib.redirect_stdout(devnull), contextlib.redirect_stderr(devnull):
                pred = shared.make_prediction(original_profile)
                comparison = shared.load_comparison_metrics()

    impacts = [
        {
            "feature": row["feature"],
            "label": row["label"],
            "importance": round(float(row["importance"]), 6),
            "impact_score": round(float(row["impact_score"]), 6),
        }
        for row in pred["impacts"].to_dict(orient="records")
    ]
    leaderboard = [
        {
            "model": row["Model"],
            "r2": round(float(row["R2"]), 6),
            "rmse": _money(row["RMSE"]),
            "mae": _money(row["MAE"]),
            "notes": row["Notes"],
        }
        for row in comparison["leaderboard"].to_dict(orient="records")
    ]
    result = {
        "profile": original_profile,
        "model_selector": profile.get("model_selector", "block2_stratified_rf"),
        "prediction": {
            "estimate": _money(pred["estimate"]),
            "q10": _money(pred["q10"]),
            "q50": _money(pred["q50"]),
            "q90": _money(pred["q90"]),
            "smoker_cost": _money(pred["smoker_cost"]),
            "nonsmoker_cost": _money(pred["nonsmoker_cost"]),
            "smoker_probability": round(float(pred["smoker_probability"]), 6),
            "segment": pred["segment"],
            "routing_summary": shared.block2_summary_text(pred),
        },
        "feature_explanation": impacts,
        "model_comparison": leaderboard,
    }
    return {
        "ok": True,
        "mode": "live_original_wrapper",
        "project": "Insurance Cost Predictor",
        "input": original_profile,
        "trace": _trace(original_profile, pred),
        "result": result,
        "limitations": [
            "This wraps the original Streamlit shared.py inference logic; Streamlit UI rendering is not used.",
            "Feature impacts are the original heuristic, not formal SHAP values.",
            "Predictions are project outputs and should not be used for real underwriting or pricing decisions.",
        ],
        "provenance": {
            "source": "original_projects/Insurance-Cost-Predictor/app/shared.py",
            "models": [
                "saved_models/rf_regressor_smoker.pkl",
                "saved_models/rf_regressor_nonsmoker.pkl",
                "saved_models/lr_smoker_classifier.pkl",
                "quantile regressors fitted via original shared.load_quantile_assets",
            ],
            "wrapped_functions": [
                "make_prediction",
                "block2_summary_text",
                "load_comparison_metrics",
            ],
        },
    }
