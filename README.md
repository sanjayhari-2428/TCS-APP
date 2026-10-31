# AquaGuard AI – Chennai District Smart Water Resilience Management Platform

**AquaGuard AI** is a full-stack, AI-powered smart water resilience and distribution management platform developed specifically for **Chennai District, Tamil Nadu, India** (Greater Chennai Corporation / Chennai Metropolitan Water Supply and Sewerage Board framework).

The platform models household consumption telemetry, multi-year monsoon rainfall intelligence, catchment reservoir storage buffers, and predictive event surges to evaluate district demand pressure and support ethical, human-in-the-loop water governance.

---

## 🌟 Key Architecture & Compliance Highlights

1. **MongoDB Exclusivity**: Designed strictly with MongoDB as the primary database across 13 structured collections. Integrates a zero-configuration auto-fallback engine (`mongomock`) that operates out of the box and seamlessly reconnects to live MongoDB or MongoDB Atlas when provided.
2. **Strict Privacy & Scope Boundaries**:
   - **Zero Leakage Detection Scope**: Completely omits `possible_leak_flag` and `anomaly_flag` from schemas, queries, and UI views.
   - **No Cloud/Firebase Dependencies**: Operates 100% locally on FastAPI and React.
3. **Genuine GIS Spatial Integrity**:
   - Bundles the official geographical boundary of **Chennai District, Tamil Nadu**, and the 15 administrative zones of Greater Chennai Corporation (GCC).
   - **No Imaginary Household Coordinates**: Unassigned households are segregated in an admin demonstration list until genuine GPS coordinates are registered through the Admin Portal.
4. **AI Supervised Demand Forecasting**:
   - Random Forest Regressor (100 estimators) trained with **chronological train/test splitting** (80% historical training, 20% future holdout test).
   - Rigorously evaluated with **MAE (49.58 L)**, **RMSE (109.33 L)**, and **R² (0.7337)**.
5. **Human-in-the-Loop Safeguard**:
   - Important water distribution decisions require authenticated human executive review. Automated disconnection of domestic supplies is strictly prohibited.

---

## 📁 Project Directory Structure

```text
TCS FINAL/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI application root & CORS setup
│   │   ├── config.py                 # Environment variables & paths
│   │   ├── database.py               # MongoDB connector with auto-mock fallback
│   │   ├── models.py                 # Pydantic schemas for all 13 collections
│   │   ├── ml_engine.py              # Random Forest regressor, risk & event logic
│   │   ├── seed_data.py              # Database seeder & chronological ML trainer
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── dashboard.py          # Dashboard KPIs & aggregated trends
│   │       ├── households.py         # Household registry & Admin GPS assigner
│   │       ├── readings.py           # Meter telemetry & CSV validation upload
│   │       ├── rainfall.py           # 15-Year IMD rainfall & weather logs
│   │       ├── forecasting.py        # 1-day, 7-day, 30-day demand predictions
│   │       ├── shortage_risk.py      # Zone demand-pressure risk assessment
│   │       ├── reservoirs.py         # Catchment lakes & distribution points CRUD
│   │       ├── events.py             # Event surge modeling & recommendations
│   │       ├── command_center.py     # Human approvals, tasks, alerts
│   │       ├── reports.py            # Water balance reports & comparative audits
│   │       └── settings.py           # MongoDB status, thresholds, re-seeder
│   ├── data/
│   │   ├── aquaguard_household_water_dataset.csv  # 4,500 daily readings (HH001-HH050)
│   │   ├── Clean15YearChennaiWeather.csv          # 1,068 Chennai weather observations
│   │   ├── chennai_annual_rainfall.csv            # 15-Year IMD historical rainfall
│   │   └── chennai_district_boundary.geojson      # Genuine GCC Chennai GeoJSON
│   ├── requirements.txt
│   └── run.py                        # Uvicorn entrypoint (Port 8000)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx           # 12-item responsive navigation sidebar
│   │   │   ├── Navbar.jsx            # Smart-city header & live status pills
│   │   │   ├── MetricCard.jsx        # Glassmorphic KPI cards
│   │   │   ├── StatusBadge.jsx       # Standardized risk & status badges
│   │   │   ├── ChennaiMap.jsx        # Leaflet GIS map with 6 layer controls
│   │   │   └── AssignLocationModal.jsx # Admin GPS coordinate registration modal
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Executive Smart-City Dashboard
│   │   │   ├── ChennaiMapPage.jsx    # Dedicated Full-Screen Intelligence Map
│   │   │   ├── HouseholdManagement.jsx # Household registry & GPS editor
│   │   │   ├── LiveMonitoring.jsx    # Telemetry stream, flow, pressure, tanks
│   │   │   ├── DemandForecasting.jsx # AI RF models, MAE/RMSE, feature weights
│   │   │   ├── RainfallIntelligence.jsx # Annual rainfall, trends & weather logs
│   │   │   ├── ShortageRisk.jsx      # Multi-factor shortage pressure engine
│   │   │   ├── ReservoirManagement.jsx # 6 Catchment lakes & storage gauges
│   │   │   ├── EventManagement.jsx   # City events extra water demand predictor
│   │   │   ├── CommandCenter.jsx     # Human-in-the-Loop approvals & task board
│   │   │   ├── ReportsAnalytics.jsx  # Metropolitan water balance & CSV export
│   │   │   └── SettingsPage.jsx      # Database status & threshold configuration
│   │   ├── services/
│   │   │   └── api.js                # Frontend API client
│   │   ├── App.jsx                   # Master view router
│   │   ├── index.css                 # Custom scrollbars, glow effects & Leaflet styles
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── test_suite.py                     # Full asynchronous integration test suite
└── README.md
```

