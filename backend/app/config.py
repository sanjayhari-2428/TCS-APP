import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    PROJECT_NAME: str = "AquaGuard AI – Chennai Smart Water Resilience"
    API_V1_STR: str = "/api"
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "aquaguard_ai_chennai")
    BACKEND_PORT: int = int(os.getenv("PORT", 8000))
    DATA_DIR: Path = BASE_DIR / "data"

settings = Settings()

