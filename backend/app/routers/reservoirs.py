from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime
from ..database import get_reservoirs_col, get_distribution_points_col
from ..models import ReservoirCreateUpdateRequest

router = APIRouter(prefix="/reservoirs", tags=["Reservoirs & Water Distribution"])

@router.get("")
def list_reservoirs() -> List[Dict[str, Any]]:
    col = get_reservoirs_col()
    return list(col.find({}, {"_id": 0}))

@router.post("")
def add_reservoir(payload: ReservoirCreateUpdateRequest) -> Dict[str, Any]:
    col = get_reservoirs_col()
    
    # Calculate volume percentage and status
    pct = round((payload.current_storage_mcft / max(payload.storage_capacity_mcft, 1.0)) * 100, 1)
    status = "Normal" if pct >= 60 else "Moderate" if pct >= 30 else "Low"
    res_id = f"RES_{payload.name.upper().replace(' ', '_')[:16]}"

    new_doc = {
        "reservoir_id": res_id,
        "name": payload.name,
        "location": payload.location,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "current_level_ft": payload.current_level_ft,
        "max_level_ft": payload.max_level_ft,
        "storage_capacity_mcft": payload.storage_capacity_mcft,
        "current_storage_mcft": payload.current_storage_mcft,
        "available_volume_pct": pct,
        "status": status,
        "inflow_cusecs": payload.inflow_cusecs,
        "outflow_cusecs": payload.outflow_cusecs,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    col.update_one({"reservoir_id": res_id}, {"$set": new_doc}, upsert=True)
    return {"success": True, "reservoir": new_doc}

@router.put("/{reservoir_id}")
def update_reservoir(reservoir_id: str, payload: ReservoirCreateUpdateRequest) -> Dict[str, Any]:
    col = get_reservoirs_col()
    existing = col.find_one({"reservoir_id": reservoir_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Reservoir not found")

    pct = round((payload.current_storage_mcft / max(payload.storage_capacity_mcft, 1.0)) * 100, 1)
    status = "Normal" if pct >= 60 else "Moderate" if pct >= 30 else "Low"

    update_fields = {
        "name": payload.name,
        "location": payload.location,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "current_level_ft": payload.current_level_ft,
        "max_level_ft": payload.max_level_ft,
        "storage_capacity_mcft": payload.storage_capacity_mcft,
        "current_storage_mcft": payload.current_storage_mcft,
        "available_volume_pct": pct,
        "status": status,
        "inflow_cusecs": payload.inflow_cusecs,
        "outflow_cusecs": payload.outflow_cusecs,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    col.update_one({"reservoir_id": reservoir_id}, {"$set": update_fields})
    return {"success": True, "reservoir_id": reservoir_id, "updated": update_fields}

@router.get("/distribution_points")
def list_distribution_points() -> List[Dict[str, Any]]:
    col = get_distribution_points_col()
    return list(col.find({}, {"_id": 0}))

