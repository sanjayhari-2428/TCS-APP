import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Sparkles,
  Send,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

export default function CommandCenter() {
  const [alerts, setAlerts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Approval Decision Modal State
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [approverName, setApproverName] = useState('Dr. V. Rajesh, Executive Engineer');
  const [deciding, setDeciding] = useState(false);

  // New Task Modal State
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('pressure_tuning');
  const [taskPriority, setTaskPriority] = useState('high');
  const [taskArea, setTaskArea] = useState('Anna Nagar');
  const [taskAssignee, setTaskAssignee] = useState('CMWSSB Field Engineer');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [al, tk, ap, rc] = await Promise.all([
        api.getAlerts(),
        api.getTasks(),
        api.getApprovals(),
        api.getRecommendations()
      ]);
      setAlerts(al);
      setTasks(tk);
      setApprovals(ap);
      setRecommendations(rc);
    } catch (err) {
      console.error('Failed to load command center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAcknowledgeAlert = async (id) => {
    try {
      await api.acknowledgeAlert(id);
      loadAll();
    } catch (err) {
      alert('Error updating alert');
    }
  };

  const handleUpdateTaskStatus = async (id, status) => {
    try {
      await api.updateTaskStatus(id, { status });
      loadAll();
    } catch (err) {
      alert('Error updating task');
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedApproval) return;
    setDeciding(true);
    try {
      await api.decideApproval({
        approval_id: selectedApproval.approval_id,
        decision,
        approver_name: approverName,
        notes: decisionNotes
      });
      setSelectedApproval(null);
      setDecisionNotes('');
      loadAll();
    } catch (err) {
      alert('Error saving decision: ' + err.message);
    } finally {
      setDeciding(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.createTask({
        title: taskTitle,
        description: taskDesc,
        task_type: taskType,
        priority: taskPriority,
        area_id: `AREA_${taskArea.toUpperCase().replace(/ /g, '_')}`,
        area_name: taskArea,
        assigned_to: taskAssignee,
        latitude: 13.05,
        longitude: 80.22
      });
      setIsNewTaskOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      loadAll();
    } catch (err) {
      alert('Error creating task: ' + err.message);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.decision === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
              Human-Supervised Water Management Governance
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Human + AI Command Center</h2>
          <p className="text-xs text-slate-400">
            Mandatory Human Authorization • Zero Automated Disconnection Safeguard • Task Dispatch Board
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-lg shadow-brand-teal/20 hover:opacity-95 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Field Task</span>
          </button>
          <button
            onClick={loadAll}
            className="p-2 rounded-xl bg-navy-800 text-slate-400 hover:text-white border border-navy-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Safeguard Alert */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <span className="font-semibold text-emerald-300">
            Mandatory Ethical Human-in-the-Loop Protocol
          </span>
          <p className="text-[11px] leading-relaxed">
            Per platform specifications: AquaGuard AI does <strong>not automatically restrict, throttle,
            or disconnect essential municipal water supplies</strong>. All distribution reallocations,
            booster adjustments, and emergency tanker mobilizations require explicit, authenticated human approval.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Human Approvals"
          value={pendingApprovalsCount}
          unit="Actions"
          subtitle="Awaiting Authorized Review"
          trend={pendingApprovalsCount > 0 ? 'Review Required' : 'All Clear'}
          icon={UserCheck}
          color="amber"
        />
        <MetricCard
          title="Active Management Tasks"
          value={tasks.filter((t) => t.status !== 'completed').length}
          unit="Field Tasks"
          subtitle="Assigned to MetroWater Crews"
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Automated Real-Time Alerts"
          value={alerts.filter((a) => a.status === 'active').length}
          unit="Active"
          subtitle="Consumption & Reservoir Warnings"
          icon={AlertTriangle}
          color="purple"
        />
        <MetricCard
          title="AI Conservation Directives"
          value={recommendations.length}
          unit="Directives"
          subtitle="Generated by Resilience Engine"
          icon={Sparkles}
          color="teal"
        />
      </div>

      {/* Section 1: Human Approvals Queue (Human-in-the-Loop) */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-2"></span>
              Human Authorization & Directive Approval Queue
            </h3>
            <p className="text-xs text-slate-400">
              Review and authorize proposed municipal water adjustments, booster throttling, and conservation notices
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
            {pendingApprovalsCount} Action{pendingApprovalsCount !== 1 ? 's' : ''} Pending
          </span>
        </div>

        <div className="divide-y divide-navy-800/80">
          {approvals.map((app) => (
            <div key={app.approval_id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-slate-400 text-[10px]">{app.approval_id}</span>
                  <strong className="text-white text-sm">{app.title}</strong>
                  <StatusBadge status={app.decision} />
                </div>
                <p className="text-slate-300 leading-relaxed">{app.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Impact: {app.impact_summary}</span>
                  <span>•</span>
                  <span>Proposed: {app.proposed_by}</span>
                  {app.approver_name && <span>• Decided by: {app.approver_name}</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                {app.decision === 'pending' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedApproval(app)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs shadow-md shadow-brand-teal/15 hover:opacity-95 transition-opacity"
                    >
                      Review & Decide
                    </button>
                  </div>
                ) : (
                  <div className="text-right font-mono text-[11px] text-slate-400">
                    <span className="capitalize font-semibold block text-slate-300">{app.decision}</span>
                    <span>{app.decided_at}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: AI Water Conservation Recommendations (Section 9) */}
      <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              <Sparkles className="w-4 h-4 text-brand-teal mr-2" />
              AI Water Conservation & Resource Planning Recommendations
            </h3>
            <p className="text-xs text-slate-400">
              Proactive advisories supported by historical data, monsoon outlooks, and localized demand forecasts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-semibold">
                  {rec.category}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{rec.id}</span>
              </div>
              <h4 className="font-bold text-white text-sm">{rec.title}</h4>
              <p className="text-slate-300 leading-relaxed">{rec.reason}</p>
              <div className="p-2.5 rounded-lg bg-navy-900 border border-navy-800 text-[11px] text-slate-400 space-y-1">
                <div>
                  <strong className="text-slate-300">Supporting Data:</strong> {rec.supporting_data}
                </div>
                <div>
                  <strong className="text-brand-teal">Projected Impact:</strong> {rec.impact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Field Management Tasks Board & Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Management Tasks Board */}
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-navy-800">
            <h3 className="text-sm font-bold text-white">Water Management Field Tasks</h3>
            <span className="text-xs font-mono text-slate-400">{tasks.length} Assigned</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tasks.map((t) => (
              <div key={t.task_id} className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-1.5">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] text-purple-400 uppercase">{t.task_type} • {t.area_name}</span>
                    <strong className="font-bold text-white block">{t.title}</strong>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-slate-400 text-[11px]">{t.description}</p>
                <div className="flex justify-between items-center pt-2 border-t border-navy-800/80">
                  <span className="text-[11px] text-slate-400 font-mono">Crew: {t.assigned_to}</span>
                  {t.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateTaskStatus(t.task_id, t.status === 'pending' ? 'in_progress' : 'completed')}
                      className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-brand-teal text-[11px] font-medium border border-navy-700"
                    >
                      {t.status === 'pending' ? 'Start Task' : 'Mark Completed'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-Time Alerts Feed */}
        <div className="bg-navy-900 rounded-2xl border border-navy-700/60 p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-navy-800">
            <h3 className="text-sm font-bold text-white">Automated System Alerts</h3>
            <span className="text-xs font-mono text-slate-400">Configurable Thresholds</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map((alt) => (
              <div
                key={alt.alert_id}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  alt.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-navy-950 border-navy-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">{alt.timestamp}</span>
                    <strong className="font-bold text-white block">{alt.title}</strong>
                  </div>
                  <StatusBadge status={alt.status} />
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{alt.message}</p>
                {alt.status === 'active' && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleAcknowledgeAlert(alt.alert_id)}
                      className="text-[11px] text-brand-teal hover:underline font-medium"
                    >
                      Acknowledge Alert
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Human Approval Review Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-brand-teal/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-navy-800">
              <h3 className="text-base font-bold text-white">Executive Authorization Review</h3>
              <button onClick={() => setSelectedApproval(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-brand-teal uppercase">{selectedApproval.approval_id}</span>
              <h4 className="text-sm font-bold text-white">{selectedApproval.title}</h4>
              <p className="text-slate-300 leading-relaxed">{selectedApproval.description}</p>
              <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px]">
                <strong className="text-brand-blue block mb-1">Operational Impact Assessment:</strong>
                <p className="text-slate-300">{selectedApproval.impact_summary}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">Authorized Reviewer Identity</label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">Decision Audit Notes</label>
              <textarea
                rows={3}
                placeholder="Enter justification or specific operational remarks..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-navy-800">
              <button
                disabled={deciding}
                onClick={() => handleDecision('rejected')}
                className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold"
              >
                Reject Action
              </button>
              <button
                disabled={deciding}
                onClick={() => handleDecision('approved')}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-teal text-navy-950 font-bold shadow-lg shadow-emerald-500/20"
              >
                {deciding ? 'Recording...' : 'Authorize & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-brand-teal/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-navy-800">
              <h3 className="text-base font-bold text-white">Create Water-Management Task</h3>
              <button onClick={() => setIsNewTaskOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pressure Valve Calibration on Adyar Trunk"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Task specifications for field water engineer..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="pressure_tuning">Pressure Calibration</option>
                    <option value="tanker_dispatch">Tanker Deployment</option>
                    <option value="conservation_drive">Conservation Advisory</option>
                    <option value="redistribute_supply">Feeder Supply Shift</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chennai Zone</label>
                  <input
                    type="text"
                    value={taskArea}
                    onChange={(e) => setTaskArea(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assigned Officer / Crew</label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold"
                >
                  Create & Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

