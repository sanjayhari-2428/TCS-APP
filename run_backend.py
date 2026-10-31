import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print("=" * 70)
    print("  AquaGuard AI - Chennai District Smart Water Resilience Backend")
    print(f"  Live Server: http://127.0.0.1:{settings.BACKEND_PORT}")
    print(f"  Interactive API Docs: http://127.0.0.1:{settings.BACKEND_PORT}/docs")
    print("=" * 70)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=settings.BACKEND_PORT, reload=False)
