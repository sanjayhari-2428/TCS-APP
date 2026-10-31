import json
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .seed_data import seed_database
from .routers import (
    dashboard,
    households,
    readings,
    rainfall,
    forecasting,
    shortage_risk,
    reservoirs,
    events,
    command_center,
    reports,
    settings as sys_settings
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("aquaguard.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AquaGuard AI – Chennai District Smart Water Resilience Management Platform API",
    version="1.0.0"
)

# Enable CORS for local and web frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Starting AquaGuard AI Backend...")
    try:
        seed_database(force_reseed=False)
        logger.info("AquaGuard AI startup routine complete.")
    except Exception as e:
        logger.error(f"Startup error during seeding: {e}")

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "district": "Chennai District, Tamil Nadu, India",
        "status": "operational",
        "api_docs": "/docs"
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "AquaGuard AI API"}

@app.get("/api/gis/chennai_geojson")
def get_chennai_geojson():
    geojson_path = settings.DATA_DIR / "chennai_district_boundary.geojson"
    if geojson_path.exists():
        with open(geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    return JSONResponse(status_code=404, content={"error": "GeoJSON file not found"})

# Include all required API routers
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(households.router, prefix=settings.API_V1_STR)
app.include_router(readings.router, prefix=settings.API_V1_STR)
app.include_router(rainfall.router, prefix=settings.API_V1_STR)
app.include_router(forecasting.router, prefix=settings.API_V1_STR)
app.include_router(shortage_risk.router, prefix=settings.API_V1_STR)
app.include_router(reservoirs.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(command_center.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(sys_settings.router, prefix=settings.API_V1_STR)
