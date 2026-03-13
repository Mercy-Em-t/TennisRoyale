import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Zap, Globe, ShieldCheck, ChevronRight, Users, Star,
    Menu, X, CheckCircle2, Activity, Crown, Swords, Timer,
    BarChart2, QrCode, Bell, WifiOff, Download, ArrowRight,
    Ambulance, Lock
} from 'lucide-react';

// ── Animation variants ────────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }),
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

const TESTIMONIALS = [
    { name: 'Amara K.', role: 'Tournament Host — Nairobi CC', stars: 5, quote: 'Ran a 48-player event by myself for the first time. The kill-switch saved us during a lightning delay.' },
    { name: 'Diego R.', role: 'Competitive Club Player', stars: 5, quote: 'The lobby only showing MY matches is such a smart design. I stopped caring about who else was playing.' },
    { name: 'Priya M.', role: 'Club Official — Westlands Tennis', stars: 5, quote: 'The audit trail meant a disputed score got resolved in 2 minutes. Both players accepted the result.' },
    { name: 'Kofi A.', role: 'Host — Ghana Open Series', stars: 5, quote: 'The export button alone is worth it. Backed up our draw to CSV at half-time when the Wi-Fi dropped.' },
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
    { feature: 'Retirement / injury handling', us: true, them: false },
    { feature: 'CSV / JSON export', us: true, them: '⚠ Paid' },
];

