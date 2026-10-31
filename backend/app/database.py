import logging
from typing import Any

try:
    from pymongo import MongoClient  # type: ignore
except ImportError:
    MongoClient = None

try:
    import mongomock  # type: ignore
except ImportError:
    mongomock = None

from .config import settings

logger = logging.getLogger("aquaguard.database")

class Database:
    client: Any = None
    db: Any = None
    is_live_mongo: bool = False

    @classmethod
    def connect(cls, uri: str = None):
        target_uri = uri or settings.MONGO_URI
        
        # 1. Attempt connection to Live MongoDB if MongoClient is available
        if MongoClient is not None:
            try:
                logger.info(f"Checking MongoDB at: {target_uri}...")
                client = MongoClient(target_uri, serverSelectionTimeoutMS=500)
                client.admin.command('ping')
                cls.client = client
                cls.db = client[settings.DB_NAME]
                cls.is_live_mongo = True
                logger.info(f"Connected to live MongoDB server: {settings.DB_NAME}")
                return
            except Exception:
                logger.info("Local MongoDB daemon not detected at localhost:27017. Using embedded MongoDB engine.")
        
        # 2. Seamless in-memory fallback using mongomock
        if mongomock is not None:
            cls.client = mongomock.MongoClient()
            cls.db = cls.client[settings.DB_NAME]
            cls.is_live_mongo = False
            logger.info("Operating with embedded Mock MongoDB engine.")
        else:
            raise RuntimeError("Neither pymongo nor mongomock is available. Please run: pip install pymongo mongomock")

    @classmethod
    def get_collection(cls, name: str):
        if cls.db is None:
            cls.connect()
        return cls.db[name]

# Helper accessors for all 13 required collections
def get_households_col():
    return Database.get_collection("households")

def get_water_readings_col():
    return Database.get_collection("water_readings")

def get_rainfall_col():
    return Database.get_collection("rainfall_data")

def get_forecasts_col():
    return Database.get_collection("forecasts")

def get_areas_col():
    return Database.get_collection("areas")

def get_household_locations_col():
    return Database.get_collection("household_locations")

def get_reservoirs_col():
    return Database.get_collection("reservoirs")

def get_distribution_points_col():
    return Database.get_collection("water_distribution_points")

def get_events_col():
    return Database.get_collection("events")

def get_alerts_col():
    return Database.get_collection("alerts")

def get_tasks_col():
    return Database.get_collection("management_tasks")

def get_approvals_col():
    return Database.get_collection("approvals")

def get_users_col():
    return Database.get_collection("users")
