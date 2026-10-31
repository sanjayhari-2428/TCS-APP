import React, { useState, useEffect } from 'react';
import {
  Calendar,
  PlusCircle,
  Users,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

const CHENNAI_AREAS = [
  { id: 'AREA_ADYAR', name: 'Adyar / Besant Nagar' },
  { id: 'AREA_T_NAGAR', name: 'T. Nagar (Teynampet)' },
  { id: 'AREA_MYLAPORE', name: 'Mylapore' },
  { id: 'AREA_ANNA_NAGAR', name: 'Anna Nagar' },
  { id: 'AREA_VELACHERY', name: 'Velachery' },
  { id: 'AREA_GUINDY', name: 'Guindy / Alandur' },
  { id: 'AREA_KILPAUK', name: 'Kilpauk' },
  { id: 'AREA_TONDIARPET', name: 'Tondiarpet' },
  { id: 'AREA_SHOLINGANALLUR', name: 'Sholinganallur' }
];

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState(CHENNAI_AREAS[0].id);
  const [eventDate, setEventDate] = useState('2026-11-20');
  const [durationDays, setDurationDays] = useState(1);
  const [participants, setParticipants] = useState(10000);
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const selectedArea = CHENNAI_AREAS.find((a) => a.id === areaId);
    try {
      await api.createEvent({
        name,
        area_id: areaId,
        area_name: selectedArea?.name || 'Chennai Zone',
        event_date: eventDate,
        duration_days: parseInt(durationDays),
        expected_participants: parseInt(participants)
      });
      setIsModalOpen(false);
      setName('');
      loadEvents();
    } catch (err) {
      alert(err.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-brand-teal" />
            <span className="text-xs uppercase font-mono tracking-wider text-brand-teal font-semibold">
              Event-Based Water Resilience Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Chennai City Event Demand Management</h2>
          <p className="text-xs text-slate-400">
            AI Public Gathering Water Projections • Pre-emptive Logistics • Planned Consumption Demarcation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add City Event</span>
          </button>
          <button
            onClick={loadEvents}
            className="p-2 rounded-xl bg-navy-800 text-slate-400 hover:text-white border border-navy-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored City Events"
          value={events.length}
          unit="Events"
          subtitle="Marathons, Festivals, Expos"
          icon={Calendar}
          color="blue"
        />
        <MetricCard
          title="Aggregated Extra Water Demand"
          value={`${events.reduce((sum, e) => sum + (e.additional_event_demand_liters || 0), 0) / 1000} kL`}
          unit="Liters"
          subtitle="Calculated at 35 L/person/day"
          icon={Droplets}
          color="teal"
        />
        <MetricCard
          title="Total Expected Footfall"
          value={events.reduce((sum, e) => sum + (e.expected_participants || 0), 0).toLocaleString()}
          unit="Attendees"
          subtitle="Transient Demographics"
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Contingency Supply Status"
          value="Sufficient"
          unit="Tanker Backup"
          subtitle="Mobile Tankers on Standby"
          trend="No Disruption"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Events Grid (Section 7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((evt) => (
          <div
            key={evt.event_id}
            className="bg-navy-900 rounded-2xl border border-navy-700/60 p-6 shadow-xl space-y-4 hover:border-brand-teal/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-brand-teal uppercase tracking-wider block">
                  {evt.status} • {evt.event_date} ({evt.duration_days} Day{evt.duration_days > 1 ? 's' : ''})
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{evt.name}</h3>
                <span className="text-xs text-slate-400 flex items-center mt-1">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" /> {evt.area_name}
                </span>
              </div>
              <StatusBadge status={evt.demand_pressure_risk} />
            </div>

            {/* Demand Breakdown Bar */}
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Expected Normal Ward Demand:</span>
                <span className="font-mono text-slate-300 font-semibold">
                  {evt.expected_normal_demand_liters?.toLocaleString()} L
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">AI Estimated Event Extra Demand:</span>
                <span className="font-mono text-brand-teal font-bold">
                  +{evt.additional_event_demand_liters?.toLocaleString()} L
                </span>
              </div>
              <div className="pt-2 border-t border-navy-800 flex justify-between items-center text-xs">
                <span className="text-white font-bold">Total Predicted Demand:</span>
                <span className="font-mono text-amber-400 font-extrabold text-sm">
                  {evt.total_predicted_demand_liters?.toLocaleString()} L
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Available Dedicated Local Supply:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {evt.available_supply_liters?.toLocaleString()} L
                </span>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-brand-teal flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Mitigation Recommendations
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {(evt.ai_recommendations || []).map((rec, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-1.5 flex-shrink-0"></span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-brand-teal/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <h3 className="text-base font-bold text-white">Register City Event for AI Water Demand Impact</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai Island Ground Trade Fair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Event Location / Chennai Zone</label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none cursor-pointer"
                >
                  {CHENNAI_AREAS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expected Participants / Attendees</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  required
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  AI will compute per-capita public surge demand and evaluate pipeline capacity.
                </span>
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold"
                >
                  {submitting ? 'Calculating Impact...' : 'Save & Predict Demand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

