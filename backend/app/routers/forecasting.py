from fastapi import APIRouter, Query
from typing import Dict, Any, List, Optional
from ..ml_engine import ml_engine
from ..database import get_households_col, get_water_readings_col

router = APIRouter(prefix="/forecast", tags=["AI Demand Forecasting"])

@router.get("/demand")
def get_demand_forecast(
    household_id: Optional[str] = Query(None, description="Optional specific household ID"),
    horizon: str = Query("7_day", description="1_day, 7_day, or 30_day")
) -> Dict[str, Any]:
    horizon_days = 1 if horizon == "1_day" else 30 if horizon == "30_day" else 7

    target_hh = household_id.upper() if household_id else None
    predictions = ml_engine.forecast_demand(household_id=target_hh, horizon_days=horizon_days)

    total_predicted = sum(p["predicted_demand_liters"] for p in predictions)
    avg_daily_predicted = total_predicted / max(len(predictions), 1)

    return {
        "scope": f"Household {target_hh}" if target_hh else "Chennai District Aggregated (Sample 50 Households Coverage)",
        "household_id": target_hh,
        "horizon": horizon,
        "horizon_days": horizon_days,
        "total_predicted_demand_liters": round(total_predicted, 1),
        "average_daily_predicted_liters": round(avg_daily_predicted, 1),
        "model_used": ml_engine.metrics.get("model_type", "Random Forest Regressor"),
        "is_ai_prediction": True,
        "forecast_series": predictions
    }

@router.get("/metrics")
def get_model_metrics() -> Dict[str, Any]:
    return {
        "metrics": ml_engine.metrics,
        "feature_importance": ml_engine.feature_importance,
        "feature_names": ml_engine.feature_names,
        "training_strategy": "Chronological train/test split (80% historical, 20% future test period)",
        "target_variable": "daily_consumption_liters",
        "description": "Supervised Random Forest Regressor calibrated to capture weekly cycle patterns, weather shifts, and household occupancy dynamics."
    }

@router.get("/actual_vs_predicted")
def get_actual_vs_predicted() -> List[Dict[str, Any]]:
    return ml_engine.actual_vs_predicted

