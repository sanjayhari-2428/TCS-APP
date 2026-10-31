import logging
from pymongo import MongoClient
import mongomock
from .config import settings

logger = logging.getLogger("aquaguard.database")

class Database:
    client = None
    db = None
    is_live_mongo = False

    @classmethod
    def connect(cls, uri: str = None):
        target_uri = uri or settings.MONGO_URI
        try:
            # Try connecting to live MongoDB with a 2-second timeout
            logger.info(f"Attempting connection to MongoDB at: {target_uri}")
            client = MongoClient(target_uri, serverSelectionTimeoutMS=2000)
            client.admin.command('ping')
            cls.client = client
            cls.db = client[settings.DB_NAME]
            cls.is_live_mongo = True
            logger.info(f"Connected successfully to live MongoDB: {settings.DB_NAME}")
        except Exception as e:
            logger.warning(f"Could not connect to live MongoDB ({e}). Falling back to in-memory Mock MongoDB engine.")
            cls.client = mongomock.MongoClient()
            cls.db = cls.client[settings.DB_NAME]
            cls.is_live_mongo = False

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

