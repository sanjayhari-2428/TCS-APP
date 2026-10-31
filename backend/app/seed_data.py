import logging
import json
import pandas as pd
from datetime import datetime
from pathlib import Path
from .config import settings
from .database import (
    Database,
    get_households_col,
    get_water_readings_col,
    get_rainfall_col,
    get_areas_col,
    get_household_locations_col,
    get_reservoirs_col,
    get_distribution_points_col,
    get_events_col,
    get_alerts_col,
    get_tasks_col,
    get_approvals_col,
    get_users_col
)
from .ml_engine import ml_engine

logger = logging.getLogger("aquaguard.seed")

def seed_database(force_reseed: bool = False):
    """
    Seeds initial data into MongoDB collections if empty or force_reseed=True.
    """
    Database.connect()
    households_col = get_households_col()
    readings_col = get_water_readings_col()
    rainfall_col = get_rainfall_col()
    areas_col = get_areas_col()
    locs_col = get_household_locations_col()
    res_col = get_reservoirs_col()
    dist_col = get_distribution_points_col()
    events_col = get_events_col()
    alerts_col = get_alerts_col()
    tasks_col = get_tasks_col()
    approvals_col = get_approvals_col()
    users_col = get_users_col()

    if not force_reseed and readings_col.count_documents({}) > 0:
        logger.info("Database already seeded with readings. Initializing ML engine...")
        # Train ML engine from existing data
        df = pd.DataFrame(list(readings_col.find({}, {"_id": 0})))
        if not df.empty:
            ml_engine.train_model(df)
        return

    logger.info("Seeding AquaGuard AI database...")

    # Clear existing collections if force reseed
    if force_reseed:
        for col in [households_col, readings_col, rainfall_col, areas_col, locs_col,
                    res_col, dist_col, events_col, alerts_col, tasks_col, approvals_col, users_col]:
            col.delete_many({})

    # 1. Seed Areas from GeoJSON
    geojson_path = settings.DATA_DIR / "chennai_district_boundary.geojson"
    if geojson_path.exists():
        with open(geojson_path, "r", encoding="utf-8") as f:
            geojson = json.load(f)
        for feat in geojson.get("features", []):
            props = feat.get("properties", {})
            if props.get("type") == "administrative_zone":
                area_doc = {
                    "area_id": props.get("area_id"),
                    "name": props.get("name"),
                    "zone_no": props.get("zone_no"),
                    "centroid_lat": props.get("centroid", [13.08, 80.27])[0],
                    "centroid_lng": props.get("centroid", [13.08, 80.27])[1],
                    "baseline_demand_mld": props.get("baseline_demand_mld", 40.0),
                    "population": props.get("population", 350000),
                    "current_risk_level": "Normal",
                    "polygon_coordinates": feat.get("geometry", {}).get("coordinates", [])
                }
                areas_col.update_one({"area_id": area_doc["area_id"]}, {"$set": area_doc}, upsert=True)
        logger.info(f"Seeded {areas_col.count_documents({})} Chennai administrative zones.")

    # 2. Seed Water Readings & Households from CSV
    csv_path = settings.DATA_DIR / "aquaguard_household_water_dataset.csv"
    if csv_path.exists():
        df_readings = pd.read_csv(csv_path)
        logger.info(f"Reading CSV dataset with {len(df_readings)} rows.")

        # STRICT PRIVACY & TASK COMPLIANCE: Drop leakage flags completely
        cols_to_drop = ["anomaly_flag", "possible_leak_flag"]
        for c in cols_to_drop:
            if c in df_readings.columns:
                df_readings = df_readings.drop(columns=[c])

        # Validate missing dates and consumption
        df_readings = df_readings.dropna(subset=["household_id", "date", "daily_consumption_liters"])
        df_readings["daily_consumption_liters"] = pd.to_numeric(df_readings["daily_consumption_liters"], errors='coerce').fillna(250.0)
        df_readings["is_sample"] = True

        # Insert records into MongoDB in batches
        records = df_readings.to_dict(orient="records")
        readings_col.insert_many(records)
        logger.info(f"Inserted {len(records)} water readings into MongoDB.")

        # Train ML model
        ml_engine.train_model(df_readings)

        # 3. Seed Households Collection from Aggregated Readings
        grouped = df_readings.groupby("household_id")
        
        # Sample verified coordinates for demonstration only (12 households), rest unassigned
        demo_verified_coords = {
            "HH001": {"lat": 13.0418, "lng": 80.2341, "area_id": "AREA_T_NAGAR", "area_name": "T. Nagar (Teynampet)"},
            "HH002": {"lat": 13.0435, "lng": 80.2365, "area_id": "AREA_T_NAGAR", "area_name": "T. Nagar (Teynampet)"},
            "HH003": {"lat": 13.0850, "lng": 80.2101, "area_id": "AREA_ANNA_NAGAR", "area_name": "Anna Nagar"},
            "HH004": {"lat": 13.0872, "lng": 80.2125, "area_id": "AREA_ANNA_NAGAR", "area_name": "Anna Nagar"},
            "HH005": {"lat": 13.0012, "lng": 80.2565, "area_id": "AREA_ADYAR", "area_name": "Adyar"},
            "HH006": {"lat": 13.0035, "lng": 80.2580, "area_id": "AREA_ADYAR", "area_name": "Adyar"},
            "HH007": {"lat": 12.9815, "lng": 80.2180, "area_id": "AREA_VELACHERY", "area_name": "Velachery"},
            "HH008": {"lat": 12.9830, "lng": 80.2205, "area_id": "AREA_VELACHERY", "area_name": "Velachery"},
            "HH009": {"lat": 13.0368, "lng": 80.2676, "area_id": "AREA_MYLAPORE", "area_name": "Mylapore"},
            "HH010": {"lat": 13.0385, "lng": 80.2690, "area_id": "AREA_MYLAPORE", "area_name": "Mylapore"},
            "HH011": {"lat": 13.0067, "lng": 80.2025, "area_id": "AREA_GUINDY", "area_name": "Guindy / Alandur"},
            "HH012": {"lat": 13.0784, "lng": 80.2412, "area_id": "AREA_KILPAUK", "area_name": "Kilpauk"}
        }

        households_list = []
        locations_list = []

        for h_id, group in grouped:
            last_reading = group.sort_values("date").iloc[-1]
            avg_7day = float(last_reading.get("consumption_7day_average_liters", group["daily_consumption_liters"].tail(7).mean()))
            daily_cons = float(last_reading["daily_consumption_liters"])
            monthly_cons = float(group["daily_consumption_liters"].tail(30).sum())
            occupants = int(last_reading["occupants"])
            bill = float(last_reading.get("estimated_daily_bill_inr", daily_cons * 0.01))

            status = "Normal"
            if daily_cons > 400:
                status = "Very High"
            elif daily_cons > 300:
                status = "High"

            has_coords = h_id in demo_verified_coords
            lat = demo_verified_coords[h_id]["lat"] if has_coords else None
            lng = demo_verified_coords[h_id]["lng"] if has_coords else None
            a_id = demo_verified_coords[h_id]["area_id"] if has_coords else None
            a_name = demo_verified_coords[h_id]["area_name"] if has_coords else "Unassigned (Chennai)"

            predicted_cons = round(daily_cons * 1.02, 1)

            hh_doc = {
                "household_id": h_id,
                "name": f"Household {h_id}",
                "occupants": occupants,
                "area_id": a_id,
                "area_name": a_name,
                "status": "Active",
                "daily_consumption": round(daily_cons, 1),
                "monthly_consumption": round(monthly_cons, 1),
                "seven_day_average": round(avg_7day, 1),
                "predicted_future_consumption": predicted_cons,
                "estimated_bill_inr": round(bill * 30, 2), # Monthly bill estimate
                "consumption_status": status,
                "has_verified_coordinates": has_coords,
                "latitude": lat,
                "longitude": lng,
                "is_sample": True
            }
            households_list.append(hh_doc)

            if has_coords:
                loc_doc = {
                    "household_id": h_id,
                    "latitude": lat,
                    "longitude": lng,
                    "area_id": a_id,
                    "area_name": a_name,
                    "verified": True,
                    "assigned_by": "System Demo Setup",
                    "assigned_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "notes": "Verified Demonstration Coordinates in Chennai Zone"
                }
                locations_list.append(loc_doc)

        if households_list:
            households_col.insert_many(households_list)
        if locations_list:
            locs_col.insert_many(locations_list)
        logger.info(f"Seeded {len(households_list)} households ({len(locations_list)} with verified coordinates).")

    # 4. Seed Yearly Rainfall
    annual_rain_path = settings.DATA_DIR / "chennai_annual_rainfall.csv"
    if annual_rain_path.exists():
        df_rain = pd.read_csv(annual_rain_path)
        rainfall_records = df_rain.to_dict(orient="records")
        for rec in rainfall_records:
            rainfall_col.update_one({"year": rec["year"]}, {"$set": rec}, upsert=True)
        logger.info(f"Seeded {len(rainfall_records)} yearly rainfall records.")

    # 5. Seed Reservoirs
    chennai_reservoirs = [
        {
            "reservoir_id": "RES_CHEMBARAMBAKKAM",
            "name": "Chembarambakkam Lake",
            "location": "Kundrathur / Chembarambakkam, Chennai Outer",
            "latitude": 13.0108,
            "longitude": 80.0592,
            "current_level_ft": 21.4,
            "max_level_ft": 24.0,
            "storage_capacity_mcft": 3645.0,
            "current_storage_mcft": 2820.0,
            "available_volume_pct": 77.4,
            "status": "Normal",
            "inflow_cusecs": 320.0,
            "outflow_cusecs": 180.0,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "reservoir_id": "RES_POONDI",
            "name": "Poondi Reservoir (Satyamurthy Sagar)",
            "location": "Poondi, Tiruvallur - Chennai Catchment",
            "latitude": 13.1892,
            "longitude": 79.8606,
            "current_level_ft": 32.1,
            "max_level_ft": 35.0,
            "storage_capacity_mcft": 3231.0,
            "current_storage_mcft": 2150.0,
            "available_volume_pct": 66.5,
            "status": "Normal",
            "inflow_cusecs": 450.0,
            "outflow_cusecs": 210.0,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "reservoir_id": "RES_RED_HILLS",
            "name": "Red Hills Lake (Puzhal Reservoir)",
            "location": "Puzhal, North Chennai",
            "latitude": 13.1873,
            "longitude": 80.1983,
            "current_level_ft": 18.9,
            "max_level_ft": 21.2,
            "storage_capacity_mcft": 3300.0,
            "current_storage_mcft": 2490.0,
            "available_volume_pct": 75.5,
            "status": "Normal",
            "inflow_cusecs": 210.0,
            "outflow_cusecs": 155.0,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "reservoir_id": "RES_CHOLAVARAM",
            "name": "Cholavaram Lake",
            "location": "Cholavaram, North Chennai",
            "latitude": 13.2386,
            "longitude": 80.1558,
            "current_level_ft": 11.2,
            "max_level_ft": 18.8,
            "storage_capacity_mcft": 1081.0,
            "current_storage_mcft": 410.0,
            "available_volume_pct": 37.9,
            "status": "Moderate",
            "inflow_cusecs": 85.0,
            "outflow_cusecs": 60.0,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "reservoir_id": "RES_VEERANAM",
            "name": "Veeranam Lake Transmission",
            "location": "Kattumannarkoil - Chennai Bulk Pipeline",
            "latitude": 11.3328,
            "longitude": 79.5294,
            "current_level_ft": 44.5,
            "max_level_ft": 47.5,
            "storage_capacity_mcft": 1465.0,
            "current_storage_mcft": 890.0,
            "available_volume_pct": 60.8,
            "status": "Normal",
            "inflow_cusecs": 120.0,
            "outflow_cusecs": 90.0,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "reservoir_id": "RES_PORUR",
            "name": "Porur Lake",
            "location": "Porur, West Chennai",
            "latitude": 13.0350,
            "longitude": 80.1528,
            "current_level_ft": 8.5,
            "max_level_ft": 12.0,
            "storage_capacity_mcft": 70.0,
            "current_storage_mcft": 45.0,
            "available_volume_pct": 64.3,
            "status": "Normal",
            "inflow_cusecs": 15.0,
            "outflow_cusecs": 12.0,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
    ]
    for r in chennai_reservoirs:
        res_col.update_one({"reservoir_id": r["reservoir_id"]}, {"$set": r}, upsert=True)
    logger.info(f"Seeded {len(chennai_reservoirs)} Chennai water reservoirs.")

    # 6. Seed Water Distribution Points
    dist_points = [
        {
            "point_id": "WDP_KILPAUK",
            "name": "Kilpauk Water Works Headworks",
            "type": "distribution_node",
            "latitude": 13.0784,
            "longitude": 80.2412,
            "capacity_liters": 270000000.0,
            "current_volume_liters": 215000000.0,
            "status": "Active",
            "area_id": "AREA_KILPAUK",
            "area_name": "Kilpauk"
        },
        {
            "point_id": "WDP_ANNA_NAGAR",
            "name": "Anna Nagar Booster Pumping Station",
            "type": "booster_station",
            "latitude": 13.0850,
            "longitude": 80.2101,
            "capacity_liters": 45000000.0,
            "current_volume_liters": 38000000.0,
            "status": "Active",
            "area_id": "AREA_ANNA_NAGAR",
            "area_name": "Anna Nagar"
        },
        {
            "point_id": "WDP_T_NAGAR",
            "name": "T. Nagar Booster & Distribution Station",
            "type": "overhead_tank",
            "latitude": 13.0418,
            "longitude": 80.2341,
            "capacity_liters": 60000000.0,
            "current_volume_liters": 49000000.0,
            "status": "Active",
            "area_id": "AREA_T_NAGAR",
            "area_name": "T. Nagar (Teynampet)"
        },
        {
            "point_id": "WDP_ADYAR",
            "name": "Adyar Water Headworks & Tank",
            "type": "overhead_tank",
            "latitude": 13.0012,
            "longitude": 80.2565,
            "capacity_liters": 50000000.0,
            "current_volume_liters": 41000000.0,
            "status": "Active",
            "area_id": "AREA_ADYAR",
            "area_name": "Adyar"
        },
        {
            "point_id": "WDP_VELACHERY",
            "name": "Velachery Headworks & Filling Point",
            "type": "filling_point",
            "latitude": 12.9815,
            "longitude": 80.2180,
            "capacity_liters": 35000000.0,
            "current_volume_liters": 28000000.0,
            "status": "Active",
            "area_id": "AREA_VELACHERY",
            "area_name": "Velachery"
        }
    ]
    for p in dist_points:
        dist_col.update_one({"point_id": p["point_id"]}, {"$set": p}, upsert=True)

    # 7. Seed Events
    initial_events = [
        {
            "event_id": "EVT_MARATHON_2026",
            "name": "Chennai Coastal Marathon",
            "area_id": "AREA_ADYAR",
            "area_name": "Adyar / Besant Nagar",
            "event_date": "2026-11-15",
            "duration_days": 1,
            "expected_participants": 12000,
            "expected_normal_demand_liters": 44000.0,
            "additional_event_demand_liters": 420000.0,
            "total_predicted_demand_liters": 464000.0,
            "available_supply_liters": 500000.0,
            "demand_pressure_risk": "Medium Risk",
            "ai_recommendations": [
                "Position 4 dedicated mobile filling tankers near Olcott Memorial.",
                "Advance booster pump operations by 2 hours on event morning."
            ],
            "status": "Upcoming",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "event_id": "EVT_MARGAZHI_FEST",
            "name": "Margazhi Music & Dance Festival",
            "area_id": "AREA_MYLAPORE",
            "area_name": "Mylapore",
            "event_date": "2026-12-18",
            "duration_days": 15,
            "expected_participants": 8500,
            "expected_normal_demand_liters": 41500.0,
            "additional_event_demand_liters": 297500.0,
            "total_predicted_demand_liters": 339000.0,
            "available_supply_liters": 380000.0,
            "demand_pressure_risk": "Low Risk",
            "ai_recommendations": [
                "Coordinate with sabhas for timed restroom and fountain operations.",
                "Ensure local pipeline pressure is maintained above 3.5 bar."
            ],
            "status": "Upcoming",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
    ]
    for evt in initial_events:
        events_col.update_one({"event_id": evt["event_id"]}, {"$set": evt}, upsert=True)

    # 8. Seed Alerts
    initial_alerts = [
        {
            "alert_id": "ALT_T_NAGAR_SURGE",
            "type": "high_consumption",
            "severity": "warning",
            "area_id": "AREA_T_NAGAR",
            "household_id": None,
            "title": "T. Nagar Commercial Weekend Demand Spike",
            "message": "Aggregate water demand in T. Nagar exceeded seasonal 7-day baseline by 18.4%.",
            "metric_value": 73.4,
            "threshold_value": 62.0,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "status": "active"
        },
        {
            "alert_id": "ALT_CHOLAVARAM_MOD",
            "type": "reservoir_low",
            "severity": "info",
            "area_id": "AREA_TONDIARPET",
            "household_id": None,
            "title": "Cholavaram Lake Storage Buffer Advisory",
            "message": "Cholavaram storage is at 37.9% of total capacity. Water balancing routed to Puzhal feeder.",
            "metric_value": 37.9,
            "threshold_value": 40.0,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "status": "active"
        }
    ]
    for alt in initial_alerts:
        alerts_col.update_one({"alert_id": alt["alert_id"]}, {"$set": alt}, upsert=True)

    # 9. Seed Management Tasks
    initial_tasks = [
        {
            "task_id": "TSK_ANNA_BOOSTER",
            "title": "Anna Nagar Booster Pressure Balancing",
            "description": "Adjust output throttle at Anna Nagar Booster Station to optimize ward 102 delivery.",
            "task_type": "pressure_tuning",
            "priority": "high",
            "area_id": "AREA_ANNA_NAGAR",
            "area_name": "Anna Nagar",
            "assigned_to": "K. Raman (Assistant Engineer, MetroWater)",
            "latitude": 13.0850,
            "longitude": 80.2101,
            "status": "in_progress",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "completed_at": None
        },
        {
            "task_id": "TSK_TANKER_STANDBY",
            "title": "Mobile Tanker Fleet Verification",
            "description": "Pre-position 2 standby water tankers at Besant Nagar for coastal weekend surge.",
            "task_type": "tanker_dispatch",
            "priority": "medium",
            "area_id": "AREA_ADYAR",
            "area_name": "Adyar",
            "assigned_to": "S. Murugan (Logistics Supervisor)",
            "latitude": 13.0012,
            "longitude": 80.2565,
            "status": "pending",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "completed_at": None
        }
    ]
    for tsk in initial_tasks:
        tasks_col.update_one({"task_id": tsk["task_id"]}, {"$set": tsk}, upsert=True)

    # 10. Seed Approvals
    initial_approvals = [
        {
            "approval_id": "APP_DYNA_BOOST_TNAGAR",
            "task_id": "TSK_DYNAMIC_TNAGAR",
            "recommendation_id": "REC_T_NAGAR_BOOST",
            "title": "Dynamic Supply Boost for T. Nagar Weekend Flow",
            "description": "AI recommends increasing distribution flow rate from Kilpauk trunk to T. Nagar by 12% between 06:00 and 10:00 to avert pressure drop.",
            "impact_summary": "Ensures uninterrupted domestic pressure across 5,200 households; temporary 3% reallocation from north feeder.",
            "proposed_by": "AquaGuard AI Resilience Engine",
            "approver_name": "Dr. V. Rajesh, Executive Engineer",
            "decision": "pending",
            "decision_notes": "",
            "decided_at": None,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
        },
        {
            "approval_id": "APP_CONSERVATION_ADVISORY",
            "task_id": None,
            "recommendation_id": "REC_CONSERVE_ANNA",
            "title": "Issuance of Smart Water Conservation Notice",
            "description": "Automated broadcast of water-saving advisories to top 15% high-consumption domestic meters in Anna Nagar.",
            "impact_summary": "Estimated 8.5% demand reduction within 48 hours without restricting physical supply.",
            "proposed_by": "AquaGuard AI Resilience Engine",
            "approver_name": "M. Lakshmi, District Resilience Officer",
            "decision": "approved",
            "decision_notes": "Approved for dissemination via SMS and municipal portal.",
            "decided_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
    ]
    for app in initial_approvals:
        approvals_col.update_one({"approval_id": app["approval_id"]}, {"$set": app}, upsert=True)

    # 11. Seed Admin User
    admin_user = {
        "user_id": "USR_ADMIN_01",
        "username": "chennai_water_admin",
        "email": "admin@chennaimetrowater.tn.gov.in",
        "full_name": "Chennai District Water Resilience Administrator",
        "role": "admin",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    users_col.update_one({"user_id": admin_user["user_id"]}, {"$set": admin_user}, upsert=True)

    logger.info("AquaGuard AI database seeding completed successfully!")

if __name__ == "__main__":
    seed_database(force_reseed=True)

