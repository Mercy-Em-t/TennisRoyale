import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Users, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import CoachService from '../services/CoachService';

const BulkRegisterModal = ({ tournamentId, coachId, onClose }) => {
    const [step, setStep] = useState('input'); // 'input' | 'preview' | 'loading' | 'success'
    const [inputText, setInputText] = useState('');
    const [parsedTeams, setParsedTeams] = useState([]);
    const [results, setResults] = useState(null);

    const handleParse = () => {
        // Multi-player parsing: 
        // Team Name | Player 1 Name, Player 1 Email | Player 2 Name, Player 2 Email
        // Or simple: Name, Email (Becomes a Team of 1)
        const lines = inputText.split('\n').filter(l => l.trim().includes(','));
        const teams = lines.map(line => {
            const parts = line.split('|').map(s => s.trim());
            let teamName = null;
            let playerString = line;

            if (parts.length > 1) {
                teamName = parts[0];
                playerString = parts[1];
            }

            const players = playerString.split(';').map(p => {
                const [name, email] = p.split(',').map(s => s.trim());
                return { name, email };
            });

            return { teamName, players };
        });
        setParsedTeams(teams);
        setStep('preview');
    };

    const handleRegister = async () => {
        setStep('loading');
        try {
            const res = await CoachService.bulkRegisterTeams(coachId, tournamentId, parsedTeams);
            setResults(res);
            setStep('success');
        } catch (err) {
            alert("Failed to process registration.");
            setStep('preview');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white">Bulk <span className="text-primary-400">Roster</span></h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Register multiple players</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 pt-2">
                    <AnimatePresence mode="wait">
                        {step === 'input' && (
                            <motion.div key="input" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Paste Teams (Name | P1 Name, P1 Email; P2 Name, P2 Email)</label>
                                    <textarea
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        placeholder="Team Alpha | John, john@a.com; Jane, jane@a.com&#10;Roger Federer, roger@fed.com"
                                        className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                                    />
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3 border border-slate-800">
                                    <Info size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        New players will receive an automated invitation to claim their shadow accounts.
                                    </p>
                                </div>
                                <button
                                    disabled={!inputText.includes(',')}
                                    onClick={handleParse}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
                                >
                                    Review Roster
                                </button>
                            </motion.div>
                        )}

                        {step === 'preview' && (
                            <motion.div key="preview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                                    <div className="p-3 bg-slate-800/50 border-b border-slate-800">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preview: {parsedTeams.length} Teams</p>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                        {parsedTeams.map((team, i) => (
                                            <div key={i} className="p-3 rounded-xl hover:bg-slate-800/30 border border-transparent hover:border-slate-700/50 transition-all">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs font-black text-primary-400">
                                                        {team.teamName || (team.players.length === 1 ? 'Individual' : 'Doubles Team')}
                                                    </p>
                                                    <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                                                        {team.players.length === 1 ? 'Singles' : 'Doubles'}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 pl-2 border-l border-slate-800">
                                                    {team.players.map((p, j) => (
                                                        <div key={j} className="flex justify-between items-center text-[10px]">
                                                            <span className="font-bold text-slate-300">{p.name || 'Unknown'}</span>
                                                            <span className="text-slate-500 italic">{p.email}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setStep('input')} className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Edit</button>
                                    <button onClick={handleRegister} className="flex-[2] py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg">Confirm & Send</button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'loading' && (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center gap-4 text-center">
                                <Loader2 size={48} className="text-primary-400 animate-spin" />
                                <div className="space-y-1">
                                    <p className="font-black text-lg">Onboarding Team...</p>
                                    <p className="text-xs text-slate-500 italic">Creating shadow accounts & magic links</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-6 text-center">
                                <div className="w-20 h-20 bg-green-900/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black">Roster Registered!</h3>
                                    <p className="text-xs text-slate-400 px-6">
                                        {results.linked.length} existing accounts linked. {results.newlyCreated.length} shadow accounts created.
                                    </p>
                                </div>
                                <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800 text-left space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-primary-400" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Step</p>
                                    </div>
                                    <p className="text-[10px] text-slate-300 leading-relaxed">
                                        Invitations have been dispatched. Players can now claim their accounts by entering their email at the login screen.
                                    </p>
                                </div>
                                <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Done</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default BulkRegisterModal;
