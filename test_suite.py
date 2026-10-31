import json
import asyncio
import httpx
from backend.app.main import app

async def test_endpoints():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("--- 1. Testing Root & Health ---")
        res = await client.get("/")
        assert res.status_code == 200, res.text
        print("Root status:", res.status_code, res.json())

        res = await client.get("/api/health")
        assert res.status_code == 200
        print("Health:", res.json())

        print("\n--- 2. Testing Chennai GeoJSON Boundary ---")
        res = await client.get("/api/gis/chennai_geojson")
        assert res.status_code == 200
        geo = res.json()
        print("GeoJSON feature count:", len(geo.get("features", [])))
        assert len(geo.get("features", [])) >= 5

        print("\n--- 3. Testing Dashboard Metrics ---")
        res = await client.get("/api/dashboard/metrics")
        assert res.status_code == 200
        metrics = res.json()
        print("Households count:", metrics["total_households"])
        print("Daily consumption liters:", metrics["total_daily_consumption_liters"])
        print("Reservoir storage pct:", metrics["active_reservoirs_storage_pct"])
        assert metrics["total_households"] == 50

        print("\n--- 4. Testing Households API ---")
        res = await client.get("/api/households")
        assert res.status_code == 200
        hh_list = res.json()
        print("Listed households:", len(hh_list))
        assert len(hh_list) == 50

        res = await client.get("/api/households/HH001")
        assert res.status_code == 200
        print("Household HH001:", res.json()["household_id"], "Occupants:", res.json()["occupants"])

        print("\n--- 5. Testing Admin GPS Assignment ---")
        assign_payload = {
            "household_id": "HH015",
            "latitude": 13.042,
            "longitude": 80.235,
            "area_id": "AREA_T_NAGAR",
            "area_name": "T. Nagar (Teynampet)",
            "notes": "Verified by GCC zonal inspector"
        }
        res = await client.put("/api/households/HH015/location", json=assign_payload)
        assert res.status_code == 200
        print("GPS Assignment result:", res.json()["message"])

        print("\n--- 6. Testing AI Demand Forecasting ---")
        res = await client.get("/api/forecast/demand?horizon=7_day")
        assert res.status_code == 200
        fc = res.json()
        print("Forecast horizon:", fc["horizon"], "Total liters:", fc["total_predicted_demand_liters"])
        assert len(fc["forecast_series"]) == 7

        res = await client.get("/api/forecast/metrics")
        assert res.status_code == 200
        print("Model metrics:", res.json()["metrics"])

        print("\n--- 7. Testing Yearly Rainfall Intelligence ---")
        res = await client.get("/api/rainfall/annual")
        assert res.status_code == 200
        print("Rainfall records count:", len(res.json()))
        assert len(res.json()) >= 15

        res = await client.get("/api/rainfall/summary")
        assert res.status_code == 200
        rain_sum = res.json()
        print("Avg annual rainfall:", rain_sum["average_annual_rainfall_mm"], "mm")
        print("Highest year:", rain_sum["highest_rainfall_year"])
        print("Lowest year:", rain_sum["lowest_rainfall_year"])

        print("\n--- 8. Testing Shortage Risk Assessment ---")
        res = await client.get("/api/shortage_risk/areas")
        assert res.status_code == 200
        print("Shortage risk areas:", len(res.json()))
        print("Sample area risk:", res.json()[0]["area_name"], res.json()[0]["ai_risk_level"])

        print("\n--- 9. Testing Reservoirs & Distribution Points ---")
        res = await client.get("/api/reservoirs")
        assert res.status_code == 200
        print("Reservoirs count:", len(res.json()))
        assert len(res.json()) >= 6

        res = await client.get("/api/reservoirs/distribution_points")
        assert res.status_code == 200
        print("Distribution points count:", len(res.json()))

        print("\n--- 10. Testing Events AI Prediction ---")
        res = await client.get("/api/events")
        assert res.status_code == 200
        print("Events count:", len(res.json()))

        event_payload = {
            "name": "Chennai Book Fair",
            "area_id": "AREA_ANNA_NAGAR",
            "area_name": "Anna Nagar",
            "event_date": "2026-12-05",
            "duration_days": 3,
            "expected_participants": 20000
        }
        res = await client.post("/api/events", json=event_payload)
        assert res.status_code == 200
        new_evt = res.json()["event"]
        print("Created event extra demand:", new_evt["additional_event_demand_liters"], "Liters")
        print("AI Risk:", new_evt["demand_pressure_risk"])

        print("\n--- 11. Testing Command Center & Human Approvals ---")
        res = await client.get("/api/command_center/approvals")
        assert res.status_code == 200
        approvals = res.json()
        print("Approvals count:", len(approvals))
        if approvals:
            first_app = approvals[0]
            dec_payload = {
                "approval_id": first_app["approval_id"],
                "decision": "approved",
                "approver_name": "Chief Engineer CMWSSB",
                "notes": "Approved for field execution"
            }
            res = await client.post("/api/command_center/approvals/decide", json=dec_payload)
            assert res.status_code == 200
            print("Decision result:", res.json()["message"])

        print("\n--- 12. Testing System Settings & DB Status ---")
        res = await client.get("/api/settings/status")
        assert res.status_code == 200
        status = res.json()
        print("DB Type:", status["database_type"])
        print("Collections:", status["collections"])

        print("\n>>> ALL BACKEND & ML SUITE TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
