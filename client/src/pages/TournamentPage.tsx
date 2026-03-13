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
import ScoreboardTab from './ScoreboardTab';
import ChatTab from './ChatTab';
import { Trophy, Users, Layout, Zap, Share2, Calendar, MapPin, ChevronRight, Activity, Settings, Download, MoreVertical, Archive, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-800 text-slate-400',
  registration_open: 'bg-green-500/10 text-green-400 border border-green-500/20',
  registration_closed: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  pools_published: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
  closed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  archived: 'bg-slate-900 text-slate-600',
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
      setError('Failed to load tournament metadata');
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
      setError(e.response?.data?.error || 'System action failed');
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
      setError('System export failure');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Loading Event Matrix</p>
      </div>
    </div>
  );

  if (!tournament) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-500 font-black uppercase tracking-widest">Tournament Matrix Offline</div>;

  const tabs = [
    { label: 'Overview', path: '', icon: Layout },
    { label: 'Scoreboard', path: 'scoreboard', icon: Activity },
    { label: 'Bracket', path: 'bracket', icon: Trophy },
    { label: 'Chat', path: 'chat', icon: MessageSquare },
    { label: 'Admin: Registration', path: 'registrations', icon: Users },
    { label: 'Admin: Pools', path: 'pools', icon: Activity },
    { label: 'Admin: Matches', path: 'matches', icon: Zap },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      {/* Top Banner Area */}
      <div className="relative px-5 md:px-8 pt-8 md:pt-12 pb-6 border-b border-slate-900/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <button onClick={() => navigate('/dashboard')} className="group flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-all">
              <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to command center
            </button>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-primary-500 shadow-2xl">
                <Trophy size={32} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">{tournament.name}</h1>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusColors[tournament.status]}`}>
                    {statusLabel[tournament.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <MapPin size={12} className="text-primary-500" /> Nairobi, Kenya
                  </span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar size={12} className="text-primary-500" /> Season '26
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl">
              <Share2 size={20} />
            </button>
            <button className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl">
              <Download size={20} />
            </button>
            <button className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary-950/40 transition-all flex items-center gap-3">
              <Settings size={18} /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation (Glassy Sticky) */}
      <div className="sticky top-[80px] md:top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900/50">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <nav className="flex items-center gap-2 md:gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path === '' ? `/tournaments/${id}` : `/tournaments/${id}/${tab.path}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 md:px-2 py-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all shrink-0 ${isActive ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`
                }
              >
                <tab.icon size={16} />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full p-5 md:p-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-[1.5rem] p-6 text-xs font-bold flex items-center gap-4 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </motion.div>
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
                onOpenLateReg={() => action(() => openLateRegistration(tournamentId), 'Late registration window active')}
                onPublishPools={() => action(() => publishPools(tournamentId))}
                onStart={() => action(() => startTournament(tournamentId))}
                onClose={() => action(() => closeTournament(tournamentId))}
                onArchive={() => action(() => archiveTournament(tournamentId))}
                onExport={handleExport}
                onNavigate={(path) => navigate(`/tournaments/${id}/${path}`)}
              />
            }
          />
          <Route path="scoreboard" element={<ScoreboardTab tournamentId={tournamentId} />} />
          <Route path="chat" element={<ChatTab tournamentId={tournamentId} />} />
          <Route path="registrations" element={<RegistrationsPage tournamentId={tournamentId} tournament={tournament} onRefresh={loadStats} />} />
          <Route path="pools" element={<PoolsPage tournamentId={tournamentId} tournament={tournament} />} />
          <Route path="matches" element={<MatchesPage tournamentId={tournamentId} tournament={tournament} />} />
          <Route path="bracket" element={<BracketPage tournamentId={tournamentId} tournament={tournament} />} />
        </Routes>
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
    <div className="space-y-12">
      {/* Tournament Meta Component */}
      <div className="glass-card rounded-[3rem] p-10 flex flex-col md:flex-row gap-12">
        <div className="flex-1 space-y-8">
          <div>
            <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Event Description</h2>
            <p className="text-slate-300 text-sm font-bold leading-relaxed pr-8">
              {tournament.description || "No official description provided for this event. Technical parameters are locked."}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Inbound" value={stats.totalPlayers} color="blue" />
            <StatCard label="Live Roster" value={stats.acceptedPlayers} color="green" />
            <StatCard label="Active Pools" value={stats.pools} color="purple" />
            <StatCard label="Match Matrix" value={stats.matches} color="orange" />
          </div>
        </div>

        <div className="w-full md:w-80 space-y-8 border-t md:border-t-0 md:border-l border-slate-800/50 pt-8 md:pt-0 md:pl-10">
          <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6">Workflow Control</h2>
          <div className="flex flex-col gap-3">
            {tournament.status === 'draft' && (
              <ActionButton onClick={onOpenReg} disabled={actionLoading} color="green" label="Open Registration" />
            )}
            {tournament.status === 'registration_open' && (
              <>
                <ActionButton onClick={onCloseReg} disabled={actionLoading} color="yellow" label="Close Entries" />
                <ActionButton onClick={onOpenLateReg} disabled={actionLoading} color="blue" label="Late Exceptions" />
              </>
            )}
            {tournament.status === 'registration_closed' && (
              <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                  Entries closed. Access <button onClick={() => onNavigate('pools')} className="text-primary-500 hover:text-primary-400 transition-colors">Pool Builder</button> to initialize draw sheets.
                </p>
              </div>
            )}
            {tournament.status === 'pools_published' && (
              <ActionButton onClick={onStart} disabled={actionLoading} color="purple" label="Activate Tournament" />
            )}
            {tournament.status === 'in_progress' && (
              <ActionButton onClick={onClose} disabled={actionLoading} color="red" label="Finalize Event" />
            )}
            {tournament.status === 'closed' && (
              <div className="flex flex-col gap-3">
                <ActionButton onClick={onArchive} disabled={actionLoading} color="gray" label="Archive Matrix" />
                <ActionButton onClick={onExport} disabled={actionLoading} color="blue" label="Export Manifest" />
              </div>
            )}
            {tournament.status === 'archived' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">
                  <Archive size={12} /> Matrix Archived
                </div>
                <ActionButton onClick={onExport} disabled={actionLoading} color="blue" label="Download Backup" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Audit Trail</h3>
            <MoreVertical size={14} className="text-slate-600" />
          </div>
          <div className="space-y-4">
            {[
              { time: '10 min ago', act: 'Registration closed by Host' },
              { time: '2 hours ago', act: 'New late entry accepted: Federer' },
              { time: 'Yesterday', act: 'Tournament initialized in Draft state' }
            ].map((log, i) => (
              <div key={i} className="flex gap-4 items-start p-4 hover:bg-slate-900/40 rounded-xl transition-all">
                <div className="w-2 h-2 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-300">{log.act}</p>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 space-y-6 border-dashed border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Court Readiness</h3>
            <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest bg-primary-500/5 px-2 py-0.5 rounded-lg border border-primary-500/10">All Functional</span>
          </div>
          <div className="flex flex-col items-center justify-center h-48 gap-4 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all cursor-crosshair">
            <Layout size={40} className="text-slate-700 group-hover:text-primary-500" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary-400">View Court Layout Diagram</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-primary-500/5 text-primary-400 border border-primary-500/10',
    green: 'bg-green-500/5 text-green-400 border border-green-500/10',
    purple: 'bg-indigo-500/5 text-indigo-400 border border-indigo-500/10',
    orange: 'bg-yellow-500/5 text-yellow-400 border border-yellow-500/10',
  };
  return (
    <div className={`${colors[color]} rounded-[1.5rem] p-6 text-center`}>
      <div className="text-3xl font-black text-white mb-1 tracking-tighter leading-none">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-tight">{label}</div>
    </div>
  );
}

function ActionButton({ onClick, disabled, color, label }: { onClick: () => void; disabled: boolean; color: string; label: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-600 hover:bg-green-500 shadow-green-950/20',
    yellow: 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-950/20',
    blue: 'bg-primary-600 hover:bg-primary-500 shadow-primary-950/20',
    purple: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20',
    red: 'bg-red-600 hover:bg-red-500 shadow-red-950/20',
    gray: 'bg-slate-700 hover:bg-slate-600 shadow-slate-950/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${colors[color]} text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all shadow-xl flex items-center justify-center gap-3 group`}
    >
      {label}
      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
