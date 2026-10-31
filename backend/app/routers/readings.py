import io
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import Dict, Any, List, Optional
from ..database import get_water_readings_col, get_households_col
from ..ml_engine import ml_engine

router = APIRouter(prefix="/readings", tags=["Water Readings & Live Monitoring"])

@router.get("")
def list_readings(
    household_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0)
) -> Dict[str, Any]:
    col = get_water_readings_col()
    query: Dict[str, Any] = {}

    if household_id:
        query["household_id"] = household_id.upper()
    if date:
        query["date"] = date

    total = col.count_documents(query)
    cursor = col.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(limit)

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "records": list(cursor)
    }

@router.get("/monitoring_stats")
def get_monitoring_stats() -> Dict[str, Any]:
    col = get_water_readings_col()
    
    # Latest day statistics
    latest_doc = col.find_one(sort=[("date", -1)])
    latest_date = latest_doc["date"] if latest_doc else "2026-09-28"

    recent = list(col.find({"date": latest_date}, {"_id": 0}))
    if not recent:
        return {"error": "No readings found"}

    tank_levels = [r.get("tank_level_percent", 50.0) for r in recent if "tank_level_percent" in r]
    pressures = [r.get("average_pressure_bar", 3.8) for r in recent if "average_pressure_bar" in r]
    flow_rates = [r.get("average_flow_liters_per_hour", 10.0) for r in recent if "average_flow_liters_per_hour" in r]
    consumptions = [r.get("daily_consumption_liters", 250.0) for r in recent if "daily_consumption_liters" in r]

    # Tank level buckets
    critical_low_tanks = sum(1 for t in tank_levels if t < 25)
    moderate_tanks = sum(1 for t in tank_levels if 25 <= t < 65)
    healthy_tanks = sum(1 for t in tank_levels if t >= 65)

    return {
        "date": latest_date,
        "reporting_meters_count": len(recent),
        "total_instantaneous_consumption_liters": round(sum(consumptions), 1),
        "avg_meter_consumption_liters": round(sum(consumptions) / len(consumptions), 1),
        "avg_system_pressure_bar": round(sum(pressures) / len(pressures), 2) if pressures else 3.8,
        "avg_distribution_flow_rate_lph": round(sum(flow_rates) / len(flow_rates), 2) if flow_rates else 10.0,
        "avg_storage_tank_level_pct": round(sum(tank_levels) / len(tank_levels), 1) if tank_levels else 72.0,
        "tank_distribution": {
            "healthy_above_65_pct": healthy_tanks,
            "moderate_25_to_65_pct": moderate_tanks,
            "low_below_25_pct": critical_low_tanks
        },
        "sample_readings": recent[:15]
    }

@router.post("/import_csv")
async def import_readings_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Import household water consumption CSV with rigorous validation:
    - Missing values
    - Duplicate records
    - Invalid dates
    - Invalid consumption values
    - Excludes any leakage flags
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Check required columns
    required = ["household_id", "date", "daily_consumption_liters"]
    missing_cols = [c for c in required if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {missing_cols}")

    total_rows = len(df)
    
    # 1. Clean leakage flags
    for flag in ["anomaly_flag", "possible_leak_flag"]:
        if flag in df.columns:
            df = df.drop(columns=[flag])

    # 2. Drop duplicates
    df = df.drop_duplicates(subset=["household_id", "date"])
    deduped_rows = len(df)

    # 3. Validate dates
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df = df.dropna(subset=["date"])

    # 4. Validate consumption values (positive non-null)
    df["daily_consumption_liters"] = pd.to_numeric(df["daily_consumption_liters"], errors="coerce")
    df = df[(df["daily_consumption_liters"] >= 0) & (df["daily_consumption_liters"].notnull())]

    valid_rows = len(df)
    if valid_rows == 0:
        raise HTTPException(status_code=400, detail="No valid records remained after data cleaning and validation.")

    # Convert to records and insert
    df["is_sample"] = False
    records = df.to_dict(orient="records")

    col = get_water_readings_col()
    col.insert_many(records)

    # Re-train ML model with updated records
    try:
        all_readings = pd.DataFrame(list(col.find({}, {"_id": 0})))
        ml_engine.train_model(all_readings)
    except Exception as e:
        pass

    return {
        "success": True,
        "filename": file.filename,
        "total_rows_received": total_rows,
        "duplicates_removed": total_rows - deduped_rows,
        "valid_records_imported": valid_rows,
        "message": f"Successfully validated and imported {valid_rows} water consumption records."
    }

