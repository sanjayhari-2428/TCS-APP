import React, { useState, useEffect } from 'react';
import {
  Waves,
  PlusCircle,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  Info,
  X
} from 'lucide-react';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

export default function ReservoirManagement() {
  const [reservoirs, setReservoirs] = useState([]);
  const [distPoints, setDistPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservoir, setEditingReservoir] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formLat, setFormLat] = useState(13.08);
  const [formLng, setFormLng] = useState(80.20);
  const [formCurLevel, setFormCurLevel] = useState(20.0);
  const [formMaxLevel, setFormMaxLevel] = useState(24.0);
  const [formCapacity, setFormCapacity] = useState(3000.0);
  const [formCurrent, setFormCurrent] = useState(2200.0);
  const [formInflow, setFormInflow] = useState(250.0);
  const [formOutflow, setFormOutflow] = useState(150.0);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, dp] = await Promise.all([
        api.getReservoirs(),
        api.getDistributionPoints()
      ]);
      setReservoirs(res);
      setDistPoints(dp);
    } catch (err) {
      console.error('Failed to load reservoirs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (r = null) => {
    if (r) {
      setEditingReservoir(r);
      setFormName(r.name);
      setFormLocation(r.location);
      setFormLat(r.latitude);
      setFormLng(r.longitude);
      setFormCurLevel(r.current_level_ft);
      setFormMaxLevel(r.max_level_ft);
      setFormCapacity(r.storage_capacity_mcft);
      setFormCurrent(r.current_storage_mcft);
      setFormInflow(r.inflow_cusecs || 0);
      setFormOutflow(r.outflow_cusecs || 0);
    } else {
      setEditingReservoir(null);
      setFormName('');
      setFormLocation('Chennai Catchment');
      setFormLat(13.05);
      setFormLng(80.15);
      setFormCurLevel(15.0);
      setFormMaxLevel(20.0);
      setFormCapacity(1500.0);
      setFormCurrent(1000.0);
      setFormInflow(100.0);
      setFormOutflow(80.0);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formName,
        location: formLocation,
        latitude: parseFloat(formLat),
        longitude: parseFloat(formLng),
        current_level_ft: parseFloat(formCurLevel),
        max_level_ft: parseFloat(formMaxLevel),
        storage_capacity_mcft: parseFloat(formCapacity),
        current_storage_mcft: parseFloat(formCurrent),
        inflow_cusecs: parseFloat(formInflow),
        outflow_cusecs: parseFloat(formOutflow)
      };

      if (editingReservoir) {
        await api.updateReservoir(editingReservoir.reservoir_id, payload);
      } else {
        await api.addReservoir(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Error saving reservoir data');
    } finally {
      setSaving(false);
    }
  };

  // Aggregate stats
  const totalCap = reservoirs.reduce((sum, r) => sum + (r.storage_capacity_mcft || 0), 0);
  const totalCur = reservoirs.reduce((sum, r) => sum + (r.current_storage_mcft || 0), 0);
  const avgPct = totalCap ? ((totalCur / totalCap) * 100).toFixed(1) : '68.2';

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 font-semibold">
              CMWSSB Raw Water Storage & Distribution Network
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Chennai Reservoir & Storage Infrastructure</h2>
          <p className="text-xs text-slate-400">
            Chembarambakkam • Poondi • Red Hills (Puzhal) • Cholavaram • Veeranam • Porur
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleOpenModal(null)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Reservoir / Tank</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-navy-800 text-slate-400 hover:text-white border border-navy-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate Reservoir Storage Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Chennai Reservoir Storage"
          value={totalCur.toLocaleString()}
          unit="Mcft"
          subtitle={`Capacity: ${totalCap.toLocaleString()} Mcft`}
          icon={Waves}
          color="teal"
        />
        <MetricCard
          title="Overall Available Volume"
          value={`${avgPct}%`}
          unit="Aggregate"
          subtitle="Buffer: >120 Supply Days"
          trend="Healthy"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Monitored Water Reservoirs"
          value={reservoirs.length}
          unit="Lakes"
          subtitle="6 Major Metropolitan Catchments"
          icon={Waves}
          color="blue"
        />
        <MetricCard
          title="Headworks & Distribution Stations"
          value={distPoints.length}
          unit="Pumping Nodes"
          subtitle="Kilpauk, Anna Nagar, T. Nagar..."
          icon={Building}
          color="purple"
        />
      </div>

      {/* Reservoir Cards Grid (Section 2.C) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reservoirs.map((res) => {
          const pct = res.available_volume_pct || 65.0;
          return (
            <div
              key={res.reservoir_id}
              className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4 hover:border-brand-teal/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{res.name}</h3>
                  <span className="text-[11px] text-slate-400 block">{res.location}</span>
                </div>
                <StatusBadge status={res.status} />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Storage Volume:</span>
                  <span className="text-brand-teal font-bold">{pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-navy-950 overflow-hidden border border-navy-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 60 ? 'bg-emerald-400' : pct > 30 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-navy-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Storage</span>
                  <span className="font-mono font-bold text-white">{res.current_storage_mcft} Mcft</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Capacity</span>
                  <span className="font-mono text-slate-300">{res.storage_capacity_mcft} Mcft</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Water Level</span>
                  <span className="font-mono text-cyan-400">{res.current_level_ft} / {res.max_level_ft} ft</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Inflow / Outflow</span>
                  <span className="font-mono text-slate-300">{res.inflow_cusecs} / {res.outflow_cusecs} cusecs</span>
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-2 border-t border-navy-800/80 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-mono">Updated: {res.last_updated}</span>
                <button
                  onClick={() => handleOpenModal(res)}
                  className="flex items-center space-x-1 text-brand-teal hover:underline font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Update Reading</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Water Distribution Points & Headworks Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white">Water Distribution Points & Booster Pumping Stations</h3>
        <div className="overflow-x-auto rounded-xl border border-navy-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-950 text-slate-400 uppercase font-mono text-[10px] border-b border-navy-800">
              <tr>
                <th className="py-2.5 px-4">Station Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Chennai Zone</th>
                <th className="py-2.5 px-4">Capacity (ML)</th>
                <th className="py-2.5 px-4">Current Volume (ML)</th>
                <th className="py-2.5 px-4">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/80 bg-navy-900/60 font-mono">
              {distPoints.map((dp) => (
                <tr key={dp.point_id} className="hover:bg-navy-800/40">
                  <td className="py-3 px-4 font-bold text-white font-sans">{dp.name}</td>
                  <td className="py-3 px-4 capitalize text-brand-blue">{dp.type?.replace('_', ' ')}</td>
                  <td className="py-3 px-4 font-sans text-slate-300">{dp.area_name}</td>
                  <td className="py-3 px-4 text-slate-200">{(dp.capacity_liters / 1000000).toFixed(1)} ML</td>
                  <td className="py-3 px-4 font-bold text-brand-teal">{(dp.current_volume_liters / 1000000).toFixed(1)} ML</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {dp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-brand-teal/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <h3 className="text-base font-bold text-white">
                {editingReservoir ? `Update ${editingReservoir.name}` : 'Register New Water Reservoir / Tank'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reservoir / Tank Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Location / Ward</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Current Storage (Mcft)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Capacity (Mcft)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Current Water Level (ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formCurLevel}
                    onChange={(e) => setFormCurLevel(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Reservoir Level (ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMaxLevel}
                    onChange={(e) => setFormMaxLevel(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Inflow (cusecs)</label>
                  <input
                    type="number"
                    step="1"
                    value={formInflow}
                    onChange={(e) => setFormInflow(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Outflow (cusecs)</label>
                  <input
                    type="number"
                    step="1"
                    value={formOutflow}
                    onChange={(e) => setFormOutflow(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold"
                >
                  {saving ? 'Saving...' : 'Save Reservoir Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

