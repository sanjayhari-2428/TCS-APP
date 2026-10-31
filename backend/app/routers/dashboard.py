from fastapi import APIRouter
from typing import Dict, Any, List
import pandas as pd
from ..database import (
    get_households_col,
    get_water_readings_col,
    get_rainfall_col,
    get_areas_col,
    get_reservoirs_col
)
from ..ml_engine import ml_engine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_dashboard_metrics() -> Dict[str, Any]:
    households_col = get_households_col()
    readings_col = get_water_readings_col()
    rainfall_col = get_rainfall_col()
    areas_col = get_areas_col()
    res_col = get_reservoirs_col()

    total_households = households_col.count_documents({})
    
    # Calculate daily consumption from latest date in database
    latest_reading = readings_col.find_one(sort=[("date", -1)])
    latest_date = latest_reading["date"] if latest_reading else "2026-09-28"

    recent_readings = list(readings_col.find({"date": latest_date}, {"_id": 0}))
    total_daily = sum(r.get("daily_consumption_liters", 0) for r in recent_readings)
    avg_household = (total_daily / len(recent_readings)) if recent_readings else 0.0

    # Monthly consumption across all households (sum of last 30 distinct dates)
    dates_cursor = readings_col.distinct("date")
    sorted_dates = sorted(dates_cursor)
    last_30_dates = sorted_dates[-30:] if len(sorted_dates) >= 30 else sorted_dates
    monthly_readings = list(readings_col.find({"date": {"$in": last_30_dates}}, {"daily_consumption_liters": 1}))
    monthly_consumption = sum(r.get("daily_consumption_liters", 0) for r in monthly_readings)

    # Annual rainfall: latest year
    latest_rain_doc = rainfall_col.find_one(sort=[("year", -1)])
    annual_rainfall = latest_rain_doc.get("rainfall_mm", 1315.8) if latest_rain_doc else 1315.8
    annual_departure = latest_rain_doc.get("departure_percent", -6.0) if latest_rain_doc else -6.0

    # AI Demand forecast next day and next week
    forecast_7d = ml_engine.forecast_demand(horizon_days=7)
    next_day_demand = forecast_7d[0]["predicted_demand_liters"] if forecast_7d else total_daily
    next_week_demand = sum(f["predicted_demand_liters"] for f in forecast_7d) if forecast_7d else total_daily * 7

    # Count high-consumption areas and households
    high_cons_households = households_col.count_documents({"consumption_status": {"$in": ["High", "Very High"]}})
    
    # Reservoir buffer
    reservoirs = list(res_col.find({}, {"_id": 0}))
    total_res_capacity = sum(r.get("storage_capacity_mcft", 0) for r in reservoirs)
    total_res_current = sum(r.get("current_storage_mcft", 0) for r in reservoirs)
    avg_res_pct = round((total_res_current / total_res_capacity * 100), 1) if total_res_capacity else 68.0

    return {
        "total_households": total_households,
        "total_daily_consumption_liters": round(total_daily, 1),
        "avg_household_consumption_liters": round(avg_household, 1),
        "monthly_consumption_liters": round(monthly_consumption, 1),
        "latest_annual_rainfall_mm": round(annual_rainfall, 1),
        "annual_rainfall_departure_pct": round(annual_departure, 1),
        "predicted_next_day_demand_liters": round(next_day_demand, 1),
        "predicted_next_week_demand_liters": round(next_week_demand, 1),
        "water_shortage_risk": "Low to Moderate Risk (Seasonal Equilibrium)",
        "high_consumption_households_count": high_cons_households,
        "active_reservoirs_storage_pct": avg_res_pct,
        "active_reservoirs_count": len(reservoirs),
        "latest_recorded_date": latest_date
    }

@router.get("/daily_trend")
def get_daily_trend(days: int = 45) -> List[Dict[str, Any]]:
    readings_col = get_water_readings_col()
    dates_cursor = sorted(readings_col.distinct("date"))
    selected_dates = dates_cursor[-days:] if len(dates_cursor) >= days else dates_cursor

    pipeline = [
        {"$match": {"date": {"$in": selected_dates}}},
        {"$group": {
            "_id": "$date",
            "total_consumption_liters": {"$sum": "$daily_consumption_liters"},
            "avg_consumption_liters": {"$avg": "$daily_consumption_liters"},
            "avg_temperature_c": {"$avg": "$temperature_c"},
            "avg_rainfall_mm": {"$avg": "$rainfall_mm"}
        }},
        {"$sort": {"_id": 1}}
    ]

    results = list(readings_col.aggregate(pipeline))
    return [
        {
            "date": r["_id"],
            "total_liters": round(r["total_consumption_liters"], 1),
            "avg_liters": round(r["avg_consumption_liters"], 1),
            "temperature_c": round(r.get("avg_temperature_c", 30.0), 1),
            "rainfall_mm": round(r.get("avg_rainfall_mm", 0.0), 1)
        }
        for r in results
    ]

@router.get("/monthly_consumption")
def get_monthly_consumption() -> List[Dict[str, Any]]:
    readings_col = get_water_readings_col()
    records = list(readings_col.find({}, {"date": 1, "daily_consumption_liters": 1, "_id": 0}))
    if not records:
        return []

    df = pd.DataFrame(records)
    df["month"] = df["date"].str.slice(0, 7) # YYYY-MM
    grouped = df.groupby("month")["daily_consumption_liters"].agg(["sum", "mean", "count"]).reset_index()

    month_names = {
        "2026-07": "July 2026",
        "2026-08": "August 2026",
        "2026-09": "September 2026"
    }

    return [
        {
            "month_code": row["month"],
            "month_name": month_names.get(row["month"], row["month"]),
            "total_liters": round(float(row["sum"]), 1),
            "daily_average_liters": round(float(row["mean"]), 1),
            "reading_count": int(row["count"])
        }
        for _, row in grouped.iterrows()
    ]

@router.get("/actual_vs_predicted")
def get_actual_vs_predicted() -> List[Dict[str, Any]]:
    return ml_engine.actual_vs_predicted

@router.get("/rainfall_vs_consumption")
def get_rainfall_vs_consumption() -> List[Dict[str, Any]]:
    readings_col = get_water_readings_col()
    pipeline = [
        {"$group": {
            "_id": "$date",
            "consumption": {"$avg": "$daily_consumption_liters"},
            "rainfall": {"$avg": "$rainfall_mm"},
            "temp": {"$avg": "$temperature_c"}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = list(readings_col.aggregate(pipeline))
    return [
        {
            "date": r["_id"],
            "avg_consumption_liters": round(r["consumption"], 1),
            "rainfall_mm": round(r["rainfall"], 1),
            "temperature_c": round(r["temp"], 1)
        }
        for r in results[-30:] # Last 30 recorded days
    ]

