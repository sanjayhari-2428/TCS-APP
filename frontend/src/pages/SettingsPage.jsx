import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Sliders,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [mongoUri, setMongoUri] = useState('mongodb://localhost:27017');
  const [dbName, setDbName] = useState('aquaguard_ai_chennai');
  const [highThreshold, setHighThreshold] = useState(380.0);
  const [lowResThreshold, setLowResThreshold] = useState(35.0);
  const [tariff, setTariff] = useState(10.0);
  const [loading, setLoading] = useState(true);
  const [savingMongo, setSavingMongo] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
      if (data.configured_mongo_uri) setMongoUri(data.configured_mongo_uri);
      if (data.database_name) setDbName(data.database_name);
      if (data.thresholds) {
        setHighThreshold(data.thresholds.high_consumption_threshold_liters || 380);
        setLowResThreshold(data.thresholds.low_reservoir_threshold_pct || 35);
        setTariff(data.thresholds.tariff_inr_per_1000_liters || 10);
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleUpdateMongo = async (e) => {
    e.preventDefault();
    setSavingMongo(true);
    setNotice(null);
    try {
      const res = await api.updateMongoConfig({
        mongo_uri: mongoUri,
        db_name: dbName
      });
      setNotice({ success: true, message: res.message });
      loadStatus();
    } catch (err) {
      setNotice({ success: false, message: err.message || 'Failed to connect to MongoDB' });
    } finally {
      setSavingMongo(false);
    }
  };

  const handleUpdateThresholds = async (e) => {
    e.preventDefault();
    setSavingThresholds(true);
    setNotice(null);
    try {
      const res = await api.updateThresholds({
        high_consumption_threshold_liters: parseFloat(highThreshold),
        low_reservoir_threshold_pct: parseFloat(lowResThreshold),
        tariff_inr_per_1000_liters: parseFloat(tariff)
      });
      setNotice({ success: true, message: res.message });
      loadStatus();
    } catch (err) {
      setNotice({ success: false, message: err.message || 'Failed to update thresholds' });
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleReseed = async () => {
    if (!window.confirm('Reset and re-seed all 13 MongoDB collections from original CSVs?')) return;
    setReseeding(true);
    setNotice(null);
    try {
      const res = await api.triggerReseed();
      setNotice({ success: true, message: res.message });
      loadStatus();
    } catch (err) {
      setNotice({ success: false, message: err.message || 'Reseed failed' });
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl space-y-1">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-brand-teal" />
          <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
            System Administration & Infrastructure Governance
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">AquaGuard AI System Settings</h2>
        <p className="text-xs text-slate-400">
          MongoDB Connection Status • AI Threshold Calibration • 13 Schema Collections
        </p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            notice.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notice.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Database Connection & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MongoDB Config Form */}
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-800">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Database className="w-4 h-4 text-brand-teal mr-2" /> MongoDB Database Configuration
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                status?.is_live_mongo
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {status?.is_live_mongo ? 'Live MongoDB Connected' : 'Mock MongoDB Active'}
            </span>
          </div>

          <form onSubmit={handleUpdateMongo} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                MongoDB Connection URI
              </label>
              <input
                type="text"
                required
                value={mongoUri}
                onChange={(e) => setMongoUri(e.target.value)}
                placeholder="mongodb://localhost:27017 or mongodb+srv://..."
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Supports local mongod daemon or remote MongoDB Atlas cluster.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Database Name
              </label>
              <input
                type="text"
                required
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingMongo}
                className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue/80 text-white font-bold text-xs transition-colors"
              >
                {savingMongo ? 'Connecting...' : 'Test & Connect MongoDB'}
              </button>
            </div>
          </form>
        </div>

        {/* Operational Thresholds Form */}
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-800">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Sliders className="w-4 h-4 text-cyan-400 mr-2" /> Water Resilience Alert Thresholds
            </h3>
            <span className="text-xs font-mono text-slate-400">Automated Rules</span>
          </div>

          <form onSubmit={handleUpdateThresholds} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                High-Consumption Alert Trigger (Liters/Day)
              </label>
              <input
                type="number"
                step="10"
                value={highThreshold}
                onChange={(e) => setHighThreshold(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Low Reservoir Storage Alert Trigger (%)
              </label>
              <input
                type="number"
                step="5"
                value={lowResThreshold}
                onChange={(e) => setLowResThreshold(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Domestic Tariff (₹ per 1,000 Liters)
              </label>
              <input
                type="number"
                step="0.5"
                value={tariff}
                onChange={(e) => setTariff(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingThresholds}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs transition-opacity"
              >
                {savingThresholds ? 'Updating...' : 'Save Rules & Thresholds'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 13 MongoDB Collections Health Audit (Section 10) */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center">
              <Layers className="w-4 h-4 text-purple-400 mr-2" />
              13 MongoDB Collections Status & Document Counts
            </h3>
            <p className="text-xs text-slate-400">Strictly organized schema matching platform architecture</p>
          </div>
          <button
            onClick={handleReseed}
            disabled={reseeding}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reseeding ? 'animate-spin' : ''}`} />
            <span>{reseeding ? 'Reseeding...' : 'Reset & Reseed All Collections'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.entries(status?.collections || {}).map(([colName, count]) => (
            <div key={colName} className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-mono block truncate">{colName}</span>
              <span className="text-lg font-bold text-white font-mono block">
                {count?.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 block font-mono">Status: Ready</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

