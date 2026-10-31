import React from 'react';

export default function MetricCard({ title, value, unit, subtitle, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: {
      border: 'border-brand-blue/30 hover:border-brand-blue/60',
      iconBg: 'bg-brand-blue/15 text-brand-blue',
      glow: 'shadow-brand-blue/5'
    },
    teal: {
      border: 'border-brand-teal/30 hover:border-brand-teal/60',
      iconBg: 'bg-brand-teal/15 text-brand-teal',
      glow: 'shadow-brand-teal/5'
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/60',
      iconBg: 'bg-amber-500/15 text-amber-400',
      glow: 'shadow-amber-500/5'
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/60',
      iconBg: 'bg-purple-500/15 text-purple-400',
      glow: 'shadow-purple-500/5'
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      glow: 'shadow-emerald-500/5'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`bg-navy-900/90 rounded-2xl p-5 border ${scheme.border} shadow-lg ${scheme.glow} transition-all duration-300 relative overflow-hidden group`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-white tracking-tight">{value}</span>
            {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${scheme.iconBg} transition-transform group-hover:scale-110 duration-200`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-navy-800/80 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-mono font-medium ${
                trend.startsWith('+') ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

