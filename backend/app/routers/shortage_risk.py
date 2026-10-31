from fastapi import APIRouter
from typing import Dict, Any, List
from ..database import get_areas_col, get_households_col, get_water_readings_col, get_reservoirs_col, get_rainfall_col
from ..ml_engine import ml_engine

router = APIRouter(prefix="/shortage_risk", tags=["Shortage Risk Analysis"])

@router.get("/areas")
def get_area_risk_assessments() -> List[Dict[str, Any]]:
    areas_col = get_areas_col()
    hh_col = get_households_col()
    res_col = get_reservoirs_col()
    rain_col = get_rainfall_col()

    areas = list(areas_col.find({}, {"_id": 0}))
    if not areas:
        return []

    # Get latest annual rainfall departure
    latest_rain = rain_col.find_one(sort=[("year", -1)])
    annual_departure = latest_rain.get("departure_percent", -6.0) if latest_rain else -6.0

    # Get overall reservoir capacity percentage
    reservoirs = list(res_col.find({}, {"_id": 0}))
    total_cap = sum(r.get("storage_capacity_mcft", 0) for r in reservoirs)
    total_cur = sum(r.get("current_storage_mcft", 0) for r in reservoirs)
    storage_pct = (total_cur / total_cap * 100) if total_cap else 65.0

    assessments = []
    for area in areas:
        area_id = area["area_id"]
        area_name = area["name"]

        # Calculate consumption of households assigned to this area
        assigned_households = list(hh_col.find({"area_id": area_id}, {"daily_consumption": 1, "predicted_future_consumption": 1}))
        if assigned_households:
            curr_cons = sum(h.get("daily_consumption", 250.0) for h in assigned_households)
            pred_cons = sum(h.get("predicted_future_consumption", curr_cons * 1.05) for h in assigned_households)
        else:
            # Baseline estimation from area population / MLD
            curr_cons = area.get("baseline_demand_mld", 40.0) * 1000 # Scaling representation
            pred_cons = curr_cons * 1.06

        assessment = ml_engine.assess_area_shortage_risk(
            area_name=area_name,
            current_daily_consumption=curr_cons,
            predicted_daily_demand=pred_cons,
            annual_rainfall_departure=annual_departure,
            reservoir_storage_pct=storage_pct
        )

        assessment["area_id"] = area_id
        assessment["centroid_lat"] = area.get("centroid_lat")
        assessment["centroid_lng"] = area.get("centroid_lng")
        assessment["polygon_coordinates"] = area.get("polygon_coordinates")
        assessment["population"] = area.get("population", 350000)
        assessment["registered_households_count"] = len(assigned_households)

        # Available water stock if known from local distribution points
        assessment["available_water_liters"] = round(curr_cons * 1.35, 1)

        assessments.append(assessment)

    return assessments

@router.get("/summary")
def get_risk_summary() -> Dict[str, Any]:
    assessments = get_area_risk_assessments()
    high_count = sum(1 for a in assessments if a["ai_risk_level"] == "High Risk")
    medium_count = sum(1 for a in assessments if a["ai_risk_level"] == "Medium Risk")
    low_count = sum(1 for a in assessments if a["ai_risk_level"] == "Low Risk")
    normal_count = sum(1 for a in assessments if a["ai_risk_level"] == "Normal")

    avg_score = sum(a["risk_score_pct"] for a in assessments) / len(assessments) if assessments else 0.0

    return {
        "total_monitored_zones": len(assessments),
        "district_risk_index_score": round(avg_score, 1),
        "district_status": "High Attention" if high_count > 0 else "Moderate Resilience" if medium_count > 0 else "Stable Reservoir Buffer",
        "breakdown": {
            "high_risk_areas": high_count,
            "medium_risk_areas": medium_count,
            "low_risk_areas": low_count,
            "normal_areas": normal_count
        },
        "advisory_bulletin": "Monsoon storage across Chembarambakkam and Puzhal remains healthy (~70%). Demand surge in commercial hubs (T. Nagar) is managed via off-peak booster regulation."
    }

