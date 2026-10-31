import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Clock, MapPin, Bell } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ activePageTitle, activePageCategory, isCollapsed }) {
  const [timeStr, setTimeStr] = useState('');
  const [dbStatus, setDbStatus] = useState({ is_live_mongo: false, status: 'checking' });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.getSystemStatus()
      .then(res => setDbStatus(res))
      .catch(() => setDbStatus({ is_live_mongo: false, status: 'error' }));
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-navy-900/95 backdrop-blur-md border-b border-navy-700/60 transition-all duration-300 flex items-center justify-between px-6 shadow-md ${
        isCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Title & Structured Category Breadcrumb */}
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded border border-brand-teal/20">
              {activePageCategory || 'Overview & GIS'}
            </span>
            <span className="text-slate-500 text-xs">/</span>
            <h1 className="text-base font-bold text-white tracking-tight">{activePageTitle}</h1>
            <span className="hidden sm:inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-medium">
              <MapPin className="w-3 h-3 mr-1" /> Chennai District
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Smart Water Resilience Platform • GCC / CMWSSB Framework</span>
        </div>
      </div>

      {/* Right Action & Status Center */}
      <div className="flex items-center space-x-4">
        {/* Human Protection Safeguard Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Human-in-the-Loop Safeguard Active</span>
        </div>

        {/* MongoDB Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-navy-800 border border-navy-700 text-xs">
          <Database className={`w-3.5 h-3.5 ${dbStatus.is_live_mongo ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="hidden md:inline text-slate-300">
            {dbStatus.is_live_mongo ? 'Live MongoDB' : 'Mock MongoDB Engine'}
          </span>
          <span className={`w-2 h-2 rounded-full ${dbStatus.is_live_mongo ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-slate-300 px-2.5 py-1 rounded-lg bg-navy-800/60 border border-navy-700/60">
          <Clock className="w-3.5 h-3.5 text-brand-teal" />
          <span>{timeStr} IST</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center space-x-2 pl-2 border-l border-navy-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-teal flex items-center justify-center text-navy-950 font-bold text-xs">
            GCC
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200">Resilience Officer</span>
            <span className="text-[10px] text-slate-400">Admin Control</span>
          </div>
        </div>
      </div>
    </header>
  );
}