// ── Live scoreboard preview (animated) ───────────────────────
const ScoreboardPreview = () => {
    const [point, setPoint] = useState({ a: 40, b: 15 });
    useEffect(() => {
        const pts = [{ a: 0, b: 0 }, { a: 15, b: 0 }, { a: 30, b: 0 }, { a: 30, b: 15 }, { a: 40, b: 15 }];
        let i = 0;
        const t = setInterval(() => { i = (i + 1) % pts.length; setPoint(pts[i]); }, 1400);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="glass-card rounded-3xl p-6 max-w-sm mx-auto shadow-2xl shadow-black/40">
            {/* Match header */}
            <div className="flex items-center justify-between mb-5">
                <span className="flex items-center gap-1.5 text-[11px] font-black text-green-400 uppercase">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live · Court 1
                </span>
                <span className="text-[11px] text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">Set 2</span>
            </div>

            {/* Set score */}
            <div className="grid grid-cols-3 items-center gap-3 mb-5">
                {/* Player A */}
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary-900/50 mx-auto mb-2 flex items-center justify-center text-2xl font-black text-primary-400">F</div>
                    <p className="font-black text-sm">Federer</p>
                    <p className="text-[10px] text-slate-500">#1 Seed</p>
                </div>
                {/* Score */}
                <div className="text-center">
                    <div className="text-4xl font-black tracking-tighter mb-1">
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
                {/* Player B */}
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 mx-auto mb-2 flex items-center justify-center text-2xl font-black">N</div>
                    <p className="font-black text-sm">Nadal</p>
                    <p className="text-[10px] text-slate-500">#2 Seed</p>
                </div>
            </div>

            {/* Submission status */}
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

// ── Main Component ────────────────────────────────────────────
const LandingPage = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeAudience, setActiveAudience] = useState(0);

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 overflow-x-hidden">

            {/* ── STICKY NAV ── */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="px-4 sm:px-8 h-14 flex items-center justify-between max-w-6xl mx-auto">
                    <Link to="/" className="flex items-center gap-2 min-h-0">
                        <Trophy className="text-primary-400 shrink-0" size={22} />
                        <span className="text-lg font-black gradient-text">Tennis Royale</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
                        {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['/about', 'About Us'], ['/contact', 'Contact']].map(([href, label]) => (
                            href.startsWith('#')
                                ? <a key={href} href={href} className="hover:text-white transition-colors min-h-0">{label}</a>
                                : <Link key={href} to={href} className="hover:text-white transition-colors min-h-0">{label}</Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="text-sm px-4 py-2 text-slate-300 hover:text-white transition-colors rounded-xl min-h-0">Log in</Link>
                        <Link to="/signup" className="text-sm px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold transition-all shadow-lg shadow-primary-900/40 min-h-0">Sign up free</Link>
                    </div>

                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white min-h-0">
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                <AnimatePresence>
                    {menuOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-slate-800 bg-slate-950 px-5 pb-5 space-y-1">
                            {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['/about', 'About Us'], ['/contact', 'Contact']].map(([href, label]) => (
                                href.startsWith('#')
                                    ? <a key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center text-slate-300 hover:text-white font-medium">{label}</a>
                                    : <Link key={href} to={href} onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center text-slate-300 hover:text-white font-medium">{label}</Link>
                            ))}
                            <div className="pt-3 flex flex-col gap-2 border-t border-slate-800">
                                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center py-3 rounded-2xl border border-slate-700 font-bold text-sm">Log in</Link>
                                <Link to="/signup" onClick={() => setMenuOpen(false)} className="w-full text-center py-3 rounded-2xl bg-primary-600 font-bold text-sm">Sign up free</Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ── HERO ── */}
            <section className="relative px-4 sm:px-8 pt-16 pb-20 sm:pt-28 sm:pb-36 text-center overflow-hidden">
                {/* Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[700px] h-[400px] bg-primary-600/12 blur-[120px] rounded-full pointer-events-none" />

                <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-primary-950/60 border border-primary-700/40 rounded-full px-4 py-1.5 text-xs font-bold text-primary-400 mb-6">
                        <Star size={11} className="fill-primary-400" />
                        The tournament platform built for real tennis venues
                    </div>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-[1.04] mb-6 tracking-tight">
                        Run every tournament<br />
                        <span className="gradient-text">like a professional.</span>
                    </h1>

                    <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Real-time scoring with double-entry verification, automated bracket progression, court QR check-in,
                        offline resilience, and a dedicated view for every role — Player, Host, or Official.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
                        <Link to="/signup" className="w-full sm:w-auto px-10 py-4 bg-primary-500 hover:bg-primary-400 rounded-2xl font-black text-base shadow-2xl shadow-primary-900/50 transition-all flex items-center justify-center gap-2">
                            Start for free <ArrowRight size={18} />
                        </Link>
                        <Link to="/events" className="w-full sm:w-auto px-8 py-4 bg-slate-800/80 hover:bg-slate-700 rounded-2xl font-bold text-base border border-slate-700 transition-all flex items-center justify-center gap-2">
                            <Zap size={15} className="text-green-400" /> See live events
                        </Link>
                    </div>
                    <p className="text-xs text-slate-700 mt-4">Free for players · No credit card required</p>
                </motion.div>

                {/* Animated scoreboard preview */}
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
                    className="relative z-10 mt-16 max-w-sm mx-auto"
                >
                    <ScoreboardPreview />
                    {/* Floating labels */}
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                        className="absolute -left-4 top-8 bg-green-900/80 border border-green-700/40 rounded-xl px-3 py-1.5 text-[10px] font-bold text-green-400 shadow-xl hidden sm:block">
                        ✓ Both scores matched — locked
                    </motion.div>
                    <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 3.5 }}
                        className="absolute -right-4 bottom-8 bg-primary-900/80 border border-primary-700/40 rounded-xl px-3 py-1.5 text-[10px] font-bold text-primary-400 shadow-xl hidden sm:block">
                        🏆 Advancing to QF
                    </motion.div>
                </motion.div>
            </section>

            {/* ── STATS BAR ── */}
            <section className="border-y border-slate-800 bg-slate-900/50">
                <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                    {STATS.map(({ n, label }, i) => (
                        <motion.div key={label} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}>
                            <p className="text-3xl sm:text-4xl font-black gradient-text">{n}</p>
                            <p className="text-xs text-slate-500 mt-1">{label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── FOR YOU (Audience split) ── */}
            <section id="for-you" className="px-4 sm:px-8 py-20 sm:py-28 max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-black mb-3">
                        Built for <span className="gradient-text">every role on court.</span>
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
                        One platform, three distinct experiences — each designed around what that person actually needs on tournament day.
                    </p>
                </div>

                {/* Tab buttons */}
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                    {AUDIENCES.map(({ role, icon: Icon, color }, i) => (
                        <button key={role} onClick={() => setActiveAudience(i)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all min-h-0 ${activeAudience === i
                                ? 'bg-slate-800 border-slate-600 text-white'
                                : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}>
                            <Icon size={14} className={activeAudience === i ? color : ''} />
                            {role}
                        </button>
                    ))}
                </div>

                {/* Active audience panel */}
                <AnimatePresence mode="wait">
                    {AUDIENCES.map((a, i) => activeAudience === i && (
                        <motion.div key={a.role}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className={`bg-gradient-to-br ${a.bg} border ${a.border} rounded-3xl p-8 sm:p-12 space-y-6`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-2xl bg-slate-900/60 flex items-center justify-center shrink-0`}>
                                    <a.icon size={24} className={a.color} />
                                </div>
                                <div>
                                    <p className={`text-xs font-black uppercase mb-0.5 ${a.color}`}>{a.role}</p>
                                    <h3 className="text-2xl sm:text-3xl font-black">{a.tagline}</h3>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                {a.perks.map(perk => (
                                    <li key={perk} className="flex items-start gap-3 text-sm text-slate-300">
                                        <CheckCircle2 size={16} className={`${a.color} shrink-0 mt-0.5`} />
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup"
                                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all min-h-0 text-white bg-slate-800 hover:bg-slate-700 border border-slate-700`}>
                                Get started as {a.role} <ChevronRight size={16} />
                            </Link>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" className="px-4 sm:px-8 py-20 sm:py-28 bg-slate-900/40 border-y border-slate-800">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl font-black mb-3">
                            Everything a venue needs.<br />
                            <span className="gradient-text">Nothing it doesn't.</span>
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                            We've thought through every edge case — from a player's dead battery to a sudden rainstorm — so you don't have to.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                            <motion.div key={title}
                                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i % 4}
                                className="glass-card p-6 rounded-2xl hover:border-primary-500/30 transition-all group space-y-3"
                            >
                                <div className="w-10 h-10 bg-primary-950/60 rounded-xl flex items-center justify-center group-hover:bg-primary-900/40 transition-colors">
                                    <Icon size={20} className="text-primary-400" />
                                </div>
                                <h3 className="font-bold text-sm leading-snug">{title}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="px-4 sm:px-8 py-20 sm:py-28 max-w-4xl mx-auto">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-black mb-3">From sign-up to <span className="gradient-text">match point.</span></h2>
                    <p className="text-slate-400 text-sm sm:text-base">Five steps. No confusion. No paper draws.</p>
                </div>

                <div className="relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800 hidden sm:block" />

                    <div className="space-y-8">
                        {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
                            <motion.div key={n}
                                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                                className="flex gap-5 items-start"
                            >
                                <div className="shrink-0 w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center relative z-10">
                                    <Icon size={20} className="text-primary-400" />
                                </div>
                                <div className="pt-1">
                                    <div className="text-[10px] font-black text-slate-600 uppercase mb-0.5">{n}</div>
                                    <h3 className="font-bold text-base mb-1">{title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section id="testimonials" className="px-4 sm:px-8 py-20 sm:py-24 bg-slate-900/40 border-y border-slate-800">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-black text-center mb-12">
                        Trusted at the <span className="gradient-text">real venues.</span>
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                        {TESTIMONIALS.map(({ name, role, stars, quote }, i) => (
                            <motion.div key={name}
                                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                                className="glass-card p-6 rounded-2xl space-y-4 shrink-0 w-72 sm:w-auto"
                            >
                                <div className="flex gap-1">{[...Array(stars)].map((_, j) => <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />)}</div>
                                <p className="text-slate-300 text-sm leading-relaxed italic">"{quote}"</p>
                                <div>
                                    <p className="font-bold text-sm">{name}</p>
                                    <p className="text-xs text-slate-500">{role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PARTNER & HOST ── */}
            <section id="partner" className="px-4 sm:px-8 py-20 sm:py-28 bg-gradient-to-b from-slate-900/0 to-primary-950/10">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-indigo-400">
                            Partner Ecosystem
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black leading-tight">
                            Scale your <span className="text-indigo-400">venue</span> or <span className="text-primary-400">sponsorship</span> program.
                        </h2>
                        <p className="text-slate-400 leading-relaxed">
                            Whether you manage a 20-court facility or want to reach a highly engaged community of competitive players, Tennis Royale provides the tools to manage inventory, display sponsorships, and analyze event success.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/contact" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all text-center">
                                Partner with us
                            </Link>
                            <Link to="/contact?subject=host" className="px-8 py-4 glass-card border-slate-700 rounded-2xl font-bold transition-all text-center">
                                Host a major tournament
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { title: 'Sponsor Inventory', icon: Star, desc: 'Digital banners on scoreboard screens.' },
                            { title: 'Court Management', icon: QrCode, desc: 'Individual QR codes for every physical court.' },
                            { title: 'White-Label Option', icon: ShieldCheck, desc: 'Your club branding front and center.' },
                            { title: 'Advanced Analytics', icon: BarChart2, iconColor: 'text-green-400', desc: 'Detailed event participation reports.' },
                        ].map((box, i) => (
                            <div key={i} className="glass-card p-6 rounded-3xl space-y-3">
                                <box.icon size={22} className={box.iconColor || 'text-primary-400'} />
                                <h4 className="font-bold text-sm">{box.title}</h4>
                                <p className="text-[10px] text-slate-500 leading-normal">{box.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="compare" className="px-4 sm:px-8 py-20 sm:py-28 max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-black mb-3">
                        How we compare to <span className="gradient-text">spreadsheets & apps.</span>
                    </h2>
                    <p className="text-slate-400 text-sm">The features that matter most in a real tournament environment, honestly compared.</p>
                </div>
                <div className="glass-card rounded-3xl overflow-hidden">
                    <div className="grid grid-cols-3 px-6 py-4 bg-slate-800/60 text-xs font-black uppercase text-slate-400 border-b border-slate-700">
                        <div>Feature</div>
                        <div className="text-center text-primary-400">Tennis Royale</div>
                        <div className="text-center">Others</div>
                    </div>
                    {COMPARE_ROWS.map(({ feature, us, them }, i) => (
                        <div key={feature}
                            className={`grid grid-cols-3 px-6 py-4 text-sm border-b border-slate-800/60 ${i % 2 === 0 ? '' : 'bg-slate-900/30'}`}
                        >
                            <div className="text-slate-300 pr-4">{feature}</div>
                            <div className="text-center">
                                {us ? <CheckCircle2 size={18} className="text-green-400 mx-auto" /> : <X size={18} className="text-red-500 mx-auto" />}
                            </div>
                            <div className="text-center">
                                {them === true
                                    ? <CheckCircle2 size={18} className="text-slate-600 mx-auto" />
                                    : typeof them === 'string'
                                        ? <span className="text-amber-500 text-xs font-bold">{them}</span>
                                        : <X size={18} className="text-slate-700 mx-auto" />}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FINAL CTA ── */}
            <section className="px-4 sm:px-8 py-20 sm:py-28 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-950/20 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                    <Trophy size={44} className="text-primary-400 mx-auto" />
                    <h2 className="text-4xl sm:text-5xl font-black leading-tight">
                        Your next tournament<br />
                        <span className="gradient-text">starts here.</span>
                    </h2>
                    <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto">
                        Join thousands of players and hosts who've moved beyond paper draws and WhatsApp scores.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md sm:max-w-none mx-auto">
                        <Link to="/signup"
                            className="px-10 py-4 bg-primary-500 hover:bg-primary-400 rounded-2xl font-black text-lg shadow-2xl shadow-primary-900/40 transition-all flex items-center justify-center gap-2">
                            Create free account <ArrowRight size={20} />
                        </Link>
                        <Link to="/login"
                            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-base border border-slate-700 transition-all text-center">
                            Already have an account →
                        </Link>
                    </div>
                    <p className="text-xs text-slate-700">Free for players · Hosts from $0 · No hidden fees</p>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t border-slate-800 px-4 sm:px-8 py-10"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-primary-500" />
                        <span className="font-black text-slate-400">Tennis Royale</span>
                        <span>· Tournament Management Platform</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/about" className="hover:text-slate-400 transition-colors">About Us</Link>
                        <Link to="/contact" className="hover:text-slate-400 transition-colors">Contact</Link>
                        <Link to="/events" className="hover:text-slate-400 transition-colors">Events</Link>
                        <a href="#partner" className="hover:text-slate-400 transition-colors">Partnerships</a>
                    </div>
                    <p>© 2026 Tennis Royale · All rights reserved</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
