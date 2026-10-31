from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Household & Location -----------------
class HouseholdLocationModel(BaseModel):
    household_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    verified: bool = False
    assigned_by: Optional[str] = "Admin"
    assigned_at: Optional[str] = None
    notes: Optional[str] = ""

class HouseholdModel(BaseModel):
    household_id: str
    occupants: int
    name: Optional[str] = None
    area_id: Optional[str] = None
    area_name: Optional[str] = "Unassigned (Chennai)"
    address: Optional[str] = None
    status: str = "Active"
    daily_consumption: Optional[float] = 0.0
    monthly_consumption: Optional[float] = 0.0
    seven_day_average: Optional[float] = 0.0
    predicted_future_consumption: Optional[float] = 0.0
    estimated_bill_inr: Optional[float] = 0.0
    consumption_status: Optional[str] = "Normal" # Normal, High, Very High
    has_verified_coordinates: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AssignLocationRequest(BaseModel):
    household_id: str
    latitude: float
    longitude: float
    area_id: str
    area_name: str
    notes: Optional[str] = ""

# ----------------- Water Readings -----------------
# Strictly NO leakage detection fields (anomaly_flag, possible_leak_flag excluded)
class WaterReadingModel(BaseModel):
    household_id: str
    date: str
    day_of_week: str
    occupants: int
    event_flag: int = 0
    event_extra_people: int = 0
    temperature_c: float
    rainfall_mm: float
    daily_consumption_liters: float
    cumulative_meter_reading_liters: float
    average_flow_liters_per_hour: float
    average_pressure_bar: float
    tank_level_percent: float
    tariff_inr_per_1000_liters: float = 10.0
    estimated_daily_bill_inr: float
    consumption_previous_day_liters: Optional[float] = None
    consumption_7day_average_liters: Optional[float] = None
    is_sample: bool = True

# ----------------- Rainfall & Weather -----------------
class RainfallRecordModel(BaseModel):
    year: int
    rainfall_mm: float
    normal_rainfall_mm: float = 1400.0
    departure_percent: float
    status: str # Normal, Excess, Deficit
    rainy_days: int
    notes: Optional[str] = ""

# ----------------- Reservoirs -----------------
class ReservoirModel(BaseModel):
    reservoir_id: str
    name: str
    location: str
    latitude: float
    longitude: float
    current_level_ft: float
    max_level_ft: float
    storage_capacity_mcft: float
    current_storage_mcft: float
    available_volume_pct: float
    status: str # Normal (Green), Moderate (Yellow), Low (Red)
    inflow_cusecs: Optional[float] = 0.0
    outflow_cusecs: Optional[float] = 0.0
    last_updated: Optional[str] = None

class ReservoirCreateUpdateRequest(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    current_level_ft: float
    max_level_ft: float
    storage_capacity_mcft: float
    current_storage_mcft: float
    inflow_cusecs: Optional[float] = 0.0
    outflow_cusecs: Optional[float] = 0.0

# ----------------- Distribution Points -----------------
class WaterDistributionPointModel(BaseModel):
    point_id: str
    name: str
    type: str # overhead_tank, booster_station, distribution_node, filling_point
    latitude: float
    longitude: float
    capacity_liters: float
    current_volume_liters: float
    status: str # Active, Maintenance, Low Supply
    area_id: str
    area_name: str

# ----------------- Events -----------------
class EventModel(BaseModel):
    event_id: str
    name: str
    area_id: str
    area_name: str
    event_date: str
    duration_days: int
    expected_participants: int
    expected_normal_demand_liters: float
    additional_event_demand_liters: float
    total_predicted_demand_liters: float
    available_supply_liters: Optional[float] = None
    demand_pressure_risk: str # Normal, Low Risk, Medium Risk, High Risk
    ai_recommendations: List[str] = []
    status: str = "Upcoming" # Upcoming, Ongoing, Concluded, Cancelled
    created_at: Optional[str] = None

class EventCreateRequest(BaseModel):
    name: str
    area_id: str
    area_name: str
    event_date: str
    duration_days: int = 1
    expected_participants: int

# ----------------- Alerts & Tasks -----------------
class AlertModel(BaseModel):
    alert_id: str
    type: str # high_consumption, shortage_pressure, reservoir_low, event_surge
    severity: str # info, warning, critical
    area_id: Optional[str] = None
    household_id: Optional[str] = None
    title: str
    message: str
    metric_value: Optional[float] = None
    threshold_value: Optional[float] = None
    timestamp: str
    status: str = "active" # active, acknowledged, resolved

class ManagementTaskModel(BaseModel):
    task_id: str
    title: str
    description: str
    task_type: str # redistribute_supply, tanker_dispatch, conservation_drive, pressure_tuning, event_supply_prep
    priority: str # low, medium, high, urgent
    area_id: str
    area_name: str
    assigned_to: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "pending" # pending, in_progress, completed, cancelled
    created_at: str
    completed_at: Optional[str] = None

class TaskCreateRequest(BaseModel):
    title: str
    description: str
    task_type: str
    priority: str
    area_id: str
    area_name: str
    assigned_to: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TaskUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = ""

# ----------------- Approvals -----------------
class ApprovalModel(BaseModel):
    approval_id: str
    task_id: Optional[str] = None
    recommendation_id: Optional[str] = None
    title: str
    description: str
    impact_summary: str
    proposed_by: str = "AI Resilience Engine"
    approver_name: Optional[str] = None
    decision: str = "pending" # pending, approved, rejected
    decision_notes: Optional[str] = ""
    decided_at: Optional[str] = None
    created_at: str

class ApprovalDecisionRequest(BaseModel):
    approval_id: str
    decision: str # approved, rejected
    approver_name: str
    notes: Optional[str] = ""

# ----------------- Forecasts & Risk -----------------
class ForecastHorizonItem(BaseModel):
    date: str
    predicted_demand_liters: float
    confidence_lower: float
    confidence_upper: float

class DemandForecastResponse(BaseModel):
    household_id: Optional[str] = None
    area_id: Optional[str] = None
    horizon: str
    forecast_data: List[ForecastHorizonItem]
    metrics: Dict[str, Any]
    feature_importance: Dict[str, float]

class ShortageRiskArea(BaseModel):
    area_id: str
    area_name: str
    current_consumption_liters: float
    predicted_demand_liters: float
    rainfall_info: Dict[str, Any]
    available_water_liters: Optional[float] = None
    ai_risk_level: str # Normal, Low Risk, Medium Risk, High Risk
    risk_score_pct: float
    explanation: str
    recommended_action: str
    is_exact_supply_known: bool

