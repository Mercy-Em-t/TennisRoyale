import React from 'react';

export default function QuickStats({ stats, tournament }) {
  const cards = [
    { label: 'Registrations', value: stats?.registrations || 0, max: tournament?.max_participants, icon: '👥', color: 'blue' },
    { label: 'Matches', value: stats?.matches || 0, icon: '🎾', color: 'green' },
    { label: 'Completed', value: stats?.completedMatches || 0, icon: '✅', color: 'emerald' },
    { label: 'Pools', value: stats?.pools || 0, icon: '🏊', color: 'purple' },
    { label: 'Staff', value: stats?.staff || 0, icon: '🧑‍💼', color: 'orange' },
  ];

  const progress = stats?.matches > 0
    ? Math.round((stats.completedMatches / stats.matches) * 100)
    : 0;

  return (
    <div className="quick-stats" data-testid="quick-stats">
      <h2 className="section-title">Dashboard Overview</h2>
      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card stat-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <span className="stat-value">
                {card.value}
                {card.max && <span className="stat-max">/{card.max}</span>}
              </span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {stats?.matches > 0 && (
        <div className="progress-section">
          <div className="progress-header">
            <span>Tournament Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} data-testid="progress-fill" />
          </div>
        </div>
      )}
    </div>
  );
}
