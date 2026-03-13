import React, { useState } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, CheckCircle2, Loader } from 'lucide-react';

const JoinTournament = ({ onClose }) => {
    const { currentUser } = useAuth();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [tournament, setTournament] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const refs = Array.from({ length: 6 }, () => React.useRef(null));

    const handleInput = (i, val) => {
        const v = val.toUpperCase().replace(/[^A-Z0-9]/, '');
        const next = [...code];
        next[i] = v;
        setCode(next);
        if (v && i < 5) refs[i + 1].current?.focus();
    };

    const handleKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !code[i] && i > 0) refs[i - 1].current?.focus();
    };

    const handleJoin = async () => {
        const inviteCode = code.join('');
        if (inviteCode.length < 6) return;
        setStatus('loading');
        setErrorMsg('');

        try {
            const q = query(collection(db, 'tournaments'), where('inviteCode', '==', inviteCode));
            const snap = await getDocs(q);

            if (snap.empty) {
                setErrorMsg('No tournament found with this code. Double-check and try again.');
                setStatus('error');
                return;
            }

            const tDoc = snap.docs[0];
            setTournament({ id: tDoc.id, ...tDoc.data() });

            // Register player in the tournament
            const participantRef = doc(db, `tournaments/${tDoc.id}/participants`, currentUser.uid);
            await setDoc(participantRef, {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Anonymous Player',
                status: 'active',
                joinedAt: new Date(),
                poolId: null,
            });

            setStatus('success');
        } catch (err) {
            setErrorMsg('Something went wrong. Please try again.');
            setStatus('error');
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl space-y-6"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black">Join Tournament</h3>
                        <p className="text-sm text-slate-400">Enter the 6-digit invite code from your host.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {status === 'success' ? (
                        <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-6">
                            <CheckCircle2 size={64} className="text-green-400 mx-auto" />
                            <h4 className="text-xl font-black text-green-400">You're In!</h4>
                            <p className="text-slate-300">Successfully joined <strong>{tournament?.name}</strong></p>
                            <p className="text-xs text-slate-500">Venue: {tournament?.venue}</p>
                            <button onClick={onClose} className="bg-primary-600 hover:bg-primary-500 px-8 py-3 rounded-xl font-bold w-full mt-4">
                                Go to Lobby
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div key="form" className="space-y-6">
                            {/* Code Input */}
                            <div className="flex justify-center gap-2">
                                {code.map((val, i) => (
                                    <input
                                        key={i}
                                        ref={refs[i]}
                                        value={val}
                                        onChange={e => handleInput(i, e.target.value)}
                                        onKeyDown={e => handleKeyDown(i, e)}
                                        maxLength={1}
                                        className="w-12 h-14 bg-slate-800 border-2 border-slate-700 rounded-xl text-center text-2xl font-black focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition-all uppercase"
                                    />
                                ))}
                            </div>

                            {errorMsg && (
                                <p className="text-red-400 text-sm text-center">{errorMsg}</p>
                            )}

                            <button
                                onClick={handleJoin}
                                disabled={code.join('').length < 6 || status === 'loading'}
                                className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                {status === 'loading' ? (
                                    <><Loader size={18} className="animate-spin" /> Searching...</>
                                ) : (
                                    <><KeyRound size={18} /> Join Tournament</>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default JoinTournament;
