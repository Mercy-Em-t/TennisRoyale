import React from 'react';

const STATUS_FLOW = {
  draft: { next: 'registration_open', label: 'Open Registration', icon: '📝' },
  registration_open: { next: 'registration_closed', label: 'Close Registration', icon: '🔒' },
  registration_closed: { next: 'in_progress', label: 'Start Tournament', icon: '🏁' },
  in_progress: { next: 'completed', label: 'Complete Tournament', icon: '🏆' },
  completed: { next: 'archived', label: 'Archive Tournament', icon: '📦' },
};

export default function StatusActions({ tournament, onStatusChange, onDelete }) {
  const flow = STATUS_FLOW[tournament.status];

  return (
    <div className="status-actions" data-testid="status-actions">
      <h2 className="section-title">Tournament Actions</h2>
      <div className="action-cards">
        {flow && (
          <button
            className="action-card action-primary"
            onClick={() => onStatusChange(flow.next)}
          >
            <span className="action-icon">{flow.icon}</span>
            <span className="action-label">{flow.label}</span>
          </button>
        )}

        {tournament.status === 'registration_closed' && (
          <button
            className="action-card"
            onClick={() => onStatusChange('registration_open')}
          >
            <span className="action-icon">🔓</span>
            <span className="action-label">Reopen Registration</span>
          </button>
        )}

        {['registration_closed', 'in_progress'].includes(tournament.status) && (
          <button
            className="action-card"
            onClick={() =>
              onStatusChange(tournament.late_registration_open ? 'registration_closed' : 'in_progress')
            }
          >
            <span className="action-icon">{tournament.late_registration_open ? '🚫' : '📋'}</span>
            <span className="action-label">
              {tournament.late_registration_open ? 'Close Late Reg' : 'Open Late Reg'}
            </span>
          </button>
        )}

        <button
          className="action-card action-danger"
          onClick={onDelete}
        >
          <span className="action-icon">🗑️</span>
          <span className="action-label">Delete Tournament</span>
        </button>
      </div>
    </div>
  );
}
