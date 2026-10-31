import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  CheckCircle2,
  Waves,
  Building,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function ReportsAnalytics() {
  const [balanceReport, setBalanceReport] = useState(null);
  const [areaComparison, setAreaComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [wb, ac] = await Promise.all([
        api.getWaterBalanceReport(),
        api.getAreaComparisonReport()
      ]);
      setBalanceReport(wb);
      setAreaComparison(ac);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCSV = () => {
    if (!areaComparison.length) return;
    const headers = ['Area ID', 'Area Name', 'Zone No', 'Registered Households', 'Avg Daily Consumption (L)', '7-Day Moving Avg (L)', 'Baseline Demand (MLD)', 'Population'];
    const rows = areaComparison.map((a) => [
      a.area_id,
      `"${a.area_name}"`,
      a.zone_no,
      a.registered_households,
      a.avg_daily_consumption_liters,
      a.seven_day_average_liters,
      a.baseline_demand_mld,
      a.population
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Chennai_Water_Resilience_Report_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <FileBarChart className="w-4 h-4 text-brand-teal" />
            <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
              Metropolitan Resilience Documentation
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Reports and Comparative Analytics</h2>
          <p className="text-xs text-slate-400">
            District Water Balance Sheet • Zone-by-Zone Consumption Audits • Exportable Compliance Documents
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-brand-teal border border-navy-700 text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Water Balance Summary Sheet */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl space-y-4">
        <div className="flex items-start justify-between pb-4 border-b border-navy-800">
          <div>
            <span className="text-[10px] font-mono uppercase text-brand-teal tracking-wider block">
              Official Executive Assessment
            </span>
            <h3 className="text-lg font-bold text-white">{balanceReport?.report_title}</h3>
            <span className="text-xs text-slate-400">
              Jurisdiction: {balanceReport?.district} • Status: {balanceReport?.status}
            </span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {balanceReport?.buffer_days_available} Days Storage Buffer
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Reservoir Storage (Mcft)</span>
            <span className="text-xl font-bold text-white font-mono">
              {balanceReport?.total_reservoir_storage_mcft?.toLocaleString()} Mcft
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Cap: {balanceReport?.total_reservoir_capacity_mcft?.toLocaleString()} Mcft
            </span>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Water Volume Equiv. (ML)</span>
            <span className="text-xl font-bold text-brand-teal font-mono">
              {balanceReport?.water_storage_equivalent_million_liters?.toLocaleString()} ML
            </span>
            <span className="text-[10px] text-emerald-400 block mt-1">
              {balanceReport?.storage_utilization_pct}% Capacity
            </span>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">City Daily Need (MLD)</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {balanceReport?.estimated_city_daily_requirement_mld} MLD
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">GCC Population Base</span>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Buffer Days Remaining</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {balanceReport?.buffer_days_available} Days
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">At Current Draw Rate</span>
          </div>
        </div>
      </div>

      {/* Area-by-Area Comparison Bar Chart */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Zone Consumption vs 7-Day Moving Baseline</h3>
            <p className="text-xs text-slate-400">Average household water draw across Chennai administrative zones (Liters)</p>
          </div>
          <span className="text-xs font-mono text-brand-teal px-2 py-0.5 bg-brand-teal/10 rounded-md">
            10 GCC Zones
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2541" />
              <XAxis dataKey="area_name" stroke="#64748B" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111C3A', borderColor: '#2A3B66', borderRadius: '0.5rem' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="avg_daily_consumption_liters" name="Avg Daily Consumption (L)" fill="#00A8E8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="seven_day_average_liters" name="7-Day Moving Avg (L)" fill="#00F5D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Zone Comparative Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white">Administrative Zone Water Extraction Audit</h3>
        <div className="overflow-x-auto rounded-xl border border-navy-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[10px] border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Area Name</th>
                <th className="py-3 px-4">Zone ID</th>
                <th className="py-3 px-4">Sample Households</th>
                <th className="py-3 px-4">Avg Daily (L)</th>
                <th className="py-3 px-4">7-Day Moving Avg (L)</th>
                <th className="py-3 px-4">Baseline Demand (MLD)</th>
                <th className="py-3 px-4">Estimated Population</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/80 bg-navy-900/60 font-mono">
              {areaComparison.map((a) => (
                <tr key={a.area_id} className="hover:bg-navy-800/40">
                  <td className="py-3 px-4 font-bold text-white font-sans">{a.area_name}</td>
                  <td className="py-3 px-4 text-slate-400">{a.area_id}</td>
                  <td className="py-3 px-4 text-slate-300">{a.registered_households} HH</td>
                  <td className="py-3 px-4 font-bold text-brand-teal">{a.avg_daily_consumption_liters} L</td>
                  <td className="py-3 px-4 text-slate-300">{a.seven_day_average_liters} L</td>
                  <td className="py-3 px-4 text-amber-400">{a.baseline_demand_mld} MLD</td>
                  <td className="py-3 px-4 text-slate-300 font-sans">{a.population?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

