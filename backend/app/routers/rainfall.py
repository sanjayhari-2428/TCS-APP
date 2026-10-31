import io
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any, List
from ..database import get_rainfall_col, get_water_readings_col
from ..config import settings

router = APIRouter(prefix="/rainfall", tags=["Rainfall Intelligence"])

@router.get("/annual")
def get_annual_rainfall() -> List[Dict[str, Any]]:
    col = get_rainfall_col()
    records = list(col.find({"year": {"$exists": True, "$type": "number"}}, {"_id": 0}).sort("year", 1))
    return records

@router.get("/summary")
def get_rainfall_summary() -> Dict[str, Any]:
    col = get_rainfall_col()
    records = list(col.find({"year": {"$exists": True, "$type": "number"}}, {"_id": 0}).sort("year", 1))
    if not records:
        return {}

    rainfalls = [r["rainfall_mm"] for r in records]
    avg_annual = sum(rainfalls) / len(rainfalls)

    highest_rec = max(records, key=lambda x: x["rainfall_mm"])
    lowest_rec = min(records, key=lambda x: x["rainfall_mm"])

    # Trend slope estimation (linear regression over years)
    years = [r["year"] for r in records]
    n = len(years)
    mean_x = sum(years) / n
    mean_y = avg_annual
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(years, rainfalls))
    denominator = sum((x - mean_x) ** 2 for x in years)
    slope = round(numerator / denominator, 2) if denominator != 0 else 0.0

    deficit_years_count = sum(1 for r in records if r.get("status") == "Deficit" or r.get("departure_percent", 0) < -15)
    excess_years_count = sum(1 for r in records if r.get("status") == "Excess" or r.get("departure_percent", 0) > 15)

    return {
        "record_span": f"{records[0]['year']} - {records[-1]['year']}",
        "total_recorded_years": len(records),
        "average_annual_rainfall_mm": round(avg_annual, 1),
        "normal_baseline_mm": 1400.0,
        "highest_rainfall_year": {
            "year": highest_rec["year"],
            "rainfall_mm": highest_rec["rainfall_mm"],
            "departure_percent": highest_rec.get("departure_percent", 0),
            "notes": highest_rec.get("notes", "")
        },
        "lowest_rainfall_year": {
            "year": lowest_rec["year"],
            "rainfall_mm": lowest_rec["rainfall_mm"],
            "departure_percent": lowest_rec.get("departure_percent", 0),
            "notes": lowest_rec.get("notes", "")
        },
        "trend": {
            "slope_mm_per_year": slope,
            "interpretation": "Moderately Increasing" if slope > 5 else "Slightly Declining" if slope < -5 else "Stable Cyclical"
        },
        "historical_cycles": {
            "deficit_years": deficit_years_count,
            "excess_years": excess_years_count,
            "normal_years": len(records) - (deficit_years_count + excess_years_count)
        }
    }

@router.get("/weather_observations")
def get_weather_observations(limit: int = 50) -> Dict[str, Any]:
    """
    Returns observation records from Clean15YearChennaiWeather dataset.
    """
    csv_path = settings.DATA_DIR / "Clean15YearChennaiWeather.csv"
    if not csv_path.exists():
        return {"records": [], "count": 0}

    df = pd.read_csv(csv_path)
    records = df.head(limit).fillna("").to_dict(orient="records")
    return {
        "total_observations": len(df),
        "years_covered": sorted(df["year"].unique().tolist()),
        "sample_records": records
    }

@router.post("/import_csv")
async def import_rainfall_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload and import custom yearly rainfall dataset.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    if "year" not in df.columns or "rainfall_mm" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV must contain 'year' and 'rainfall_mm' columns.")

    df["year"] = pd.to_numeric(df["year"], errors="coerce").astype(int)
    df["rainfall_mm"] = pd.to_numeric(df["rainfall_mm"], errors="coerce")
    df = df.dropna(subset=["year", "rainfall_mm"])

    col = get_rainfall_col()
    records = df.to_dict(orient="records")
    for r in records:
        col.update_one({"year": r["year"]}, {"$set": r}, upsert=True)

    return {
        "success": True,
        "records_imported": len(records),
        "message": f"Successfully updated {len(records)} yearly rainfall records."
    }

