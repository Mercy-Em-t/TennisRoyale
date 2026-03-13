import React from 'react';

interface RevenueSummaryProps {
  dashboard: {
    total_tournaments: number;
    active_tournaments: number;
    players_registered: number;
    total_revenue: number;
  };
}

export default function RevenueSummary({ dashboard }: RevenueSummaryProps) {
  const items = [
    { label: 'Total Tournaments', value: dashboard.total_tournaments, icon: '🏆', color: 'text-blue-600' },
    { label: 'Active Events', value: dashboard.active_tournaments, icon: '🔥', color: 'text-orange-600' },
    { label: 'Total Participants', value: dashboard.players_registered, icon: '👥', color: 'text-indigo-600' },
    { label: 'Net Revenue', value: `$${dashboard.total_revenue.toFixed(2)}`, icon: '💰', color: 'text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-1 group hover:shadow-md transition">
          <span className="text-2xl mb-2">{item.icon}</span>
          <span className={`text-2xl font-black tracking-tighter ${item.color}`}>{item.value}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
