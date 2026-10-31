from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime
from ..database import get_events_col, get_areas_col, get_households_col
from ..models import EventCreateRequest
from ..ml_engine import ml_engine

router = APIRouter(prefix="/events", tags=["Event-based Water Demand Management"])

@router.get("")
def list_events() -> List[Dict[str, Any]]:
    col = get_events_col()
    return list(col.find({}, {"_id": 0}).sort("event_date", 1))

@router.post("")
def create_event(payload: EventCreateRequest) -> Dict[str, Any]:
    col = get_events_col()
    areas_col = get_areas_col()
    hh_col = get_households_col()

    # Determine baseline daily consumption for the selected area
    assigned_hh = list(hh_col.find({"area_id": payload.area_id}, {"daily_consumption": 1}))
    if assigned_hh:
        base_demand = sum(h.get("daily_consumption", 250.0) for h in assigned_hh)
    else:
        area_doc = areas_col.find_one({"area_id": payload.area_id})
        base_demand = (area_doc.get("baseline_demand_mld", 40.0) * 1000) if area_doc else 35000.0

    # Call AI event prediction engine
    ai_calc = ml_engine.predict_event_demand(
        base_daily_demand=base_demand,
        extra_attendees=payload.expected_participants,
        duration_days=payload.duration_days
    )

    event_id = f"EVT_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    event_doc = {
        "event_id": event_id,
        "name": payload.name,
        "area_id": payload.area_id,
        "area_name": payload.area_name,
        "event_date": payload.event_date,
        "duration_days": payload.duration_days,
        "expected_participants": payload.expected_participants,
        "expected_normal_demand_liters": ai_calc["expected_normal_demand_liters"],
        "additional_event_demand_liters": ai_calc["additional_event_demand_liters"],
        "total_predicted_demand_liters": ai_calc["total_predicted_demand_liters"],
        "available_supply_liters": round(ai_calc["total_predicted_demand_liters"] * 1.25, 1),
        "demand_pressure_risk": ai_calc["demand_pressure_risk"],
        "ai_recommendations": ai_calc["ai_recommendations"],
        "status": "Upcoming",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    col.insert_one(event_doc)
    # Exclude _id from returned response
    event_doc.pop("_id", None)
    return {
        "success": True,
        "event": event_doc
    }

