import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from .config import settings

logger = logging.getLogger("aquaguard.ml")

class DemandPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        self.feature_names = [
            "occupants",
            "day_of_week_num",
            "temperature_c",
            "rainfall_mm",
            "event_flag",
            "event_extra_people",
            "consumption_previous_day_liters",
            "consumption_7day_average_liters"
        ]
        self.metrics: Dict[str, Any] = {
            "mae": 0.0,
            "rmse": 0.0,
            "r2": 0.0,
            "train_samples": 0,
            "test_samples": 0,
            "evaluation_date": None
        }
        self.feature_importance: Dict[str, float] = {}
        self.actual_vs_predicted: List[Dict[str, Any]] = []
        self.is_trained = False
        self.df_history = pd.DataFrame()

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        # Day of week mapping
        dow_map = {
            "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
            "Friday": 4, "Saturday": 5, "Sunday": 6
        }
        if "day_of_week" in df.columns:
            df["day_of_week_num"] = df["day_of_week"].map(dow_map).fillna(0).astype(int)
        elif "day_of_week_num" not in df.columns:
            df["day_of_week_num"] = 2
            
        # Ensure numerical types and handle NaNs safely
        for col in ["occupants", "event_flag", "event_extra_people"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            else:
                df[col] = 0

        for col in ["temperature_c", "rainfall_mm", "daily_consumption_liters"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(df[col].median() if not df[col].empty else 25.0)

        # Lag features
        if "consumption_previous_day_liters" not in df.columns or df["consumption_previous_day_liters"].isnull().all():
            df["consumption_previous_day_liters"] = df.groupby("household_id")["daily_consumption_liters"].shift(1)
            df["consumption_previous_day_liters"] = df["consumption_previous_day_liters"].fillna(df["daily_consumption_liters"])
        else:
            df["consumption_previous_day_liters"] = pd.to_numeric(df["consumption_previous_day_liters"], errors='coerce').fillna(df["daily_consumption_liters"])

        if "consumption_7day_average_liters" not in df.columns or df["consumption_7day_average_liters"].isnull().all():
            df["consumption_7day_average_liters"] = df.groupby("household_id")["daily_consumption_liters"].transform(lambda x: x.rolling(7, min_periods=1).mean())
            df["consumption_7day_average_liters"] = df["consumption_7day_average_liters"].fillna(df["daily_consumption_liters"])
        else:
            df["consumption_7day_average_liters"] = pd.to_numeric(df["consumption_7day_average_liters"], errors='coerce').fillna(df["daily_consumption_liters"])

        return df

    def train_model(self, df: pd.DataFrame) -> Dict[str, Any]:
        logger.info(f"Training Random Forest on {len(df)} records with chronological split...")
        prepared_df = self._prepare_features(df)
        self.df_history = prepared_df.sort_values(by=["date", "household_id"]).reset_index(drop=True)

        # Drop any row without valid target
        clean_df = self.df_history.dropna(subset=["daily_consumption_liters"] + self.feature_names)
        if len(clean_df) < 50:
            raise ValueError(f"Insufficient training samples: {len(clean_df)}")

        # Chronological Train-Test Split (Earliest 80% Train, Latest 20% Test)
        split_idx = int(len(clean_df) * 0.8)
        train_df = clean_df.iloc[:split_idx]
        test_df = clean_df.iloc[split_idx:]

        X_train = train_df[self.feature_names]
        y_train = train_df["daily_consumption_liters"]

        X_test = test_df[self.feature_names]
        y_test = test_df["daily_consumption_liters"]

        self.model.fit(X_train, y_train)
        y_pred = self.model.predict(X_test)

        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))

        # Feature importances
        importances = dict(zip(self.feature_names, [round(float(x), 4) for x in self.model.feature_importances_]))
        self.feature_importance = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

        self.metrics = {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "evaluation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "model_type": "Random Forest Regressor (100 Trees)"
        }

        # Sample actual vs predicted for evaluation plotting (e.g. last 30 test days aggregate)
        eval_sample = test_df.copy()
        eval_sample["predicted"] = y_pred
        daily_eval = eval_sample.groupby("date")[["daily_consumption_liters", "predicted"]].mean().reset_index()
        self.actual_vs_predicted = [
            {
                "date": row["date"],
                "actual_liters": round(float(row["daily_consumption_liters"]), 1),
                "predicted_liters": round(float(row["predicted"]), 1),
                "variance": round(float(row["predicted"] - row["daily_consumption_liters"]), 1)
            }
            for _, row in daily_eval.tail(30).iterrows()
        ]

        self.is_trained = True
        logger.info(f"Model trained! MAE: {mae:.2f} L, RMSE: {rmse:.2f} L, R2: {r2:.4f}")
        return self.metrics

    def forecast_demand(self, household_id: Optional[str] = None, horizon_days: int = 7) -> List[Dict[str, Any]]:
        """
        Generate time-series forecast for next 1, 7, or 30 days.
        """
        if not self.is_trained or self.df_history.empty:
            return []

        # Reference last known date
        if household_id:
            sub = self.df_history[self.df_history["household_id"] == household_id]
            if sub.empty:
                sub = self.df_history
        else:
            sub = self.df_history

        last_row = sub.iloc[-1]
        last_date = datetime.strptime(str(last_row["date"]), "%Y-%m-%d")

        # Baseline features
        curr_occupants = float(last_row.get("occupants", 3))
        curr_prev = float(last_row.get("daily_consumption_liters", 300.0))
        curr_7day = float(last_row.get("consumption_7day_average_liters", 300.0))
        recent_temps = [31.5, 32.0, 31.0, 33.0, 32.5, 31.8, 32.2]
        recent_rain = [2.0, 0.0, 1.5, 5.0, 0.0, 0.0, 3.2]

        forecasts = []
        rolling_consumptions = [curr_prev]

        for i in range(1, horizon_days + 1):
            target_date = last_date + timedelta(days=i)
            dow_num = target_date.weekday()
            temp = recent_temps[(i - 1) % len(recent_temps)]
            rain = recent_rain[(i - 1) % len(recent_rain)]

            # Feature vector
            X_input = pd.DataFrame([{
                "occupants": curr_occupants,
                "day_of_week_num": dow_num,
                "temperature_c": temp,
                "rainfall_mm": rain,
                "event_flag": 0,
                "event_extra_people": 0,
                "consumption_previous_day_liters": rolling_consumptions[-1],
                "consumption_7day_average_liters": np.mean(rolling_consumptions[-7:]) if len(rolling_consumptions) >= 7 else np.mean(rolling_consumptions)
            }])

            # Scale if forecasting district aggregate vs single household
            multiplier = 1.0 if household_id else 50.0 # 50 households representation
            pred_single = float(self.model.predict(X_input[self.feature_names])[0])
            pred_total = pred_single * multiplier

            # Margin of error / confidence interval based on evaluated RMSE
            margin = self.metrics.get("rmse", 15.0) * multiplier
            confidence_lower = max(0.0, round(pred_total - margin, 1))
            confidence_upper = round(pred_total + margin, 1)

            forecasts.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "day_name": target_date.strftime("%A"),
                "predicted_demand_liters": round(pred_total, 1),
                "confidence_lower": confidence_lower,
                "confidence_upper": confidence_upper,
                "is_weekend": dow_num in [5, 6]
            })

            rolling_consumptions.append(pred_single)

        return forecasts

    def predict_event_demand(self, base_daily_demand: float, extra_attendees: int, duration_days: int) -> Dict[str, Any]:
        """
        Predict extra event water demand in Chennai.
        Standard per-capita public gathering consumption in Chennai: ~25 - 45 Liters/person/day.
        """
        per_capita_event_liters = 35.0 # Drinking, sanitation, venue cooling
        additional_daily_liters = round(extra_attendees * per_capita_event_liters, 1)
        total_event_daily_demand = round(base_daily_demand + additional_daily_liters, 1)
        total_event_consumption = round(additional_daily_liters * duration_days, 1)

        surge_percent = round((additional_daily_liters / max(base_daily_demand, 1.0)) * 100, 1)

        # Risk level determination
        if surge_percent > 40.0:
            risk = "High Risk"
            recs = [
                "Pre-allocate 2 dedicated GCC water tankers to the venue.",
                "Verify overhead storage tank backup in the adjacent ward.",
                "Notify Chennai MetroWater distribution engineer 48 hours prior."
            ]
        elif surge_percent > 20.0:
            risk = "Medium Risk"
            recs = [
                "Schedule supplementary supply filling 6 hours prior to event commencement.",
                "Ensure venue water-saving push taps are inspected."
            ]
        elif surge_percent > 8.0:
            risk = "Low Risk"
            recs = [
                "Monitor flow meters during peak operational hours.",
                "Ensure local community notice board displays conservation advisory."
            ]
        else:
            risk = "Normal"
            recs = [
                "Standard pipeline pressure adequate for estimated demand."
            ]

        return {
            "expected_normal_demand_liters": round(base_daily_demand, 1),
            "additional_event_demand_liters": additional_daily_liters,
            "total_predicted_demand_liters": total_event_daily_demand,
            "total_event_consumption_liters": total_event_consumption,
            "surge_percent": surge_percent,
            "demand_pressure_risk": risk,
            "ai_recommendations": recs
        }

    def assess_area_shortage_risk(
        self,
        area_name: str,
        current_daily_consumption: float,
        predicted_daily_demand: float,
        annual_rainfall_departure: float = 0.0,
        reservoir_storage_pct: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        AI Shortage-Risk Assessment.
        Combines predicted demand growth, rainfall departures, and reservoir storage levels.
        """
        demand_growth_pct = ((predicted_daily_demand - current_daily_consumption) / max(current_daily_consumption, 1.0)) * 100

        # Score formulation
        # Weight 1: Demand pressure (0 - 45)
        demand_score = min(max(demand_growth_pct * 2.5, 0), 45)

        # Weight 2: Rainfall deficit (0 - 30)
        # If rainfall departure is negative (deficit), risk increases
        rainfall_score = 0.0
        if annual_rainfall_departure < 0:
            rainfall_score = min(abs(annual_rainfall_departure) * 0.8, 30)

        # Weight 3: Reservoir availability (0 - 25)
        # If reservoir storage is low (< 35%), risk increases
        reservoir_score = 10.0 # Default assumption if not supplied
        is_exact_supply_known = False
        if reservoir_storage_pct is not None:
            is_exact_supply_known = True
            if reservoir_storage_pct < 25:
                reservoir_score = 25.0
            elif reservoir_storage_pct < 50:
                reservoir_score = 15.0
            elif reservoir_storage_pct < 75:
                reservoir_score = 5.0
            else:
                reservoir_score = 0.0

        total_risk_score = round(demand_score + rainfall_score + reservoir_score, 1)

        if total_risk_score >= 60:
            risk_level = "High Risk"
            explanation = f"High demand pressure (+{demand_growth_pct:.1f}%) combined with monsoon deficit ({annual_rainfall_departure:+.1f}%) creates strong local distribution strain."
            action = "Activate supplementary booster feed, dispatch standby mobile tankers, and enforce commercial conservation directives."
        elif total_risk_score >= 40:
            risk_level = "Medium Risk"
            explanation = f"Moderate demand pressure (+{demand_growth_pct:.1f}%) observed against seasonal baseline. Water availability is sufficient but requires active pressure balancing."
            action = "Regulate pipeline delivery hours and prompt high-consumption households to check internal fixtures."
        elif total_risk_score >= 20:
            risk_level = "Low Risk"
            explanation = f"Demand variations (+{demand_growth_pct:.1f}%) remain within manageable network thresholds with stable storage buffer."
            action = "Routine network monitoring and routine water meter inspection."
        else:
            risk_level = "Normal"
            explanation = f"Consumption and rainfall parameters are optimal. Local water pressure and supply balance is stable."
            action = "Maintain standard continuous supply schedule."

        return {
            "area_name": area_name,
            "current_consumption_liters": round(current_daily_consumption, 1),
            "predicted_demand_liters": round(predicted_daily_demand, 1),
            "demand_growth_pct": round(demand_growth_pct, 1),
            "risk_score_pct": total_risk_score,
            "ai_risk_level": risk_level,
            "explanation": explanation,
            "recommended_action": action,
            "is_exact_supply_known": is_exact_supply_known,
            "rainfall_info": {
                "annual_departure_pct": round(annual_rainfall_departure, 1),
                "status": "Deficit" if annual_rainfall_departure < -10 else "Excess" if annual_rainfall_departure > 10 else "Normal"
            }
        }

# Global ML instance
ml_engine = DemandPredictor()

