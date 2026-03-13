import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Zap, Globe, ShieldCheck, ChevronRight, Users, Star,
    Menu, X, CheckCircle2, Activity, Crown, Swords, Timer,
    BarChart2, QrCode, Bell, WifiOff, Download, ArrowRight,
    Ambulance
} from 'lucide-react';

// ── Animation variants ────────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as any }
    }),
};

// ── Data ──────────────────────────────────────────────────────
const STATS = [
    { n: '10K+', label: 'Players' },
    { n: '840+', label: 'Tournaments hosted' },
    { n: '38', label: 'Countries' },
    { n: '99.8%', label: 'Score accuracy' },
];

const FEATURES = [
    { icon: Zap, title: 'Real-Time Live Scoring', desc: 'Every point streams instantly to players, spectators, and the bracket — no manual refreshes.' },
    { icon: ShieldCheck, title: 'Dispute-Free Verification', desc: 'Dual-entry locking means both players must agree before a score is recorded. Disputes are flagged automatically.' },
    { icon: BarChart2, title: 'Smart Bracket Progression', desc: 'Pools, knockouts, round-robins, and hybrids. Winners advance automatically after match completion.' },
    { icon: Bell, title: 'Instant Push Notifications', desc: 'Players get pinged the moment their match is called to a court — no squinting at a draw sheet.' },
    { icon: QrCode, title: 'QR Court Check-In', desc: 'Scan the court-side QR code to confirm your presence before the match. No umpire needed.' },
    { icon: WifiOff, title: 'Offline Resilience', desc: 'Scores submitted on a dead-zone court sync automatically the moment any device reconnects.' },
    { icon: Download, title: 'Export Anytime', desc: 'One-click CSV or JSON export of full standings — essential if the venue Wi-Fi dies mid-event.' },
    { icon: Ambulance, title: 'Retirement & Injury Handling', desc: 'Flag a mid-match retirement that awards the opponent a win while preserving the partial score for tie-breaker ratios.' },
];

const AUDIENCES = [
    {
        role: 'Player',
        icon: Swords,
        color: 'text-primary-400',
        bg: 'from-primary-900/30 to-slate-900',
        border: 'border-primary-700/30',
        tagline: 'Your tournament, in your pocket.',
        perks: [
            'Self-centered lobby — only your matches, front and centre',
            'Push alerts when your match is called',
            'Submit scores from the court, even offline',
            'Live pool standings updated after every match',
            'Personal stats across all your tournaments',
        ],
    },
    {
        role: 'Host',
        icon: Crown,
        color: 'text-yellow-400',
        bg: 'from-yellow-900/20 to-slate-900',
        border: 'border-yellow-700/30',
        tagline: 'Run a 64-player event single-handedly.',
        perks: [
            'One-click tournament creation with format builder',
            'Late-basket player injection without redrawing brackets',
            'Global Kill Switch — freeze all matches instantly (rain delay)',
            'QR codes per court for instant player check-in',
            'Export full draw + results as CSV or JSON',
        ],
    },
    {
        role: 'Official',
        icon: ShieldCheck,
        color: 'text-green-400',
        bg: 'from-green-900/20 to-slate-900',
        border: 'border-green-700/30',
        tagline: 'God-mode access when chaos hits.',
        perks: [
            'Marshall Override — force-complete any match with mandatory reason',
            'Proxy score entry for players whose phone battery died',
            'Full audit trail on every submission and action',
            'Retirement / walkover recording with partial score preservation',
            'Dispute resolution panel with both submissions side-by-side',
        ],
    },
];

const STEPS = [
    { n: '01', icon: Users, title: 'Create your account', desc: 'Sign up in 30 seconds. No credit card, no setup fee for players.' },
    { n: '02', icon: Globe, title: 'Find or create an event', desc: 'Browse public tournaments or create yours with the Host dashboard.' },
    {
        n: '03', icon: QrCode, title: 'Check in at the court', desc: "Scan the court QR code to confirm you're ready to play."
    },
    {
        n: '04', icon: Activity, title: 'Play and submit', desc: "Both players submit the score. If they agree, it's locked instantly."
    },
    { n: '05', icon: BarChart2, title: 'Watch the bracket unfold', desc: 'Your win auto-advances you. Live standings update in real time.' },
];

const COMPARE_ROWS = [
    { feature: 'Real-time live scoring', us: true, them: false },
    { feature: 'Dual-entry score verification', us: true, them: false },
    { feature: 'Offline score submission', us: true, them: false },
    { feature: 'Push notifications per match', us: true, them: false },
    { feature: 'QR court check-in', us: true, them: false },
    { feature: 'Dispute resolution workflow', us: true, them: false },
    { feature: 'Global kill switch', us: true, them: false },
    { feature: 'Audit log on all actions', us: true, them: false },
    { feature: 'Retirement/injury handling', us: true, them: false },
    { feature: 'CSV / JSON export', us: true, them: '⚠ Paid' },
];

