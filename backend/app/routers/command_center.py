from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime
from ..database import get_alerts_col, get_tasks_col, get_approvals_col
from ..models import TaskCreateRequest, TaskUpdateRequest, ApprovalDecisionRequest

router = APIRouter(prefix="/command_center", tags=["Human + AI + Automation Command Center"])

# ----------------- Alerts -----------------
@router.get("/alerts")
def list_alerts() -> List[Dict[str, Any]]:
    col = get_alerts_col()
    return list(col.find({}, {"_id": 0}).sort("timestamp", -1))

@router.put("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str) -> Dict[str, Any]:
    col = get_alerts_col()
    col.update_one({"alert_id": alert_id}, {"$set": {"status": "acknowledged"}})
    return {"success": True, "alert_id": alert_id, "status": "acknowledged"}

# ----------------- Management Tasks -----------------
@router.get("/tasks")
def list_tasks() -> List[Dict[str, Any]]:
    col = get_tasks_col()
    return list(col.find({}, {"_id": 0}).sort("created_at", -1))

@router.post("/tasks")
def create_task(payload: TaskCreateRequest) -> Dict[str, Any]:
    col = get_tasks_col()
    task_id = f"TSK_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    new_doc = {
        "task_id": task_id,
        "title": payload.title,
        "description": payload.description,
        "task_type": payload.task_type,
        "priority": payload.priority,
        "area_id": payload.area_id,
        "area_name": payload.area_name,
        "assigned_to": payload.assigned_to,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "status": "pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "completed_at": None
    }
    col.insert_one(new_doc)
    new_doc.pop("_id", None)
    return {"success": True, "task": new_doc}

@router.put("/tasks/{task_id}/status")
def update_task_status(task_id: str, payload: TaskUpdateRequest) -> Dict[str, Any]:
    col = get_tasks_col()
    update_data: Dict[str, Any] = {"status": payload.status}
    if payload.status == "completed":
        update_data["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    col.update_one({"task_id": task_id}, {"$set": update_data})
    return {"success": True, "task_id": task_id, "status": payload.status}

# ----------------- Approvals (Human-in-the-Loop) -----------------
@router.get("/approvals")
def list_approvals() -> List[Dict[str, Any]]:
    col = get_approvals_col()
    return list(col.find({}, {"_id": 0}).sort("created_at", -1))

@router.post("/approvals/decide")
def decide_approval(payload: ApprovalDecisionRequest) -> Dict[str, Any]:
    col = get_approvals_col()
    approval = col.find_one({"approval_id": payload.approval_id})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    decided_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_data = {
        "decision": payload.decision,
        "approver_name": payload.approver_name,
        "decision_notes": payload.notes,
        "decided_at": decided_at
    }
    col.update_one({"approval_id": payload.approval_id}, {"$set": update_data})

    return {
        "success": True,
        "approval_id": payload.approval_id,
        "decision": payload.decision,
        "decided_at": decided_at,
        "message": f"Recommendation successfully {payload.decision} by {payload.approver_name}."
    }

# ----------------- Section 9: AI Water Conservation Recommendations -----------------
@router.get("/recommendations")
def get_ai_recommendations() -> List[Dict[str, Any]]:
    return [
        {
            "id": "REC_01",
            "category": "Supply Planning",
            "title": "Prepare supplementary reservoir discharge for T. Nagar & Anna Nagar",
            "reason": "AI forecasting indicates a 14.8% domestic and commercial peak during upcoming weekend festivals.",
            "supporting_data": "Historical 7-day moving average consumption rising from 280L to 325L per household.",
            "impact": "Averts pressure drops in terminal feeder pipes across Zone 9.",
            "requires_approval": True
        },
        {
            "id": "REC_02",
            "category": "Household Conservation",
            "title": "Dispatch automated conservation advisory to top 10% high-consumption households",
            "reason": "Meters showing >450 Liters/day during non-event weekdays represent 22% of total domestic extraction.",
            "supporting_data": "7 households identified in HH dataset exceeding 420 Liters daily threshold.",
            "impact": "Targeted 10-15% voluntary reduction without impacting essential needs.",
            "requires_approval": True
        },
        {
            "id": "REC_03",
            "category": "Rainfall Resilience",
            "title": "Synchronize Poondi and Chembarambakkam reservoir storage with IMD monsoon outlook",
            "reason": "15-year cyclical analysis reveals post-monsoon surplus followed by sharp pre-summer drawdown.",
            "supporting_data": "Current multi-reservoir storage aggregate is at 68.2% capacity (7,460 / 11,257 Mcft).",
            "impact": "Maintains 120-day buffer supply for Greater Chennai Corporation.",
            "requires_approval": False
        },
        {
            "id": "REC_04",
            "category": "Event Demand Readiness",
            "title": "Pre-stage auxiliary water storage for Adyar Coastal Marathon",
            "reason": "Predicted attendee load (12,000 runners) will demand an additional 420,000 Liters over 8 hours.",
            "supporting_data": "Per-capita event coefficient calculated at 35 Liters/attendee.",
            "impact": "Prevents localized localized deficit near Besant Nagar distribution node.",
            "requires_approval": True
        }
    ]

