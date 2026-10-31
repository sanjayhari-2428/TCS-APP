from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ..database import Database, settings
from ..seed_data import seed_database
from ..ml_engine import ml_engine

router = APIRouter(prefix="/settings", tags=["Settings & System Health"])

class MongoConfigRequest(BaseModel):
    mongo_uri: str
    db_name: Optional[str] = "aquaguard_ai_chennai"

class ThresholdConfigRequest(BaseModel):
    high_consumption_threshold_liters: float = 380.0
    low_reservoir_threshold_pct: float = 35.0
    tariff_inr_per_1000_liters: float = 10.0

# In-memory settings state
runtime_thresholds = {
    "high_consumption_threshold_liters": 380.0,
    "low_reservoir_threshold_pct": 35.0,
    "tariff_inr_per_1000_liters": 10.0,
    "demonstration_mode": True
}

@router.get("/status")
def get_system_status() -> Dict[str, Any]:
    db = Database.db
    collections = [
        "households", "water_readings", "rainfall_data", "forecasts", "areas",
        "household_locations", "reservoirs", "water_distribution_points", "events",
        "alerts", "management_tasks", "approvals", "users"
    ]
    counts = {}
    if db is not None:
        for c in collections:
            try:
                counts[c] = db[c].count_documents({})
            except Exception:
                counts[c] = 0

    return {
        "status": "healthy",
        "database_type": "Live MongoDB Server" if Database.is_live_mongo else "Embedded Mock MongoDB Engine (Ready for Local / Atlas MongoDB)",
        "is_live_mongo": Database.is_live_mongo,
        "database_name": settings.DB_NAME,
        "configured_mongo_uri": settings.MONGO_URI,
        "collections": counts,
        "ml_engine_trained": ml_engine.is_trained,
        "ml_model": ml_engine.metrics.get("model_type", "Random Forest Regressor"),
        "thresholds": runtime_thresholds
    }

@router.post("/update_mongo")
def update_mongo_connection(payload: MongoConfigRequest) -> Dict[str, Any]:
    try:
        Database.connect(uri=payload.mongo_uri)
        # Reseed if newly connected
        seed_database(force_reseed=False)
        return {
            "success": True,
            "message": f"Successfully reconnected to MongoDB: {Database.is_live_mongo}",
            "is_live_mongo": Database.is_live_mongo
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to MongoDB URI: {str(e)}")

@router.post("/update_thresholds")
def update_thresholds(payload: ThresholdConfigRequest) -> Dict[str, Any]:
    runtime_thresholds["high_consumption_threshold_liters"] = payload.high_consumption_threshold_liters
    runtime_thresholds["low_reservoir_threshold_pct"] = payload.low_reservoir_threshold_pct
    runtime_thresholds["tariff_inr_per_1000_liters"] = payload.tariff_inr_per_1000_liters
    return {
        "success": True,
        "message": "System threshold rules updated successfully.",
        "thresholds": runtime_thresholds
    }

@router.post("/reseed")
def trigger_reseed() -> Dict[str, Any]:
    seed_database(force_reseed=True)
    return {
        "success": True,
        "message": "Database reseeded and AI Random Forest model recalibrated."
    }

