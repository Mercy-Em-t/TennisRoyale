import React from 'react';
import { Link } from 'react-router-dom';

interface Tournament {
  id: number;
  title: string;
  sport: string;
  location?: string;
  start_date?: string;
  entry_fee: number;
  max_players: number;
  current_players: number;
  host_name?: string;
}

export default function TournamentCard({ tournament }: { tournament: Tournament }) {
  const availableSlots = tournament.max_players - (tournament.current_players || 0);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          {tournament.sport}
        </span>
        <div className="text-right">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block">Entry Fee</span>
          <span className="text-lg font-black text-gray-900">${tournament.entry_fee}</span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        <Link to={`/tournaments/${tournament.id}`}>{tournament.title}</Link>
      </h3>

      <div className="space-y-2 mb-6">
        {tournament.location && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-base">📍</span> {tournament.location}
          </div>
        )}
        {tournament.start_date && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-base">📅</span> {new Date(tournament.start_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Availability</span>
          <span className="text-xs font-bold text-gray-700">{availableSlots} slots left</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, ((tournament.current_players || 0) / tournament.max_players) * 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {tournament.host_name && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">🏠</div>
            <span className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[100px]">{tournament.host_name}</span>
          </div>
        )}
        <Link
          to={`/tournaments/${tournament.id}`}
          className="bg-gray-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition shadow-sm"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