const ScoreboardPreview = () => {
    const [point, setPoint] = useState({ a: 40, b: 15 });
    useEffect(() => {
        const pts = [{ a: 0, b: 0 }, { a: 15, b: 0 }, { a: 30, b: 0 }, { a: 30, b: 15 }, { a: 40, b: 15 }];
        let i = 0;
        const t = setInterval(() => { i = (i + 1) % pts.length; setPoint(pts[i]); }, 1400);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 max-w-sm mx-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
                <span className="flex items-center gap-1.5 text-[11px] font-black text-green-400 uppercase">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live · Court 1
                </span>
                <span className="text-[11px] text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">Set 2</span>
            </div>

            <div className="grid grid-cols-3 items-center gap-3 mb-5">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary-900/50 mx-auto mb-2 flex items-center justify-center text-2xl font-black text-primary-400">F</div>
                    <p className="font-black text-sm text-white">Federer</p>
                    <p className="text-[10px] text-slate-500">#1 Seed</p>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-black tracking-tighter mb-1 text-white">
                        6<span className="text-slate-700 text-2xl mx-0.5">:</span>4
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${point.a}-${point.b}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="bg-slate-800 rounded-xl px-2.5 py-1 text-sm font-black text-primary-400"
                        >
                            {point.a} — {point.b}
                        </motion.div>
                    </AnimatePresence>
                </div>
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 mx-auto mb-2 flex items-center justify-center text-2xl font-black text-white">N</div>
                    <p className="font-black text-sm text-white">Nadal</p>
                    <p className="text-[10px] text-slate-500">#2 Seed</p>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-green-900/20 border border-green-800/30 rounded-xl px-3 py-2">
                    <CheckCircle2 size={12} className="text-green-400" />
                    <span className="text-[10px] font-bold text-green-400">Federer submitted</span>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                    <Timer size={12} className="text-slate-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500">Awaiting Nadal…</span>
                </div>
            </div>
        </div>
    );
};

export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeAudience, setActiveAudience] = useState(0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-primary-500 selection:text-white">
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="px-6 h-16 flex items-center justify-between max-w-7xl mx-auto">
                    <Link to="/" className="flex items-center gap-2">
                        <Trophy className="text-primary-500" size={24} />
                        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
                            Tennis Royale
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-10 text-sm font-bold text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                        <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Log in</Link>
                        <Link to="/login" className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 font-black transition-all shadow-lg shadow-primary-900/40">
                            Get Started
                        </Link>
                    </div>

                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-8 space-y-6"
                        >
                            <nav className="flex flex-col gap-6 text-lg font-bold">
                                <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
                                <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
                                <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
                            </nav>
                            <div className="flex flex-col gap-3">
                                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center py-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold">Log in</Link>
                                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center py-4 rounded-2xl bg-primary-600 font-bold">Get Started</Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <section className="relative px-6 pt-24 pb-32 lg:pt-36 lg:pb-48 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary-600/10 blur-[120px] rounded-full pointer-events-none" />

                <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-primary-950/60 border border-primary-700/40 rounded-full px-4 py-2 text-xs font-black text-primary-400 mb-8 uppercase tracking-widest">
                        <Star size={12} className="fill-primary-400" />
                        The professional venue standard
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-8 tracking-tighter">
                        TOURNAMENTS <br />
                        <span className="bg-gradient-to-r from-primary-400 via-indigo-400 to-primary-400 bg-clip-text text-transparent">REINVENTED.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
                        Live scoring, double-entry verification, and court QR check-in. Powering Nairobi's premier venues with offline-first reliability.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/login" className="w-full sm:w-auto px-12 py-5 bg-primary-600 hover:bg-primary-500 rounded-2xl font-black text-lg transition-all shadow-2xl shadow-primary-900/50 flex items-center justify-center gap-2">
                            Enter the Lobby <ArrowRight size={20} />
                        </Link>
                        <Link to="/login" className="w-full sm:w-auto px-10 py-5 bg-slate-900/50 hover:bg-slate-800 rounded-2xl font-black text-lg border border-slate-800 transition-all">
                            View Live Draw
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-24 sm:mt-32 relative z-10 max-w-sm mx-auto"
                >
                    <ScoreboardPreview />
                </motion.div>
            </section>

            <section id="features" className="px-6 py-32 bg-slate-900/30 border-y border-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">POWERFUL FEATURES.</h2>
                        <p className="text-slate-400 max-w-xl mx-auto font-medium">Everything you need to run high-stakes events with zero stress.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {FEATURES.map((feature, i) => (
                            <div key={i} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 p-8 rounded-3xl hover:border-primary-500/30 transition-all group">
                                <div className="w-12 h-12 bg-primary-950/60 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <feature.icon size={24} className="text-primary-400" />
                                </div>
                                <h3 className="text-lg font-black mb-3">{feature.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="px-6 py-20 border-t border-slate-800/50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-2">
                        <Trophy className="text-primary-500" size={24} />
                        <span className="text-xl font-black tracking-tight text-white">Tennis Royale</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        © 2026 Tennis Royale. Nairobi's Professional Standard.
                    </p>
                    <div className="flex gap-8 text-sm font-bold text-slate-400">
                        <Link to="/login" className="hover:text-white transition-colors">Privacy</Link>
                        <Link to="/login" className="hover:text-white transition-colors">Terms</Link>
                        <Link to="/contact" className="hover:text-white transition-colors">Support</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
