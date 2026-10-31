import React, { useState, useEffect } from 'react';
import {
  Activity,
  Gauge,
  Droplet,
  Waves,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import { getZoneLabel } from '../utils/zoneHelper';

export default function LiveMonitoring() {
  const [stats, setStats] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');

  const loadMonitoring = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.getMonitoringStats(),
        api.getReadings({
          date: selectedDate || undefined,
          household_id: selectedHouseholdId || undefined,
          limit: 30
        })
      ]);
      setStats(s);
      setReadings(r.records || []);
    } catch (err) {
      console.error('Failed to load monitoring stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();
  }, [selectedDate, selectedHouseholdId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const res = await api.importReadingsCSV(file);
      setImportStatus({ success: true, message: res.message });
      loadMonitoring();
    } catch (err) {
      setImportStatus({ success: false, message: err.message || 'CSV validation failed' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & CSV Import */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse"></span>
            <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
              Live Network Telemetry
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Chennai Live Water Monitoring Station</h2>
          <p className="text-xs text-slate-400">
            Real-time domestic meters • Distribution line pressure • Storage tank level monitoring
          </p>
        </div>

        {/* CSV Import Button */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            <span>{importing ? 'Validating CSV...' : 'Import Zone CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            onClick={loadMonitoring}
            className="p-2 rounded-xl bg-navy-800 text-slate-400 hover:text-white border border-navy-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Import Status Alert */}
      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            importStatus.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{importStatus.message}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Reporting Water Meters"
          value={stats?.reporting_meters_count || '50'}
          unit="Active Nodes"
          subtitle={`Latest Date: ${stats?.date || '2026-09-28'}`}
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Avg Distribution Pressure"
          value={stats?.avg_system_pressure_bar || '3.82'}
          unit="Bar"
          subtitle="Nominal Target: 3.5 - 4.2 Bar"
          trend="Adequate Flow"
          icon={Gauge}
          color="teal"
        />
        <MetricCard
          title="Avg Flow Velocity"
          value={stats?.avg_distribution_flow_rate_lph || '10.2'}
          unit="LPH"
          subtitle="Zone Feeder Rate"
          icon={Droplet}
          color="purple"
        />
        <MetricCard
          title="Domestic Storage Tank Buffer"
          value={`${stats?.avg_storage_tank_level_pct || 72.4}%`}
          unit="Capacity"
          subtitle="Aggregated Overhead Tanks"
          trend="Optimal"
          icon={Waves}
          color="emerald"
        />
      </div>

      {/* Tank Level Distribution Overview */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center justify-between">
          <span>Zone Storage Tank Capacity Distribution</span>
          <span className="text-xs font-mono text-slate-400">Total 50 Cohort Tanks</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300">Healthy Tank Buffer (&gt;65%)</span>
              <span className="text-xl font-bold text-emerald-400 block font-mono">
                {stats?.tank_distribution?.healthy_above_65_pct || 36} Tanks
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">72%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300">Moderate Tank Buffer (25-65%)</span>
              <span className="text-xl font-bold text-amber-400 block font-mono">
                {stats?.tank_distribution?.moderate_25_to_65_pct || 12} Tanks
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">24%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300">Low Tank Level (&lt;25%)</span>
              <span className="text-xl font-bold text-rose-400 block font-mono">
                {stats?.tank_distribution?.low_below_25_pct || 2} Tanks
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">4%</span>
          </div>
        </div>
      </div>

      {/* Sensor Telemetry Readings Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 shadow-xl overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Live Meter Telemetry Stream</h3>
            <p className="text-xs text-slate-400">Chronological sensor readings across Chennai zone meters</p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 bg-navy-950 border border-navy-700 rounded-xl px-2.5 py-1">
              <span className="text-slate-400">Filter Zone:</span>
              <input
                type="text"
                placeholder="All (e.g. Zone A or HH001)"
                value={selectedHouseholdId}
                onChange={(e) => setSelectedHouseholdId(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none w-44 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-navy-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[11px] border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Zone ID</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Occupants</th>
                <th className="py-3 px-4">Daily Water (L)</th>
                <th className="py-3 px-4">Flow (LPH)</th>
                <th className="py-3 px-4">Pressure (Bar)</th>
                <th className="py-3 px-4">Tank Level</th>
                <th className="py-3 px-4">Temp (°C)</th>
                <th className="py-3 px-4">Rain (mm)</th>
                <th className="py-3 px-4">Est. Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/80 bg-navy-900/60 font-mono">
              {readings.map((r, i) => (
                <tr key={i} className="hover:bg-navy-800/40 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400">{r.date}</td>
                  <td className="py-2.5 px-4 font-bold text-white">
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{getZoneLabel(r.household_id)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.household_id}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-300">{r.day_of_week}</td>
                  <td className="py-2.5 px-4">{r.occupants}</td>
                  <td className="py-2.5 px-4 font-bold text-brand-teal">{r.daily_consumption_liters} L</td>
                  <td className="py-2.5 px-4 text-slate-300">{r.average_flow_liters_per_hour}</td>
                  <td className="py-2.5 px-4 text-slate-300">{r.average_pressure_bar}</td>
                  <td className="py-2.5 px-4 text-cyan-400 font-bold">{r.tank_level_percent}%</td>
                  <td className="py-2.5 px-4 text-slate-300">{r.temperature_c}°</td>
                  <td className="py-2.5 px-4 text-blue-400">{r.rainfall_mm}</td>
                  <td className="py-2.5 px-4 text-emerald-400 font-bold">₹{r.estimated_daily_bill_inr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

