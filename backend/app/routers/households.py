from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..database import (
    get_households_col,
    get_household_locations_col,
    get_water_readings_col,
    get_areas_col
)
from ..models import AssignLocationRequest

router = APIRouter(prefix="/households", tags=["Households"])

@router.get("")
def list_households(
    search: Optional[str] = Query(None, description="Search by household ID"),
    consumption_status: Optional[str] = Query(None, description="Filter: Normal, High, Very High"),
    area_id: Optional[str] = Query(None, description="Filter by Chennai area ID"),
    verified_only: Optional[bool] = Query(None, description="Filter only with verified GPS coordinates")
) -> List[Dict[str, Any]]:
    col = get_households_col()
    query: Dict[str, Any] = {}

    if search:
        query["household_id"] = {"$regex": search.strip(), "$options": "i"}
    if consumption_status and consumption_status != "all":
        query["consumption_status"] = consumption_status
    if area_id and area_id != "all":
        query["area_id"] = area_id
    if verified_only is not None:
        query["has_verified_coordinates"] = verified_only

    cursor = col.find(query, {"_id": 0}).sort("household_id", 1)
    return list(cursor)

@router.get("/{household_id}")
def get_household_details(household_id: str) -> Dict[str, Any]:
    col = get_households_col()
    readings_col = get_water_readings_col()

    household = col.find_one({"household_id": household_id.upper()}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail=f"Household {household_id} not found")

    # Fetch recent readings for this household
    history = list(readings_col.find(
        {"household_id": household_id.upper()},
        {"_id": 0, "date": 1, "daily_consumption_liters": 1, "temperature_c": 1, "rainfall_mm": 1, "tank_level_percent": 1}
    ).sort("date", 1))

    household["reading_history"] = history[-30:] # Last 30 days
    return household

@router.put("/{household_id}/location")
def assign_household_location(household_id: str, payload: AssignLocationRequest) -> Dict[str, Any]:
    """
    Admin interface to assign or update verified GPS coordinates and Chennai area.
    Ensures no fake coordinates are invented.
    """
    hh_col = get_households_col()
    loc_col = get_household_locations_col()
    area_col = get_areas_col()

    h_id = household_id.upper()
    existing = hh_col.find_one({"household_id": h_id})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Household {h_id} not found")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update or insert into household_locations
    location_doc = {
        "household_id": h_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "area_id": payload.area_id,
        "area_name": payload.area_name,
        "verified": True,
        "assigned_by": "Administrator",
        "assigned_at": now_str,
        "notes": payload.notes or "Coordinates verified and registered via Admin Portal"
    }
    loc_col.update_one({"household_id": h_id}, {"$set": location_doc}, upsert=True)

    # Update household document
    hh_col.update_one(
        {"household_id": h_id},
        {"$set": {
            "has_verified_coordinates": True,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "area_id": payload.area_id,
            "area_name": payload.area_name
        }}
    )

    return {
        "success": True,
        "message": f"Verified GPS coordinates successfully assigned to household {h_id}.",
        "location": location_doc
    }

