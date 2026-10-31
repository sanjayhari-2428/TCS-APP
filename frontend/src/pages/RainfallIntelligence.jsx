import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  TrendingUp,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Waves,
  Sun,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function RainfallIntelligence() {
  const [annualRecords, setAnnualRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [weatherLogs, setWeatherLogs] = useState(null);
  const [rainfallVsCons, setRainfallVsCons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ann, sm, logs, rvc] = await Promise.all([
        api.getAnnualRainfall(),
        api.getRainfallSummary(),
        api.getWeatherObservations(15),
        api.getRainfallVsConsumption()
      ]);
      setAnnualRecords(ann);
      setSummary(sm);
      setWeatherLogs(logs);
      setRainfallVsCons(rvc);
    } catch (err) {
      console.error('Failed to load rainfall data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg(null);
    try {
      const res = await api.importRainfallCSV(file);
      setImportMsg({ success: true, message: res.message });
      loadData();
    } catch (err) {
      setImportMsg({ success: false, message: err.message || 'Import failed' });
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
            <CloudRain className="w-4 h-4 text-brand-teal" />
            <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
              India Meteorological Department (IMD) Ground Station Data
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Chennai District Rainfall Intelligence</h2>
          <p className="text-xs text-slate-400">
            Multi-Year Annual Rainfall Series • Northeast Monsoon Catchment Recharges • Cyclical Deficit Modeling
          </p>
        </div>

        {/* CSV Import */}
        <label className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>{importing ? 'Importing CSV...' : 'Import Rainfall CSV'}</span>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {/* Import Notification */}
      {importMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            importMsg.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {importMsg.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{importMsg.message}</span>
          </div>
          <button onClick={() => setImportMsg(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards (Section 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Average Annual Rainfall"
          value={summary?.average_annual_rainfall_mm || '1,344.5'}
          unit="mm / year"
          subtitle={`IMD Normal Baseline: ${summary?.normal_baseline_mm || 1400} mm`}
          icon={CloudRain}
          color="blue"
        />
        <MetricCard
          title="Highest Rainfall Year"
          value={`${summary?.highest_rainfall_year?.year || '2015'}`}
          unit={`${summary?.highest_rainfall_year?.rainfall_mm || '2,095.7'} mm`}
          subtitle="Catastrophic Flood Depressions (+49.7%)"
          trend="Extreme Surplus"
          icon={Waves}
          color="teal"
        />
        <MetricCard
          title="Lowest Rainfall Year"
          value={`${summary?.lowest_rainfall_year?.year || '2019'}`}
          unit={`${summary?.lowest_rainfall_year?.rainfall_mm || '720.5'} mm`}
          subtitle="Historic 'Day Zero' Drought (-48.5%)"
          trend="Severe Deficit"
          icon={AlertTriangle}
          color="amber"
        />
        <MetricCard
          title="15-Year Historical Cycles"
          value={`${summary?.historical_cycles?.deficit_years || 6} Deficit`}
          unit={`/ ${summary?.total_recorded_years || 15} Yrs`}
          subtitle={`Excess: ${summary?.historical_cycles?.excess_years || 4} • Normal: ${summary?.historical_cycles?.normal_years || 5}`}
          trend={summary?.trend?.interpretation || 'Stable Cyclical'}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Main Annual Rainfall Chart with Normal Reference Line */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-teal mr-2"></span>
              Annual Historical Rainfall in Chennai District ({summary?.record_span || '2010 - 2024'})
            </h3>
            <p className="text-xs text-slate-400">
              Yearly precipitation measured in mm compared to IMD long-period normal (1,400 mm)
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            IMD Normal: 1,400 mm
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={annualRecords}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2541" />
              <XAxis dataKey="year" stroke="#64748B" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111C3A', borderColor: '#2A3B66', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#00F5D4', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine y={1400} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Normal (1400mm)', fill: '#EF4444', fontSize: 11, position: 'top' }} />
              <Bar
                dataKey="rainfall_mm"
                name="Annual Rainfall (mm)"
                fill="#00A8E8"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rainfall Trend Line & Rainfall vs Water Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rainfall Trend Over Years */}
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Year-on-Year Rainfall Trajectory</h3>
              <p className="text-xs text-slate-400">Monsoon oscillation and departure trajectory</p>
            </div>
            <span className="text-xs font-mono text-brand-blue px-2 py-0.5 bg-brand-blue/10 rounded-md">
              {summary?.trend?.slope_mm_per_year > 0 ? `+${summary?.trend?.slope_mm_per_year} mm/yr` : `${summary?.trend?.slope_mm_per_year} mm/yr`}
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={annualRecords}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2541" />
                <XAxis dataKey="year" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C3A', borderColor: '#2A3B66', borderRadius: '0.5rem' }}
                />
                <Line
                  type="monotone"
                  dataKey="rainfall_mm"
                  name="Recorded Rainfall (mm)"
                  stroke="#00F5D4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#00F5D4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rainfall vs Water Consumption */}
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Rainfall vs Domestic Water Consumption</h3>
              <p className="text-xs text-slate-400">Daily rainfall events dampen domestic grid extraction</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-md">
              Demonstration Window
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rainfallVsCons}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2541" />
                <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#00F5D4" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#3B82F6" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C3A', borderColor: '#2A3B66', borderRadius: '0.5rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avg_consumption_liters"
                  name="Consumption (L)"
                  stroke="#00F5D4"
                  strokeWidth={2}
                  dot={false}
                />
                <Bar
                  yAxisId="right"
                  dataKey="rainfall_mm"
                  name="Rainfall (mm)"
                  fill="#3B82F6"
                  opacity={0.6}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chennai Clean Weather Dataset Sample Logs */}
      {weatherLogs && (
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Clean15YearChennaiWeather Observation Sample</h3>
              <p className="text-xs text-slate-400">
                1,068 Weather observations ({weatherLogs.years_covered?.join(', ')}) integrated into intelligence pipeline
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total Observations: {weatherLogs.total_observations}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-navy-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[10px] border-b border-navy-800">
                <tr>
                  <th className="py-2.5 px-3">Date Window</th>
                  <th className="py-2.5 px-3">Condition Description</th>
                  <th className="py-2.5 px-3">Temp (°C)</th>
                  <th className="py-2.5 px-3">Barometer (mbar)</th>
                  <th className="py-2.5 px-3">Humidity (%)</th>
                  <th className="py-2.5 px-3">Wind (km/h)</th>
                  <th className="py-2.5 px-3">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/80 bg-navy-900/60 font-mono text-[11px]">
                {(weatherLogs.sample_records || []).slice(0, 7).map((w, idx) => (
                  <tr key={idx} className="hover:bg-navy-800/40">
                    <td className="py-2 px-3 text-slate-300 font-sans">{w.date}</td>
                    <td className="py-2 px-3 text-brand-teal font-sans">{w.desc}</td>
                    <td className="py-2 px-3 text-amber-400">{w.temp}°C</td>
                    <td className="py-2 px-3 text-slate-400">{w.baro}</td>
                    <td className="py-2 px-3 text-cyan-400">{w.hum}%</td>
                    <td className="py-2 px-3 text-slate-300">{w.wind}</td>
                    <td className="py-2 px-3 font-bold text-white">{w.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

