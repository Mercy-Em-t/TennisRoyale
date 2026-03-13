import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, MapPin, Power, Download, PlusCircle, AlertTriangle, Trophy, FileText } from 'lucide-react';
import { appendToPool, promoteToBracket, triggerKillSwitch } from '../services/TournamentService';
import ExportService from '../services/ExportService';
import { rankPlayers } from '../engines/BracketEngine';
import QRGenerator from '../components/QRGenerator';

const HostDashboard = () => {
    const { currentUser } = useAuth();
    const [killSwitchActive, setKillSwitchActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lateBasket, setLateBasket] = useState([
        { uid: 'u1', name: 'Novak Djokovic', status: 'late_basket' },
        { uid: 'u2', name: 'Carlos Alcaraz', status: 'late_basket' }
    ]);

    const toggleKillSwitch = async () => {
        const tournamentId = 'tournament-123';
        const newState = !killSwitchActive;
        setKillSwitchActive(newState);
        if (newState) {
            try {
                await triggerKillSwitch(tournamentId, 'Host activated rain delay');
            } catch (err) {
                console.warn('Kill switch Firestore update failed (demo mode):', err.message);
            }
        }
    };

    const handleExport = async () => {
        const tournamentId = 'tournament-123';
        try {
            await ExportService.exportTournamentJSON(tournamentId);
        } catch (err) {
            // Fallback to local mock data if Firestore not configured
            const data = { tournament: { id: tournamentId, name: 'Summer Open 2026' }, exportedAt: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `tournament_backup_${Date.now()}.json`;
            a.click();
        }
    };

    const handleExportCSV = () => {
        ExportService.exportMatchesCSV('Summer Open 2026', []);
    };

    const handleAppend = async (player) => {
        setIsProcessing(true);
        try {
            await appendToPool('tournament-123', player.uid, player.name);
            setLateBasket(prev => prev.filter(p => p.uid !== player.uid));
            alert(`${player.name} has been appended to the pool and matches generated.`);
        } catch (err) {
            console.error(err);
        }
        setIsProcessing(false);
    };

    const handlePromote = async () => {
        setIsProcessing(true);
        // In real app, we fetch actual participants and matches
        const mockParticipants = [{ uid: 'p1', displayName: 'Federer' }, { uid: 'p2', displayName: 'Nadal' }];
        const mockMatches = [];
        const ranked = rankPlayers(mockParticipants, mockMatches);
        await promoteToBracket('tournament-123', ranked, 8);
        alert('Top players promoted to Knockout Bracket!');
        setIsProcessing(false);
    };

    return (
        <div className="space-y-6 pb-6 max-w-3xl mx-auto px-4">
            <header className="flex flex-col gap-4">
                <div>
                    <h2 className="text-3xl font-black gradient-text">Tournament Hosting</h2>
                    <p className="text-slate-400">Managing: <span className="text-primary-400 font-bold">Summer Open 2026</span></p>
                </div>

                <div className="flex items-center gap-3">
                    <QRGenerator
                        tournamentId="tournament-123"
                        tournamentName="Summer Open 2026"
                        courts={[1, 2, 3, 4]}
                    />
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition-all text-sm font-bold"
                    >
                        <Download size={18} /> Export Data
                    </button>
                    <button
                        onClick={toggleKillSwitch}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${killSwitchActive
                            ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                            }`}
                    >
                        <Power size={18} /> {killSwitchActive ? 'DEACTIVATE KILL SWITCH' : 'GLOBAL KILL SWITCH'}
                    </button>
                </div>
            </header>

            {killSwitchActive && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-900/20 border-2 border-red-500/50 p-6 rounded-2xl flex items-center gap-4 text-red-400"
                >
                    <ShieldAlert size={48} className="animate-pulse" />
                    <div>
                        <h4 className="text-xl font-bold uppercase tracking-wider">Emergency Protocol Active</h4>
                        <p>All live matches are frozen. Notifications sent to all participants regarding the rain delay/environmental halt.</p>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Late Basket Section */}
                <section className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Users className="text-primary-400" /> Late Registration Basket
                        </h3>
                        <span className="bg-primary-900/30 text-primary-400 px-3 py-1 rounded-full text-xs font-bold">
                            {lateBasket.length} PENDING
                        </span>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 divide-y divide-slate-700 overflow-hidden">
                        {lateBasket.map(player => (
                            <div key={player.uid} className="p-4 flex items-center justify-between group hover:bg-slate-800 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                                        {player.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold">{player.name}</p>
                                        <p className="text-xs text-slate-500 italic">Registered 10m ago</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAppend(player)}
                                    disabled={isProcessing}
                                    className="bg-primary-600 hover:bg-primary-500 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all"
                                >
                                    <PlusCircle size={14} /> {isProcessing ? 'PROCESING...' : 'Append to Pools'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-700">
                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Pool Actions</h4>
                        <button
                            onClick={handlePromote}
                            disabled={isProcessing}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/40"
                        >
                            <Trophy size={18} /> GENERATE KNOCKOUT BRACKET
                        </button>
                    </div>

                    <div className="bg-amber-900/10 border border-amber-900/30 p-4 rounded-xl flex gap-3 text-amber-500">
                        <AlertTriangle size={20} className="shrink-0" />
                        <p className="text-sm">The algorithm will prioritize "Bye" slots. Only prerequisite matches will be generated for new participants.</p>
                    </div>
                </section>

                {/* Court Allocation Sidebar */}
                <section className="glass-card rounded-2xl p-6 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <MapPin className="text-primary-400" /> Court Management
                    </h3>

                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(court => (
                            <div key={court} className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-black text-slate-400">COURT {court}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${court % 2 === 0 ? 'bg-green-900/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {court % 2 === 0 ? 'LIVE' : 'IDLE'}
                                    </span>
                                </div>
                                {court % 2 === 0 ? (
                                    <div className="text-sm">
                                        <p className="font-bold">Federer vs Alcaraz</p>
                                        <p className="text-xs text-slate-500">Duration: 45m</p>
                                    </div>
                                ) : (
                                    <button className="w-full mt-2 py-2 border border-dashed border-slate-600 rounded-lg text-xs text-slate-500 hover:bg-slate-700/50 hover:text-slate-400 transition-all">
                                        Assign Ready Match
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HostDashboard;
