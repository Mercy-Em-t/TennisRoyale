import React from 'react';

interface QuickStatsProps {
  stats: any;
  tournament: any;
}

export default function QuickStats({ stats, tournament }: QuickStatsProps) {
  const cards = [
    { label: 'Registered', value: stats?.registrations || 0, max: tournament?.max_participants, icon: '👥', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Matches', value: stats?.matches || 0, icon: '🎾', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: 'Scored', value: stats?.completedMatches || 0, icon: '✅', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Pools', value: stats?.pools || 0, icon: '🏁', color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Staff', value: stats?.staff || 0, icon: '👔', color: 'gray', bg: 'bg-gray-50', text: 'text-gray-600' },
  ];

  const progress = stats?.matches > 0
    ? Math.round((stats.completedMatches / stats.matches) * 100)
    : 0;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-3xl p-5 border border-white shadow-sm flex flex-col items-center text-center group hover:scale-105 transition-transform duration-300`}>
            <div className="text-2xl mb-3 filter drop-shadow-sm">{card.icon}</div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-gray-900 tracking-tighter">
                {card.value}
                {card.max && <span className="text-[10px] font-bold text-gray-300 ml-0.5">/{card.max}</span>}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {stats?.matches > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-gray-50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h4 className="text-lg font-black text-gray-900 tracking-tight">Tournament completion</h4>
              <p className="text-gray-400 text-xs font-medium">Based on scored matches vs total matches</p>
            </div>
            <span className="text-3xl font-black text-blue-600 tracking-tighter">{progress}%</span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
