import React from 'react';

export default function StatusBadge({ status, type = 'risk' }) {
  const getStyle = () => {
    const s = String(status).toLowerCase();
    if (s.includes('high') || s.includes('critical') || s.includes('deficit') || s.includes('very high')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (s.includes('medium') || s.includes('moderate') || s.includes('warning') || s.includes('upcoming')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (s.includes('low risk') || s.includes('active') || s.includes('approved')) {
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    }
    if (s.includes('normal') || s.includes('excess') || s.includes('healthy') || s.includes('completed')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></span>
      {status}
    </span>
  );
}

