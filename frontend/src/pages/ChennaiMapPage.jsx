import React, { useState, useEffect } from 'react';
import ChennaiMap from '../components/ChennaiMap';
import AssignLocationModal from '../components/AssignLocationModal';
import { api } from '../services/api';
import {
  MapPin,
  Layers,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Info
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getZoneLabel } from '../utils/zoneHelper';

export default function ChennaiMapPage() {
  const [households, setHouseholds] = useState([]);
  const [reservoirs, setReservoirs] = useState([]);
  const [riskAreas, setRiskAreas] = useState([]);
  const [distPoints, setDistPoints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin Assign Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetHousehold, setTargetHousehold] = useState(null);

  // Tab: Map View vs Unassigned List
  const [activeTab, setActiveTab] = useState('map'); // 'map' or 'unassigned'

  const loadAllMapData = async () => {
    setLoading(true);
    try {
      const [hh, res, ra, dp, tsk, geo] = await Promise.all([
        api.getHouseholds(),
        api.getReservoirs(),
        api.getAreaRiskAssessments(),
        api.getDistributionPoints(),
        api.getTasks(),
        api.getChennaiGeoJSON()
      ]);
      setHouseholds(hh);
      setReservoirs(res);
      setRiskAreas(ra);
      setDistPoints(dp);
      setTasks(tsk);
      setGeojsonData(geo);
    } catch (err) {
      console.error('Error loading map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMapData();
  }, []);

  const unassignedHouseholds = households.filter((h) => !h.has_verified_coordinates);
  const verifiedHouseholds = households.filter((h) => h.has_verified_coordinates);

  const handleOpenAssign = (hh = null) => {
    setTargetHousehold(hh);
    setIsAssignModalOpen(true);
  };

  const handleAssignSuccess = (householdId) => {
    loadAllMapData();
  };

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-900 px-5 py-3 rounded-2xl border border-navy-700/60 shadow-lg flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-brand-teal/15 text-brand-teal">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Chennai Water Intelligence Map</h2>
            <p className="text-xs text-slate-400">
              Interactive GIS layer controls • OpenStreetMap base • GCC 15-Zone Boundaries
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Toggle View Tabs */}
          <div className="flex bg-navy-950 p-1 rounded-xl border border-navy-800 text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive Map ({verifiedHouseholds.length} Mapped)
            </button>
            <button
              onClick={() => setActiveTab('unassigned')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'unassigned'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Unassigned Zones</span>
              {unassignedHouseholds.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-navy-950 font-bold text-[10px] flex items-center justify-center">
                  {unassignedHouseholds.length}
                </span>
              )}
            </button>
          </div>

          {/* Admin Assign Button */}
          <button
            onClick={() => handleOpenAssign(null)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-md shadow-brand-teal/20 hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Admin Assign GPS</span>
          </button>

          <button
            onClick={loadAllMapData}
            className="p-2 rounded-xl bg-navy-800 text-slate-400 hover:text-white border border-navy-700"
            title="Refresh Map Layers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'map' ? (
        <div className="flex-1 w-full rounded-2xl overflow-hidden relative min-h-0">
          <ChennaiMap
            households={households}
            reservoirs={reservoirs}
            riskAreas={riskAreas}
            distributionPoints={distPoints}
            tasks={tasks}
            geojsonData={geojsonData}
            onOpenAssignModal={handleOpenAssign}
          />
        </div>
      ) : (
        /* Unassigned Households/Zones Queue (Section 2.A compliance) */
        <div className="flex-1 overflow-y-auto bg-navy-900 rounded-2xl border border-navy-700/60 p-6 shadow-xl space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-3 text-xs">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-300">
              <strong className="text-amber-300 font-semibold block text-sm">
                Strict Spatial Integrity Compliance: No Imaginary Coordinates
              </strong>
              <p>
                The 50-zone consumption dataset lacks GPS coordinates. Per project guidelines,
                AquaGuard AI does not synthesize fake zone locations. Zones without admin-assigned
                coordinates are quarantined below. Use the "Assign Chennai Coordinates" action to pin them
                to actual GCC zones.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-navy-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[11px] border-b border-navy-800">
                <tr>
                  <th className="py-3 px-4">Zone ID</th>
                  <th className="py-3 px-4">Occupants</th>
                  <th className="py-3 px-4">Daily Consumption</th>
                  <th className="py-3 px-4">7-Day Moving Avg</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Coordinates Status</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/80 bg-navy-900/60">
                {unassignedHouseholds.map((h) => (
                  <tr key={h.household_id} className="hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <div className="flex flex-col">
                        <span>{getZoneLabel(h.household_id)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{h.household_id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{h.occupants} persons</td>
                    <td className="py-3 px-4 font-mono font-semibold text-brand-teal">{h.daily_consumption} L</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{h.seven_day_average} L</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={h.consumption_status} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Unassigned (Demo List)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAssign(h)}
                        className="px-3 py-1 rounded-lg bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border border-brand-blue/30 text-xs font-medium transition-colors"
                      >
                        Assign Coordinates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Assign Location Modal */}
      {isAssignModalOpen && (
        <AssignLocationModal
          household={targetHousehold}
          unassignedList={unassignedHouseholds}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}

