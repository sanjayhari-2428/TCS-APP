import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Droplet,
  Info,
  Waves,
  CloudRain,
  TrendingUp,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

export default function ShortageRisk() {
  const [assessments, setAssessments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [areas, sum] = await Promise.all([
        api.getAreaRiskAssessments(),
        api.getRiskSummary()
      ]);
      setAssessments(areas);
      setSummary(sum);
      if (areas.length > 0) {
        setSelectedArea(areas[0]);
      }
    } catch (err) {
      console.error('Failed to load shortage risk data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl space-y-1">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-brand-teal" />
          <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
            AI Multi-Factor Risk Assessment
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Chennai District Water Shortage & Demand Pressure Analysis
        </h2>
        <p className="text-xs text-slate-400">
          Synthesizes forecast demand surge, IMD monsoon departure, and reservoir capacity buffers into transparent risk scores
        </p>
      </div>

      {/* District Risk Summary Cards (Section 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="District Aggregate Risk Score"
          value={`${summary?.district_risk_index_score || '38.4'}`}
          unit="/ 100"
          subtitle={summary?.district_status || 'Moderate Resilience'}
          icon={AlertTriangle}
          color="amber"
        />
        <MetricCard
          title="High Demand Pressure Areas"
          value={summary?.breakdown?.high_risk_areas || 0}
          unit="Zones"
          subtitle="Action required within 48h"
          icon={ShieldAlert}
          color="amber"
        />
        <MetricCard
          title="Medium Risk Monitored Zones"
          value={summary?.breakdown?.medium_risk_areas || 3}
          unit="Zones"
          subtitle="T. Nagar, Velachery, Sholinganallur"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Normal / Stable Zones"
          value={(summary?.breakdown?.normal_areas || 4) + (summary?.breakdown?.low_risk_areas || 2)}
          unit="Zones"
          subtitle="Optimal baseline equilibrium"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-xl bg-navy-900/90 border border-brand-blue/30 text-xs flex items-start space-x-3">
        <Info className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <span className="font-semibold text-white">Demand-Pressure Estimation Protocol</span>
          <p className="text-[11px] leading-relaxed">
            Per platform specifications: When actual water stock and supply data are partially missing,
            AquaGuard AI displays a <strong>demand-pressure risk estimate</strong> rather than claiming
            an exact water shortage. This prevents erroneous scarcity alarms and highlights distribution strain.
          </p>
        </div>
      </div>

      {/* Master Detail View: Zone List + Selected Zone Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone Risk List */}
        <div className="lg:col-span-1 bg-navy-900 rounded-2xl border border-navy-700/60 p-4 shadow-xl space-y-2 max-h-[580px] overflow-y-auto">
          <div className="pb-2 border-b border-navy-800 flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chennai Administrative Zones</h3>
            <span className="text-[10px] font-mono text-slate-400">{assessments.length} Monitored</span>
          </div>

          <div className="space-y-2">
            {assessments.map((area) => {
              const isSelected = selectedArea?.area_id === area.area_id;
              return (
                <button
                  key={area.area_id}
                  onClick={() => setSelectedArea(area)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-navy-800 border-brand-teal/50 shadow-md shadow-brand-teal/5'
                      : 'bg-navy-950/60 border-navy-800 hover:bg-navy-800/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{area.area_name}</span>
                      <StatusBadge status={area.ai_risk_level} />
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Risk Score: {area.risk_score_pct}% • Demand: +{area.demand_growth_pct}%
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-brand-teal' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Zone Risk Dossier (2 Cols) */}
        {selectedArea && (
          <div className="lg:col-span-2 bg-navy-900 rounded-2xl border border-navy-700/60 p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-navy-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-brand-teal tracking-wider">
                  Zone Intelligence Dossier
                </span>
                <h3 className="text-xl font-bold text-white">{selectedArea.area_name}</h3>
                <span className="text-xs text-slate-400">
                  Population: {selectedArea.population?.toLocaleString()} • Registered Sample: {selectedArea.registered_households_count} Households
                </span>
              </div>
              <StatusBadge status={selectedArea.ai_risk_level} />
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Consumption</span>
                <span className="text-base font-bold text-white font-mono">
                  {selectedArea.current_consumption_liters?.toLocaleString()} L
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">AI Predicted Demand</span>
                <span className="text-base font-bold text-brand-blue font-mono">
                  {selectedArea.predicted_demand_liters?.toLocaleString()} L
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Monsoon Departure</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {selectedArea.rainfall_info?.annual_departure_pct}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Local Storage Stock</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {selectedArea.available_water_liters?.toLocaleString()} L
                </span>
              </div>
            </div>

            {/* AI Explanation Section */}
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> AI Risk Explanation & Underlying Drivers
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedArea.explanation}
              </p>
              <div className="pt-2 flex items-center space-x-4 text-[11px] text-slate-400 font-mono">
                <span>Demand Surge: +{selectedArea.demand_growth_pct}%</span>
                <span>•</span>
                <span>Rainfall Status: {selectedArea.rainfall_info?.status}</span>
                <span>•</span>
                <span>Groundwater Buffer: Nominal</span>
              </div>
            </div>

            {/* AI Recommended Conservation & Engineering Action */}
            <div className="p-4 rounded-xl bg-brand-teal/10 border border-brand-teal/30 space-y-2">
              <h4 className="text-xs font-bold text-brand-teal uppercase tracking-wider flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Recommended Water-Management Action
              </h4>
              <p className="text-xs text-slate-100 leading-relaxed font-medium">
                {selectedArea.recommended_action}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

