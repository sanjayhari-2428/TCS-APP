import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Users,
  Activity,
  TrendingUp,
  CloudRain,
  AlertTriangle,
  Waves,
  Calendar,
  ShieldCheck,
  FileBarChart,
  Settings,
  Droplets,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, isCollapsed, setIsCollapsed }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'map', label: 'Chennai District Map', icon: MapPin, badge: 'GIS' },
    { id: 'households', label: 'Zone Management', icon: Users, badge: '50 Zones' },
    { id: 'monitoring', label: 'Live Water Monitoring', icon: Activity, badge: 'Live' },
    { id: 'forecasting', label: 'AI Demand Forecasting', icon: TrendingUp, badge: 'RF Model' },
    { id: 'rainfall', label: 'Rainfall Intelligence', icon: CloudRain, badge: '15 Yrs' },
    { id: 'shortage_risk', label: 'Shortage Risk Analysis', icon: AlertTriangle, badge: 'AI Risk' },
    { id: 'reservoirs', label: 'Reservoir Management', icon: Waves, badge: '6 Lakes' },
    { id: 'events', label: 'Event Management', icon: Calendar, badge: null },
    { id: 'command_center', label: 'Human Command Center', icon: ShieldCheck, badge: 'Human+AI' },
    { id: 'reports', label: 'Reports and Analytics', icon: FileBarChart, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-navy-900 border-r border-navy-700/60 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-navy-700/60 bg-navy-950/40">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-teal flex items-center justify-center shadow-lg shadow-brand-teal/20 flex-shrink-0">
            <Droplets className="w-5 h-5 text-navy-950 font-bold" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-brand-teal via-brand-blue to-white bg-clip-text text-transparent">
                AquaGuard AI
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Chennai Resilience
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-gradient-to-r from-brand-blue/20 to-brand-teal/10 text-brand-teal border border-brand-teal/30 shadow-md shadow-brand-teal/5'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-navy-800/80 border border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-slate-400 group-hover:text-brand-blue'
                }`}
              />

              {!isCollapsed && (
                <div className="ml-3 flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-brand-teal/20 text-brand-teal'
                          : 'bg-navy-800 text-slate-400 group-hover:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip on collapse */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-navy-800 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap border border-navy-600">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-navy-700/60 bg-navy-950/60">
        {!isCollapsed ? (
          <div className="flex items-center space-x-3 px-2 py-1.5 rounded-lg bg-navy-800/50 border border-navy-700/50">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></div>
            <div className="flex flex-col text-xs overflow-hidden">
              <span className="text-slate-200 font-medium truncate">GCC MetroWater Node</span>
              <span className="text-[10px] text-slate-400 font-mono">Chennai Dist. Online</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="System Operational"></div>
          </div>
        )}
      </div>
    </aside>
  );
}

