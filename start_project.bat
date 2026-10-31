@echo off
title AquaGuard AI - Chennai District Smart Water Resilience
color 0B
echo =========================================================================
echo    AQUAGUARD AI - CHENNAI DISTRICT SMART WATER RESILIENCE PLATFORM
echo =========================================================================
echo.
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "AquaGuard AI - FastAPI Backend" cmd /k "python backend\run.py"

timeout /t 3 /nobreak >nul

echo Starting React Frontend on http://localhost:3000 ...
start "AquaGuard AI - React Frontend" cmd /k "npm run dev --prefix frontend"

echo.
echo =========================================================================
echo Both services launched!
echo - Frontend: http://localhost:3000
echo - Backend:  http://127.0.0.1:8000
echo - Docs:     http://127.0.0.1:8000/docs
echo =========================================================================
pause

