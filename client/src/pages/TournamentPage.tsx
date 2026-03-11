import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import {
  getTournament,
  openRegistration,
  closeRegistration,
  publishPools,
  startTournament,
  closeTournament,
  archiveTournament,
  exportTournament,
  openLateRegistration,
  getRegistrations,
  getPools,
  getMatches,
} from '../api';
import { Tournament } from '../types';
import RegistrationsPage from './RegistrationsPage';
import PoolsPage from './PoolsPage';
import MatchesPage from './MatchesPage';
import BracketPage from './BracketPage';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  registration_open: 'bg-green-100 text-green-700',
  registration_closed: 'bg-yellow-100 text-yellow-700',
  pools_published: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  closed: 'bg-red-100 text-red-700',
  archived: 'bg-gray-400 text-white',
};

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  pools_published: 'Pools Published',
  in_progress: 'In Progress',
  closed: 'Closed',
  archived: 'Archived',
};

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tournamentId = Number(id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalPlayers: 0, acceptedPlayers: 0, pools: 0, matches: 0 });

  const loadTournament = useCallback(async () => {
    try {
      const res = await getTournament(tournamentId);
      setTournament(res.data.tournament || res.data);
    } catch {
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const loadStats = useCallback(async () => {
    try {
      const [regRes, poolRes, matchRes] = await Promise.all([
        getRegistrations(tournamentId),
        getPools(tournamentId),
        getMatches(tournamentId),
      ]);
      const players = regRes.data.players || regRes.data || [];
      const pools = poolRes.data.pools || poolRes.data || [];
      const matches = matchRes.data.matches || matchRes.data || [];
      setStats({
        totalPlayers: players.length,
        acceptedPlayers: players.filter((p: { status: string }) => p.status === 'accepted' || p.status === 'late').length,
        pools: pools.length,
        matches: matches.length,
      });
    } catch {
      // ignore stats errors
    }
  }, [tournamentId]);

  useEffect(() => {
    loadTournament();
    loadStats();
  }, [loadTournament, loadStats]);

  const action = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setActionLoading(true);
    setError('');
    try {
      await fn();
      await loadTournament();
      if (successMsg) alert(successMsg);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportTournament(tournamentId);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournament-${tournamentId}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading...</div>;
  if (!tournament) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Tournament not found</div>;

  const tabs = [
    { label: 'Overview', path: '' },
    { label: 'Registrations', path: 'registrations' },
    { label: 'Pools', path: 'pools' },
    { label: 'Matches', path: 'matches' },
    { label: 'Bracket', path: 'bracket' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-blue-200 hover:text-white text-sm">← Dashboard</button>
            <span className="text-blue-300">|</span>
            <h1 className="text-xl font-bold">{tournament.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
              {statusLabel[tournament.status]}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path === '' ? `/tournaments/${id}` : `/tournaments/${id}/${tab.path}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm font-medium border-b last:border-b-0 transition ${
                    isActive ? 'bg-blue-50 text-blue-600 border-l-2 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4">{error}</div>
          )}
          <Routes>
            <Route
              index
              element={
                <OverviewTab
                  tournament={tournament}
                  stats={stats}
                  actionLoading={actionLoading}
                  onOpenReg={() => action(() => openRegistration(tournamentId))}
                  onCloseReg={() => action(() => closeRegistration(tournamentId))}
                  onOpenLateReg={() => action(() => openLateRegistration(tournamentId), 'Late registration opened')}
                  onPublishPools={() => action(() => publishPools(tournamentId))}
                  onStart={() => action(() => startTournament(tournamentId))}
                  onClose={() => action(() => closeTournament(tournamentId))}
                  onArchive={() => action(() => archiveTournament(tournamentId))}
                  onExport={handleExport}
                  onNavigate={(path) => navigate(`/tournaments/${id}/${path}`)}
                />
              }
            />
            <Route path="registrations" element={<RegistrationsPage tournamentId={tournamentId} tournament={tournament} onRefresh={loadStats} />} />
            <Route path="pools" element={<PoolsPage tournamentId={tournamentId} tournament={tournament} />} />
            <Route path="matches" element={<MatchesPage tournamentId={tournamentId} tournament={tournament} />} />
            <Route path="bracket" element={<BracketPage tournamentId={tournamentId} tournament={tournament} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

interface OverviewProps {
  tournament: Tournament;
  stats: { totalPlayers: number; acceptedPlayers: number; pools: number; matches: number };
  actionLoading: boolean;
  onOpenReg: () => void;
  onCloseReg: () => void;
  onOpenLateReg: () => void;
  onPublishPools: () => void;
  onStart: () => void;
  onClose: () => void;
  onArchive: () => void;
  onExport: () => void;
  onNavigate: (path: string) => void;
}

function OverviewTab({ tournament, stats, actionLoading, onOpenReg, onCloseReg, onOpenLateReg, onPublishPools, onStart, onClose, onArchive, onExport, onNavigate }: OverviewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-1">{tournament.name}</h2>
        {tournament.description && <p className="text-gray-500 text-sm mb-4">{tournament.description}</p>}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Registrations" value={stats.totalPlayers} color="blue" />
          <StatCard label="Accepted Players" value={stats.acceptedPlayers} color="green" />
          <StatCard label="Pools" value={stats.pools} color="purple" />
          <StatCard label="Matches" value={stats.matches} color="orange" />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-600 mb-3">Actions</p>
          <div className="flex flex-wrap gap-2">
            {tournament.status === 'draft' && (
              <ActionButton onClick={onOpenReg} disabled={actionLoading} color="green" label="Open Registration" />
            )}
            {tournament.status === 'registration_open' && (
              <>
                <ActionButton onClick={onCloseReg} disabled={actionLoading} color="yellow" label="Close Registration" />
                <ActionButton onClick={onOpenLateReg} disabled={actionLoading} color="blue" label="Open Late Registration" />
              </>
            )}
            {tournament.status === 'registration_closed' && (
              <p className="text-sm text-gray-500">Go to <button onClick={() => onNavigate('pools')} className="text-blue-600 underline">Pools</button> to assign players and publish pools.</p>
            )}
            {tournament.status === 'pools_published' && (
              <ActionButton onClick={onStart} disabled={actionLoading} color="purple" label="Start Tournament" />
            )}
            {tournament.status === 'in_progress' && (
              <ActionButton onClick={onClose} disabled={actionLoading} color="red" label="Close Tournament" />
            )}
            {tournament.status === 'closed' && (
              <>
                <ActionButton onClick={onArchive} disabled={actionLoading} color="gray" label="Archive Tournament" />
                <ActionButton onClick={onExport} disabled={actionLoading} color="blue" label="Export Data" />
              </>
            )}
            {tournament.status === 'archived' && (
              <ActionButton onClick={onExport} disabled={actionLoading} color="blue" label="Export Data" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 font-medium">{label}</div>
    </div>
  );
}

function ActionButton({ onClick, disabled, color, label }: { onClick: () => void; disabled: boolean; color: string; label: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500 hover:bg-green-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    red: 'bg-red-500 hover:bg-red-600',
    gray: 'bg-gray-500 hover:bg-gray-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${colors[color]} text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition`}
    >
      {label}
    </button>
  );
}
