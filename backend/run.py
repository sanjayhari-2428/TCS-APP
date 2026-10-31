import os
import sys
from pathlib import Path

# Ensure root workspace directory is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print(f"Starting AquaGuard AI Backend on http://127.0.0.1:{settings.BACKEND_PORT} ...")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=settings.BACKEND_PORT, reload=False)
