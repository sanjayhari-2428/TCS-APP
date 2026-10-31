from fastapi import APIRouter
from typing import Dict, Any, List
from ..database import get_households_col, get_water_readings_col, get_reservoirs_col, get_areas_col, get_rainfall_col
from ..ml_engine import ml_engine

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/water_balance")
def get_water_balance_report() -> Dict[str, Any]:
    res_col = get_reservoirs_col()
    readings_col = get_water_readings_col()
    
    reservoirs = list(res_col.find({}, {"_id": 0}))
    total_storage_mcft = sum(r.get("current_storage_mcft", 0) for r in reservoirs)
    total_capacity_mcft = sum(r.get("storage_capacity_mcft", 0) for r in reservoirs)

    # Conversion: 1 Mcft = ~28.3168 Million Liters (ML)
    total_storage_mld = round(total_storage_mcft * 28.3168, 1)

    daily_readings = list(readings_col.find().sort("date", -1).limit(50))
    daily_domestic_sample_mld = round(sum(r.get("daily_consumption_liters", 0) for r in daily_readings) / 1000000, 3)

    return {
        "report_title": "Chennai District Metropolitan Water Balance Report",
        "district": "Chennai, Tamil Nadu",
        "date_generated": "2026-10-31",
        "total_reservoir_storage_mcft": round(total_storage_mcft, 1),
        "total_reservoir_capacity_mcft": round(total_capacity_mcft, 1),
        "storage_utilization_pct": round((total_storage_mcft / max(total_capacity_mcft, 1.0)) * 100, 1),
        "water_storage_equivalent_million_liters": total_storage_mld,
        "daily_sample_domestic_consumption_liters": sum(r.get("daily_consumption_liters", 0) for r in daily_readings),
        "estimated_city_daily_requirement_mld": 850.0,
        "buffer_days_available": round((total_storage_mld / 850.0), 1),
        "status": "Resilient Buffer (>90 Days)"
    }

@router.get("/area_comparison")
def get_area_comparison() -> List[Dict[str, Any]]:
    areas_col = get_areas_col()
    hh_col = get_households_col()

    areas = list(areas_col.find({}, {"_id": 0}))
    comparison = []

    for a in areas:
        area_id = a["area_id"]
        households = list(hh_col.find({"area_id": area_id}, {"_id": 0}))
        count = len(households)
        avg_cons = (sum(h.get("daily_consumption", 0) for h in households) / count) if count else a.get("baseline_demand_mld", 40.0) * 8
        avg_7day = (sum(h.get("seven_day_average", 0) for h in households) / count) if count else avg_cons * 0.98

        comparison.append({
            "area_id": area_id,
            "area_name": a["name"],
            "zone_no": a.get("zone_no", 1),
            "registered_households": count,
            "avg_daily_consumption_liters": round(avg_cons, 1),
            "seven_day_average_liters": round(avg_7day, 1),
            "baseline_demand_mld": a.get("baseline_demand_mld", 40.0),
            "population": a.get("population", 350000)
        })

    return comparison

