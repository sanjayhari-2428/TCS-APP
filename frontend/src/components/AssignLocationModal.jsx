import React, { useState } from 'react';
import { X, MapPin, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const CHENNAI_AREAS = [
  { id: 'AREA_T_NAGAR', name: 'T. Nagar (Teynampet)', lat: 13.0418, lng: 80.2341 },
  { id: 'AREA_ANNA_NAGAR', name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
  { id: 'AREA_ADYAR', name: 'Adyar', lat: 13.0012, lng: 80.2565 },
  { id: 'AREA_VELACHERY', name: 'Velachery', lat: 12.9815, lng: 80.2180 },
  { id: 'AREA_MYLAPORE', name: 'Mylapore', lat: 13.0368, lng: 80.2676 },
  { id: 'AREA_GUINDY', name: 'Guindy / Alandur', lat: 13.0067, lng: 80.2025 },
  { id: 'AREA_KILPAUK', name: 'Kilpauk', lat: 13.0784, lng: 80.2412 },
  { id: 'AREA_TONDIARPET', name: 'Tondiarpet', lat: 13.1255, lng: 80.2891 },
  { id: 'AREA_SHOLINGANALLUR', name: 'Sholinganallur', lat: 12.8997, lng: 80.2279 }
];

export default function AssignLocationModal({ household, unassignedList = [], onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(household ? household.household_id : (unassignedList[0]?.household_id || ''));
  const [selectedArea, setSelectedArea] = useState(CHENNAI_AREAS[0]);
  const [latitude, setLatitude] = useState(household?.latitude || selectedArea.lat);
  const [longitude, setLongitude] = useState(household?.longitude || selectedArea.lng);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAreaChange = (e) => {
    const areaId = e.target.value;
    const area = CHENNAI_AREAS.find((a) => a.id === areaId) || CHENNAI_AREAS[0];
    setSelectedArea(area);
    // Add small jitter to avoid perfect collision if multiple households in same ward
    const jitterLat = (Math.random() - 0.5) * 0.006;
    const jitterLng = (Math.random() - 0.5) * 0.006;
    setLatitude(Number((area.lat + jitterLat).toFixed(4)));
    setLongitude(Number((area.lng + jitterLng).toFixed(4)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setError('Please select a household.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await api.assignHouseholdLocation(selectedId, {
        household_id: selectedId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        area_id: selectedArea.id,
        area_name: selectedArea.name,
        notes: notes || 'Assigned via Chennai District Admin Portal'
      });
      onSuccess && onSuccess(selectedId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign coordinates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4">
      <div className="bg-navy-900 border border-brand-teal/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-950/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-brand-teal/15 text-brand-teal">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Assign Chennai District Coordinates</h3>
              <p className="text-xs text-slate-400">Admin Interface for Household GIS Registration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Household Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Household ID
            </label>
            {household ? (
              <div className="px-3 py-2 bg-navy-950 rounded-xl border border-navy-700 text-white font-mono text-sm font-bold">
                {household.household_id} ({household.occupants} occupants • {household.daily_consumption} L/day)
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-teal focus:outline-none"
              >
                {unassignedList.map((h) => (
                  <option key={h.household_id} value={h.household_id}>
                    {h.household_id} ({h.consumption_status} • {h.daily_consumption} L/day)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Chennai Area Assigner */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assigned Chennai Area / Ward
            </label>
            <select
              value={selectedArea.id}
              onChange={handleAreaChange}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-teal focus:outline-none cursor-pointer"
            >
              {CHENNAI_AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinates Lat / Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-brand-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-brand-teal focus:outline-none"
              />
            </div>
          </div>

          {/* Verification Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Verification Notes / Door No.
            </label>
            <input
              type="text"
              placeholder="e.g. Verified by CMWSSB Ward 112 Field Officer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-teal focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] text-slate-400">
            <span className="text-brand-teal font-semibold">Strict Data Governance:</span> Synthetic household readings are never presented with simulated coordinates without explicit Admin verification.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-800 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <span>Registering...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Verified Location</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

