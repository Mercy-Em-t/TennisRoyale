import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Globe, Users, Star, ArrowRight } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const AboutUs = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-primary-500/30">
            {/* Header / Nav Placeholder (Matches Landing Page style) */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="px-4 sm:px-8 h-14 flex items-center justify-between max-w-6xl mx-auto">
                    <Link to="/" className="flex items-center gap-2">
                        <Trophy className="text-primary-400" size={22} />
                        <span className="text-lg font-black gradient-text">Tennis Royale</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Log in</Link>
                        <Link to="/signup" className="text-sm px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold transition-all shadow-lg shadow-primary-900/40">Sign up</Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-20 sm:py-32 space-y-24">
                {/* Hero */}
                <motion.section variants={fadeUp} initial="hidden" animate="show" className="text-center space-y-6">
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1]">
                        We’re building the <br />
                        <span className="gradient-text">future of club tennis.</span>
                    </h1>
                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        Tennis Royale was born from a simple frustration: running a local tournament shouldn't require three spreadsheets, a WhatsApp group, and a stack of paper draws.
                    </p>
                </motion.section>

                {/* Mission */}
                <section className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Our Mission</h2>
                        <p className="text-slate-400 leading-relaxed text-lg">
                            Our goal is to professionalize the amateur experience. We believe every player, regardless of their rank or club, deserves the thrill of live scoring, instant bracket updates, and a dispute-free environment.
                        </p>
                        <p className="text-slate-400 leading-relaxed text-lg">
                            We focus on bridging the gap between digital convenience and the physical court, ensuring that the technology never gets in the way of the game.
                        </p>
                    </div>
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 aspect-square flex items-center justify-center">
                            <Trophy size={120} className="text-primary-400 animate-pulse-glow" />
                        </div>
                    </div>
                </section>

                {/* Why Us */}
                <section className="grid sm:grid-cols-3 gap-8">
                    {[
                        { icon: Globe, title: 'Global Reach', desc: 'Used across 5 continents by hundreds of clubs.' },
                        { icon: Users, title: 'Player First', desc: 'Designed primarily for the people actually on the court.' },
                        { icon: Star, title: 'Premium Experience', desc: 'No intrusive ads. No bloated metrics. Just tennis.' },
                    ].map((item, i) => (
                        <div key={i} className="glass-card p-8 rounded-2xl space-y-4">
                            <item.icon className="text-primary-400" size={32} />
                            <h3 className="text-xl font-bold">{item.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </section>

                {/* Final CTA */}
                <section className="bg-primary-950/30 border border-primary-900/20 rounded-[2rem] p-8 sm:p-16 text-center space-y-8">
                    <h2 className="text-3xl sm:text-4xl font-black italic">Ready to change how you play?</h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup" className="px-10 py-4 bg-primary-500 hover:bg-primary-400 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2">
                            Join the royalty <ArrowRight size={20} />
                        </Link>
                        <Link to="/contact" className="px-10 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-lg transition-all border border-slate-700">
                            Partner with us
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-800 px-8 py-12 text-center text-sm text-slate-500">
                <p>© 2026 Tennis Royale · The professional choice for amateur events.</p>
            </footer>
        </div>
    );
};

export default AboutUs;