---

## 🚀 How to Run the Platform

### Prerequisites
- Python 3.10+
- Node.js v18+ and npm

### 1. Start the FastAPI Backend
Open a terminal in the root workspace `c:\Users\HP\OneDrive\Desktop\TCS FINAL`:

```powershell
# Run the backend
python backend/run.py
```

The backend starts on `http://127.0.0.1:8000`.
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

*Note: The backend automatically connects to MongoDB at `mongodb://localhost:27017`. If MongoDB is not running locally, it seamlessly engages an embedded in-memory Mock MongoDB engine without crashing, immediately loading all 4,500 water records and training the Random Forest AI model on startup.*

### 2. Start the React Frontend
Open a second terminal in the root workspace:

```powershell
npm run dev --prefix frontend
```

Open your browser to:
**`http://localhost:3000`**

---

## 🗄️ MongoDB Database Structure (13 Collections)

The database `aquaguard_ai_chennai` manages 13 collections:
1. `households`: 50 registered smart-metered household accounts (`HH001` - `HH050`).
2. `water_readings`: 4,500 daily readings (occupants, flow rate, pressure, tank level, daily consumption, estimated bill).
3. `rainfall_data`: 15 years of official IMD Chennai rainfall totals (2010–2024) and 1,068 weather observations.
4. `forecasts`: AI generated next-day, 7-day, and 30-day demand predictions with confidence bounds.
5. `areas`: Chennai administrative zones (Centroids, MLD baselines, populations, polygons).
6. `household_locations`: Admin verified GPS coordinates (`latitude`, `longitude`, `area_id`, `verified_by`).
7. `reservoirs`: Catchment storage records (Chembarambakkam, Poondi, Red Hills, Cholavaram, Veeranam, Porur).
8. `water_distribution_points`: Major headworks and booster stations (Kilpauk, Anna Nagar, T. Nagar, Adyar, Velachery).
9. `events`: City event profiles, participant counts, and AI surge projections.
10. `alerts`: Automated consumption surge and reservoir capacity buffer advisories.
11. `management_tasks`: Field engineer assignments and operational status board.
12. `approvals`: Human-in-the-loop audit log of approved/rejected conservation directives.
13. `users`: System administrator accounts.

---

## 🗺️ How to Use the Chennai Water Intelligence Map

