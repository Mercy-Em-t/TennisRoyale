import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

const ContactUs = () => {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', subject: 'partnership', message: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Mock submission
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-primary-500/30">
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
                <div className="px-4 sm:px-8 h-14 flex items-center justify-between max-w-6xl mx-auto">
                    <Link to="/" className="flex items-center gap-2">
                        <Trophy className="text-primary-400" size={22} />
                        <span className="text-lg font-black gradient-text">Tennis Royale</span>
                    </Link>
                    <Link to="/signup" className="text-sm px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold transition-all shadow-lg shadow-primary-900/40">Sign up</Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-start">
                {/* Left: Info */}
                <div className="space-y-12">
                    <div className="space-y-6">
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
                            Let's talk <br />
                            <span className="gradient-text">tournaments.</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-md leading-relaxed">
                            Whether you're looking to sponsor a major event or just want to roll out the platform at your local club, we’re here to help.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 shrink-0">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">General Inquiries</h3>
                                <p className="text-slate-500">hello@tennisroyale.app</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                <MessageSquare size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Partnerships & Sponsorships</h3>
                                <p className="text-slate-500">partners@tennisroyale.app</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="glass-card rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {!submitted ? (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSubmit}
                                className="space-y-6 relative z-10"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">FullName</label>
                                    <input
                                        type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
                                        placeholder="Roger Federer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">Email Address</label>
                                    <input
                                        type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
                                        placeholder="roger@tennis.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">Subject</label>
                                    <select
                                        value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all appearance-none"
                                    >
                                        <option value="partnership">Partner with us</option>
                                        <option value="host">Hosting a big event</option>
                                        <option value="support">Technical Support</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">Message</label>
                                    <textarea
                                        required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all resize-none"
                                        placeholder="Tell us about your project/query..."
                                    />
                                </div>
                                <button type="submit" className="w-full bg-primary-500 hover:bg-primary-400 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary-900/40 flex items-center justify-center gap-2">
                                    Send Message <Send size={20} />
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12 space-y-6"
                            >
                                <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold">Message Sent!</h2>
                                    <p className="text-slate-400">Thanks for reaching out. A team member will get back to you within 24 hours.</p>
                                </div>
                                <button onClick={() => setSubmitted(false)} className="text-primary-400 font-bold hover:underline">Send another message</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <footer className="border-t border-slate-800 px-8 py-12 text-center text-sm text-slate-500 mt-auto">
                <p>© 2026 Tennis Royale · Let's professionalize the court.</p>
            </footer>
        </div>
    );
};

export default ContactUs;
