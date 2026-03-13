import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight, ChevronLeft, CheckCircle2, Globe, Lock, Zap, Layers, Shuffle } from 'lucide-react';

const STEPS = ['Basic Info', 'Format', 'Scoring', 'Review'];

const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const CreateTournament = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        sport: 'Tennis',
        visibility: 'public',
        venue: '',
        maxPlayers: 16,
        format: 'round_robin',
        scoringFormat: 'short_set',
        courtsAvailable: 4,
        description: '',
    });

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const inviteCode = generateInviteCode();
            const tournamentRef = await addDoc(collection(db, 'tournaments'), {
                ...form,
                hostId: currentUser.uid,
                hostName: currentUser.displayName || 'Anonymous Host',
                inviteCode,
                status: 'registration',
                createdAt: serverTimestamp(),
                participantCount: 0,
            });
            navigate(`/host?tid=${tournamentRef.id}`);
        } catch (err) {
            setError('Failed to create tournament. Check Firebase config.');
            console.error(err);
        }
        setIsSubmitting(false);
    };

    const canAdvance = () => {
        if (step === 0) return form.name.trim().length > 2 && form.venue.trim().length > 0;
        return true;
    };

    const stepVariants = {
        enter: { opacity: 0, x: 40 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black gradient-text">Create Tournament</h2>
                <p className="text-slate-400">Fill in the details to launch your Tennis tournament.</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                {STEPS.map((label, i) => (
                    <React.Fragment key={label}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${i === step ? 'bg-primary-600 text-white' : i < step ? 'bg-primary-900/50 text-primary-400' : 'bg-slate-800 text-slate-500'}`}>
                            {i < step ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                            {label}
                        </div>
                        {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-primary-600' : 'bg-slate-700'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step Content */}
            <div className="glass-card p-8 rounded-3xl min-h-[360px] flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        className="flex-1 space-y-6"
                    >
                        {/* Step 0: Basic Info */}
                        {step === 0 && (
                            <>
                                <h3 className="text-xl font-bold">Basic Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-400 mb-1">Tournament Name *</label>
                                        <input
                                            value={form.name}
                                            onChange={e => update('name', e.target.value)}
                                            placeholder="e.g. Nairobi Summer Open 2026"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-400 mb-1">Venue *</label>
                                        <input
                                            value={form.venue}
                                            onChange={e => update('venue', e.target.value)}
                                            placeholder="e.g. Karen Country Club"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-400 mb-1">Description</label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => update('description', e.target.value)}
                                            placeholder="Brief description for players..."
                                            rows={3}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-400 mb-2">Visibility</label>
                                            <div className="flex gap-2">
                                                {[['public', Globe, 'Public'], ['private', Lock, 'Private']].map(([val, Icon, label]) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => update('visibility', val)}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${form.visibility === val ? 'border-primary-500 bg-primary-900/30 text-primary-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                                    >
                                                        <Icon size={16} />{label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-400 mb-1">Max Players</label>
                                            <select
                                                value={form.maxPlayers}
                                                onChange={e => update('maxPlayers', parseInt(e.target.value))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none"
                                            >
                                                {[8, 16, 32, 64].map(n => <option key={n} value={n}>{n} Players</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 1: Format */}
                        {step === 1 && (
                            <>
                                <h3 className="text-xl font-bold">Tournament Format</h3>
                                <div className="space-y-3">
                                    {[
                                        { value: 'round_robin', icon: Layers, title: 'Round Robin', desc: 'Everyone plays everyone. Ranked by Points > Set Ratio > Game Ratio.' },
                                        { value: 'knockout', icon: Trophy, title: 'Single Elimination', desc: 'Lose once and you are out. Best for fast-paced events.' },
                                        { value: 'hybrid', icon: Shuffle, title: 'Hybrid (Pools → Knockout)', desc: 'Pool stage to determine rankings, then knockout stage for top players.' },
                                    ].map(({ value, icon: Icon, title, desc }) => (
                                        <button
                                            key={value}
                                            onClick={() => update('format', value)}
                                            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${form.format === value ? 'border-primary-500 bg-primary-900/20' : 'border-slate-700 hover:border-slate-600'}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-xl ${form.format === value ? 'bg-primary-600' : 'bg-slate-800'}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{title}</p>
                                                    <p className="text-sm text-slate-400">{desc}</p>
                                                </div>
                                                {form.format === value && <CheckCircle2 className="ml-auto text-primary-400 shrink-0" size={20} />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Step 2: Scoring */}
                        {step === 2 && (
                            <>
                                <h3 className="text-xl font-bold">Scoring Format</h3>
                                <div className="space-y-3">
                                    {[
                                        { value: 'short_set', title: 'Short Sets', desc: 'First to 4 games. Win by 2. Tie-break at 4-4.' },
                                        { value: 'full_set', title: 'Full Sets (Best of 3)', desc: 'First to 6 games. Win by 2. Tie-break at 6-6.' },
                                        { value: 'knockout_7', title: 'Fast 4 / Knockout to 7', desc: 'Straight points to 7. Win by 2. No ads.' },
                                        { value: 'knockout_11', title: 'Pro Set to 11', desc: 'Straight points to 11. Win by 2. No ads.' },
                                    ].map(({ value, title, desc }) => (
                                        <button
                                            key={value}
                                            onClick={() => update('scoringFormat', value)}
                                            className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${form.scoringFormat === value ? 'border-primary-500 bg-primary-900/20' : 'border-slate-700 hover:border-slate-600'}`}
                                        >
                                            <div>
                                                <p className="font-bold">{title}</p>
                                                <p className="text-sm text-slate-400">{desc}</p>
                                            </div>
                                            {form.scoringFormat === value && <CheckCircle2 className="text-primary-400 shrink-0" size={20} />}
                                        </button>
                                    ))}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-400 mb-1 mt-4">Available Courts</label>
                                        <input
                                            type="number"
                                            min={1} max={20}
                                            value={form.courtsAvailable}
                                            onChange={e => update('courtsAvailable', parseInt(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <>
                                <h3 className="text-xl font-bold">Review & Launch</h3>
                                <div className="space-y-4">
                                    {[
                                        ['Tournament Name', form.name],
                                        ['Venue', form.venue],
                                        ['Visibility', form.visibility],
                                        ['Max Players', form.maxPlayers],
                                        ['Format', form.format.replace('_', ' ')],
                                        ['Scoring', form.scoringFormat.replace('_', ' ')],
                                        ['Courts', form.courtsAvailable],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex justify-between items-center py-3 border-b border-slate-700/50">
                                            <span className="text-slate-400 text-sm">{label}</span>
                                            <span className="font-bold capitalize">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                {error && <p className="text-red-400 text-sm italic mt-4">{error}</p>}
                                <div className="mt-4 bg-primary-900/10 border border-primary-900/30 rounded-xl p-4 text-sm text-slate-400">
                                    <Zap size={16} className="text-primary-400 inline mr-2" />
                                    An invite code will be automatically generated and displayed in your Host Dashboard.
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-slate-700/50">
                    <button
                        onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-all px-4 py-2 rounded-xl hover:bg-slate-800"
                    >
                        <ChevronLeft size={18} /> {step === 0 ? 'Cancel' : 'Back'}
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canAdvance()}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 px-6 py-2.5 rounded-xl font-bold transition-all"
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/40"
                        >
                            {isSubmitting ? 'Launching...' : '🚀 Launch Tournament'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateTournament;
