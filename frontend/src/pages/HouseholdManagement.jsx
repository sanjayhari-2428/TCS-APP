import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  MapPin,
  PlusCircle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Droplets,
  Calendar,
  X
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import AssignLocationModal from '../components/AssignLocationModal';
import { getZoneLabel } from '../utils/zoneHelper';

export default function HouseholdManagement() {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [consumptionFilter, setConsumptionFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetForAssign, setTargetForAssign] = useState(null);

  const loadHouseholds = async () => {
    setLoading(true);
    try {
      const data = await api.getHouseholds();
      setHouseholds(data);
    } catch (err) {
      console.error('Failed to load households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHouseholds();
  }, []);

  const filtered = households.filter((h) => {
    const zoneName = getZoneLabel(h.household_id).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    if (
      searchTerm &&
      !h.household_id.toLowerCase().includes(searchLower) &&
      !zoneName.includes(searchLower)
    )
      return false;
    if (consumptionFilter !== 'all' && h.consumption_status !== consumptionFilter) return false;
    if (verificationFilter === 'verified' && !h.has_verified_coordinates) return false;
    if (verificationFilter === 'unassigned' && h.has_verified_coordinates) return false;
    return true;
  });

  const handleOpenAssign = (h) => {
    setTargetForAssign(h);
    setIsAssignModalOpen(true);
  };

  const handleViewDetails = async (h) => {
    try {
      const details = await api.getHouseholdDetails(h.household_id);
      setSelectedHousehold(details);
    } catch (err) {
      setSelectedHousehold(h);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal"></span>
            <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
              District Zonal Registry
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Chennai District Zone Water Monitoring</h2>
          <p className="text-xs text-slate-400">
            50 Smart-Metered Zones (Zone A to Zone AX) • Zero Leakage Detection Scope • Admin GIS Registration
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right text-xs">
            <span className="text-slate-400 block">Total Monitored Cohort</span>
            <span className="text-white font-bold font-mono text-base">{households.length} Zones</span>
          </div>
          <button
            onClick={() => handleOpenAssign(null)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Admin Assign GPS</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-navy-900/80 border border-navy-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center bg-navy-950 border border-navy-700 rounded-xl px-3 py-1.5 w-64">
            <Search className="w-3.5 h-3.5 text-brand-teal mr-2" />
            <input
              type="text"
              placeholder="Search Zone (e.g. Zone A, Zone B)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none w-full"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Consumption Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Consumption:</span>
            <select
              value={consumptionFilter}
              onChange={(e) => setConsumptionFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 text-white rounded-xl px-3 py-1.5 focus:border-brand-teal focus:outline-none cursor-pointer"
            >
              <option value="all">All Consumption Status</option>
              <option value="Normal">Normal (&lt;300 L)</option>
              <option value="High">High (300-400 L)</option>
              <option value="Very High">Very High (&gt;400 L)</option>
            </select>
          </div>

          {/* Coordinate Verification Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">GPS Status:</span>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 text-white rounded-xl px-3 py-1.5 focus:border-brand-teal focus:outline-none cursor-pointer"
            >
              <option value="all">All Zones</option>
              <option value="verified">Verified Coordinates (Mapped)</option>
              <option value="unassigned">Unassigned (Demo List)</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 font-mono">
          Showing {filtered.length} of {households.length} zones
        </span>
      </div>

      {/* Zone Grid / Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[11px] border-b border-navy-800">
              <tr>
                <th className="py-3.5 px-4">Zone ID</th>
                <th className="py-3.5 px-4">Occupants</th>
                <th className="py-3.5 px-4">Daily Consumption</th>
                <th className="py-3.5 px-4">30-Day Total</th>
                <th className="py-3.5 px-4">7-Day Moving Avg</th>
                <th className="py-3.5 px-4">Predicted Future</th>
                <th className="py-3.5 px-4">Estimated Bill</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Chennai Area</th>
                <th className="py-3.5 px-4">GPS Verification</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/80 bg-navy-900/60">
              {filtered.map((h) => (
                <tr key={h.household_id} className="hover:bg-navy-800/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm tracking-wide">
                        {getZoneLabel(h.household_id)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {h.household_id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">{h.occupants} persons</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-teal">{h.daily_consumption} L</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{h.monthly_consumption?.toLocaleString()} L</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{h.seven_day_average} L</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-brand-blue">
                    {h.predicted_future_consumption} L
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">₹{h.estimated_bill_inr}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={h.consumption_status} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{h.area_name}</td>
                  <td className="py-3.5 px-4">
                    {h.has_verified_coordinates ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <HelpCircle className="w-3 h-3 mr-1" /> Unassigned
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleViewDetails(h)}
                      className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 text-xs font-medium transition-colors"
                    >
                      History
                    </button>
                    <button
                      onClick={() => handleOpenAssign(h)}
                      className="px-2.5 py-1 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue border border-brand-blue/30 text-xs font-medium transition-colors"
                    >
                      {h.has_verified_coordinates ? 'Edit GPS' : 'Assign GPS'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedHousehold && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-brand-teal/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Telemetry Profile: {getZoneLabel(selectedHousehold.household_id)} ({selectedHousehold.household_id})
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedHousehold.area_name} • {selectedHousehold.occupants} Occupants
                </span>
              </div>
              <button
                onClick={() => setSelectedHousehold(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Daily Consumption</span>
                <span className="text-lg font-bold text-brand-teal block">{selectedHousehold.daily_consumption} L</span>
              </div>
              <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">7-Day Moving Avg</span>
                <span className="text-lg font-bold text-slate-200 block">{selectedHousehold.seven_day_average} L</span>
              </div>
              <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">AI Predicted Demand</span>
                <span className="text-lg font-bold text-brand-blue block">
                  {selectedHousehold.predicted_future_consumption} L
                </span>
              </div>
              <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Est. Monthly Bill</span>
                <span className="text-lg font-bold text-emerald-400 block font-mono">
                  ₹{selectedHousehold.estimated_bill_inr}
                </span>
              </div>
            </div>

            {/* Reading History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recent Meter Readings Log</h4>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-navy-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Consumption</th>
                      <th className="py-2 px-3">Temp (°C)</th>
                      <th className="py-2 px-3">Rain (mm)</th>
                      <th className="py-2 px-3">Tank Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/60 bg-navy-900/60">
                    {(selectedHousehold.reading_history || []).slice(-7).map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-mono text-slate-400">{r.date}</td>
                        <td className="py-2 px-3 font-bold text-brand-teal">{r.daily_consumption_liters} L</td>
                        <td className="py-2 px-3">{r.temperature_c}°C</td>
                        <td className="py-2 px-3">{r.rainfall_mm} mm</td>
                        <td className="py-2 px-3 font-mono text-cyan-400">{r.tank_level_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedHousehold(null)}
                className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Assign Location Modal */}
      {isAssignModalOpen && (
        <AssignLocationModal
          household={targetForAssign}
          unassignedList={households.filter((h) => !h.has_verified_coordinates)}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => loadHouseholds()}
        />
      )}
    </div>
  );
}
