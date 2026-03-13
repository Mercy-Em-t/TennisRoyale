import React from 'react';

const STATUS_FLOW: Record<string, { next: string, label: string, icon: string, color: string }> = {
  draft: { next: 'registration_open', label: 'Open Registration', icon: '📝', color: 'bg-blue-600' },
  registration_open: { next: 'registration_closed', label: 'Close Registration', icon: '🔒', color: 'bg-orange-600' },
  registration_closed: { next: 'in_progress', label: 'Start Tournament', icon: '🏁', color: 'bg-green-600' },
  in_progress: { next: 'completed', label: 'Complete Tournament', icon: '🏆', color: 'bg-indigo-600' },
  completed: { next: 'archived', label: 'Archive Tournament', icon: '📦', color: 'bg-gray-600' },
};

interface StatusActionsProps {
  tournament: any;
  onStatusChange: (next: string) => void;
  onToggleLateReg: () => void;
  onDelete: () => void;
}

export default function StatusActions({ tournament, onStatusChange, onToggleLateReg, onDelete }: StatusActionsProps) {
  const flow = STATUS_FLOW[tournament.status];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Tournament Controls</h4>
        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-tighter">Current: {tournament.status.replace(/_/g, ' ')}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {flow && (
          <button
            className={`${flow.color} text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group relative overflow-hidden`}
            onClick={() => onStatusChange(flow.next)}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform"></div>
            <span className="text-3xl mb-3">{flow.icon}</span>
            <span className="text-sm font-black uppercase tracking-tight">{flow.label}</span>
          </button>
        )}

        {tournament.status === 'registration_closed' && (
          <button
            className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
            onClick={() => onStatusChange('registration_open')}
          >
            <span className="text-3xl mb-3">🔓</span>
            <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Reopen Registration</span>
          </button>
        )}

        {['registration_closed', 'in_progress'].includes(tournament.status) && (
          <button
            className={`${tournament.late_registration_open ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-white border-gray-100 text-gray-700'} border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group`}
            onClick={onToggleLateReg}
          >
            <span className="text-3xl mb-3">{tournament.late_registration_open ? '🚫' : '📋'}</span>
            <span className="text-sm font-bold uppercase tracking-tight">
              {tournament.late_registration_open ? 'Close Late Reg' : 'Open Late Reg'}
            </span>
          </button>
        )}

        <button
          className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 shadow-sm hover:bg-red-600 hover:text-white transition-all duration-300 flex flex-col items-center text-center group"
          onClick={onDelete}
        >
          <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">🗑️</span>
          <span className="text-sm font-black uppercase tracking-tight">Delete Permanently</span>
        </button>
      </div>
    </div>
  );
}