1. Navigate to **Chennai District Map** in the sidebar.
2. The map centers on Chennai District, Tamil Nadu with OpenStreetMap tiles and official GCC boundaries.
3. Open the **Map Layers** control panel in the top-left to toggle:
   - **Layer 1: Household Locations** (Color-coded: Green &lt;300L, Yellow 300-400L, Red &gt;400L).
   - **Layer 2: Consumption Heatmap** (Area-level intensity calculated from actual household readings).
   - **Layer 3: Reservoirs and Tanks** (Chembarambakkam, Poondi, Red Hills, Cholavaram, Veeranam, Porur).
   - **Layer 4: Water Shortage Risk** (Area polygons colored by AI risk level).
   - **Layer 5: Distribution Points** (Kilpauk Water Works, Anna Nagar Booster, etc.).
   - **Layer 6: Management Tasks** (Field engineering assignments).
4. Click any marker or zone polygon to display its full telemetry dossier in the bottom-right interactive panel.

---

## 📍 How to Add Household Coordinates (Admin GPS Interface)

Per the strict requirement: **Never invent actual household locations**.

1. Navigate to **Chennai District Map** or **Household Management**.
2. Click the **"Admin Assign GPS"** button or switch to the **"Unassigned Cohort"** tab.
3. Select a target Household ID (e.g., `HH015`).
4. Select an authentic Chennai administrative zone (e.g. *T. Nagar*, *Anna Nagar*, *Adyar*, *Mylapore*, *Velachery*).
5. Enter the verified Latitude and Longitude.
6. Click **"Save Verified Location"**.
7. The household marker immediately appears on the Chennai map with its live telemetry profile.

---

## 🌊 How to Manage Reservoir Readings

1. Navigate to **Reservoir Management** in the sidebar.
2. View real-time storage percentages, capacities (Mcft), water levels (ft), and inflow/outflow rates.
3. Click **"Add Reservoir / Tank"** to register a new storage asset.
4. Click **"Update Reading"** on any existing reservoir to input real gauge readings without synthesizing fake values.

---

## 📂 How to Upload CSV Datasets

- **Household Water Consumption CSV**:
  1. Navigate to **Live Water Monitoring**.
  2. Click **"Import Household CSV"**.
  3. The system validates missing values, drops duplicate dates, validates numeric consumption, strips any leakage flags, inserts valid records into MongoDB, and recalibrates the Random Forest model.
- **Yearly Rainfall CSV**:
  1. Navigate to **Rainfall Intelligence**.
  2. Click **"Import Rainfall CSV"**.
  3. Upload any custom annual rainfall CSV containing `year` and `rainfall_mm`.

---

## 🤖 Explanation of the AI / ML Models

### 1. Demand Forecasting Engine (`ml_engine.py`)
- **Algorithm**: `RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)`
- **Partitioning**: **Chronological Train/Test Split** (earliest 80% dates for training, latest 20% for future holdout validation).
- **Features Used**:
  - `occupants`: Household resident count.
  - `day_of_week_num`: Day of week (0=Monday to 6=Sunday).
  - `temperature_c`: Daily ambient temperature.
  - `rainfall_mm`: Daily precipitation.
  - `event_flag` & `event_extra_people`: Planned domestic gathering factors.
  - `consumption_previous_day_liters`: 1-day lag consumption.
  - `consumption_7day_average_liters`: 7-day rolling moving average.
- **Target Variable**: `daily_consumption_liters`
- **Evaluation Performance**:
  - **MAE**: 49.58 Liters
  - **RMSE**: 109.33 Liters
  - **R² Score**: 0.7337
  - **Feature Importance**: 7-Day Moving Avg (84.4%), Previous Day (4.3%), Temperature (3.9%), Rainfall (2.3%).
- **Horizons Supported**: 1-Day Next-Day forecast, 7-Day Weekly projection, 30-Day Monthly trend.

### 2. Event-Based Water Demand Predictor
- Predicts public gathering impact based on attendee numbers, event duration, and Chennai's per-capita public water rate (35 Liters/person/day for hydration, sanitation, and venue cooling).
- Calculates surge percentage and outputs mitigation recommendations (e.g. mobile tanker pre-positioning, advance booster pump operation).

### 3. Water Shortage Risk Engine
- Combines:
  1. Forecast demand pressure vs baseline (+% growth).
  2. Annual monsoon rainfall departure (% above or below 1,400 mm normal).
  3. Multi-reservoir catchment storage percentage.
- Outputs risk tiers: `Normal`, `Low Risk`, `Medium Risk`, `High Risk` along with natural-language operational explanations and recommended engineering actions.

