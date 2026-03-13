import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, Bell, Shield, Sliders, CreditCard, HelpCircle,
    Activity, Settings, ChevronRight, Save, LogOut, Search,
    Monitor, ExternalLink, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

// Custom Toggle Component
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${checked ? 'bg-primary-500' : 'bg-slate-700'}`}
    >
        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const AccountSettingsPage = () => {
    const { user, activeRole, logout } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Mock Settings State
    const [settings, setSettings] = useState({
        notifications: { push: true, email: false, reminders: '30min', updates: true, mentions: true },
        privacy: { publicProfile: true, allowInvites: true, twoFactor: false },
        preferences: { theme: 'dark', language: 'en-US', homeTab: 'events', dateFormat: 'MM/DD/YYYY' },
    });

    const [displayName, setDisplayName] = useState(user?.name || '');

    const updateToggle = (category: keyof typeof settings, key: string) => {
        setSettings(prev => ({
            ...prev,
            [category]: { ...prev[category], [key]: !(prev[category] as any)[key] }
        }));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        // Mock API call
        setTimeout(() => {
            setSaving(false);
        }, 1500);
    };

    const handleLogout = async () => {
        logout();
        navigate('/');
    };

    // Role checks (using mock logic matching original source)
    const showAdminPanel = activeRole !== 'player';
    const showSystemPanel = activeRole === 'system_manager' || activeRole === 'admin';

    return (
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12 pb-32 space-y-12">

            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link to="/profile" className="p-4 bg-slate-900/50 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white shadow-xl border border-slate-800/50">
                        <ChevronRight size={20} className="rotate-180" />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                            System <span className="gradient-text italic">Cockpit</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-[10px] mt-2 uppercase tracking-[0.3em] ml-1">Power Control Interface</p>
                    </div>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search system nodes..."
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white placeholder:text-slate-700"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* ── DESKTOP NAVIGATION SIDEBAR ── */}
                <div className="hidden lg:block lg:col-span-3">
                    <nav className="sticky top-24 space-y-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.3em] px-5 py-4">Directives</h3>
                        <a href="#account" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-white hover:bg-slate-900 transition-all"><User size={18} className="text-primary-500" /> Profile Matrix</a>
                        <a href="#notifications" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-white hover:bg-slate-900 transition-all"><Bell size={18} className="text-primary-500" /> Notifications</a>
                        <a href="#privacy" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-white hover:bg-slate-900 transition-all"><Shield size={18} className="text-primary-500" /> Privacy Guard</a>
                        <a href="#preferences" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-white hover:bg-slate-900 transition-all"><Sliders size={18} className="text-primary-500" /> Preferences</a>
                        <a href="#payment" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-white hover:bg-slate-900 transition-all"><CreditCard size={18} className="text-primary-500" /> Financial Nodes</a>
                        <a href="#support" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-white hover:bg-slate-900 transition-all"><HelpCircle size={18} className="text-primary-500" /> Query Support</a>

                        {(showAdminPanel || showSystemPanel) && (
                            <div className="pt-8 pb-2">
                                <h3 className="text-[10px] font-black uppercase text-indigo-500/70 tracking-[0.3em] px-5 py-4 border-t border-slate-900">Advanced Matrix</h3>
                            </div>
                        )}
                        {showAdminPanel && (
                            <a href="#admin-control" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-indigo-400 hover:text-white hover:bg-indigo-950/30 transition-all mt-1"><Activity size={18} className="text-indigo-500" /> Admin Command</a>
                        )}
                        {showSystemPanel && (
                            <a href="#system-control" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black text-red-400 hover:text-white hover:bg-red-950/20 transition-all mt-1"><Settings size={18} className="text-red-500" /> System Override</a>
                        )}
                    </nav>
                </div>

                {/* ── SETTINGS PANELS ── */}
                <div className="lg:col-span-9 space-y-12">

                    {/* 1. ACCOUNT */}
                    <section id="account" className="glass-card rounded-[2.5rem] p-10 space-y-10 border-t-4 border-primary-500/20 shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-slate-900/80 pb-6">
                            <User className="text-primary-500" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">Account Profile</h2>
                        </div>

                        <div className="flex flex-col md:flex-row gap-10 items-start">
                            {/* Profile Picture */}
                            <div className="flex flex-col items-center gap-6 shrink-0">
                                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl shadow-primary-900/40">
                                    {user?.name?.[0]?.toUpperCase() || 'P'}
                                </div>
                                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Change Avatar</button>
                            </div>

                            {/* Details Form */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Email Node</label>
                                        <input type="email" defaultValue={user?.email || ''} disabled className="w-full bg-slate-950/80 border border-slate-900 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-slate-700 cursor-not-allowed uppercase tracking-tighter" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Contact Sync</label>
                                        <input type="tel" placeholder="+254 7XX XXX XXX" className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. NOTIFICATIONS */}
                    <section id="notifications" className="glass-card rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-slate-900/80 pb-6">
                            <Bell className="text-primary-500" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">Notifications</h2>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'push', label: 'Push Directives', desc: 'Receive real-time alerts to your device interface.' },
                                { id: 'email', label: 'Email Archive', desc: 'Synchronize weekly summaries and critical updates.' },
                                { id: 'updates', label: 'Matrix Updates', desc: 'Draw releases, schedule shifts, and live score pings.' }
                            ].map(item => (
                                <div key={item.id} className="flex items-center justify-between p-6 bg-slate-900/30 border border-slate-800/50 rounded-3xl hover:bg-slate-900/60 transition-all group">
                                    <div>
                                        <p className="font-black text-sm text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{item.label}</p>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight opacity-70">{item.desc}</p>
                                    </div>
                                    <Toggle checked={(settings.notifications as any)[item.id]} onChange={() => updateToggle('notifications', item.id)} />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 3. PRIVACY & SECURITY */}
                    <section id="privacy" className="glass-card rounded-[2.5rem] p-10 space-y-8 shadow-2xl border-l-4 border-indigo-500/20">
                        <div className="flex items-center gap-4 border-b border-slate-900/80 pb-6">
                            <Shield className="text-indigo-500" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">Privacy Guard</h2>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'publicProfile', label: 'Public Visibility', desc: 'Allow other system entities to view your statistics.' },
                                { id: 'allowInvites', label: 'Direct Invitations', desc: 'Permit automatic team enrollment from allied players.' },
                                { id: 'twoFactor', label: 'Bi-Factor Auth', desc: 'Layer security with external synchronization.' }
                            ].map(item => (
                                <div key={item.id} className="flex items-center justify-between p-6 bg-slate-900/30 border border-slate-800/50 rounded-3xl hover:bg-slate-900/60 transition-all group">
                                    <div>
                                        <p className="font-black text-sm text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{item.label}</p>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight opacity-70">{item.desc}</p>
                                    </div>
                                    <Toggle checked={(settings.privacy as any)[item.id]} onChange={() => updateToggle('privacy', item.id)} />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. APP PREFERENCES */}
                    <section id="preferences" className="glass-card rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-slate-900/80 pb-6">
                            <Sliders className="text-primary-500" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">Preferences</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Interface Skin</label>
                                <select
                                    value={settings.preferences.theme}
                                    onChange={(e) => setSettings(p => ({ ...p, preferences: { ...p.preferences, theme: e.target.value } }))}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                >
                                    <option value="dark">STALWART DARK (DEFAULT)</option>
                                    <option value="light">PRISTINE LIGHT</option>
                                    <option value="system">NEURAL SYSTEM</option>
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Logic Pattern</label>
                                <select
                                    value={settings.preferences.dateFormat}
                                    onChange={(e) => setSettings(p => ({ ...p, preferences: { ...p.preferences, dateFormat: e.target.value } }))}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                >
                                    <option value="MM/DD/YYYY">US ANSI (12-HR)</option>
                                    <option value="DD/MM/YYYY">ISO GLOBAL (24-HR)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* 7. TOURNAMENT ADMIN CONTROL */}
                    {showAdminPanel && (
                        <section id="admin-control" className="glass-card rounded-[2.5rem] p-10 space-y-8 border-t-8 border-indigo-600/40 relative overflow-hidden shadow-2xl">
                            <div className="absolute -top-4 -right-4 p-8 bg-indigo-500/10 rounded-full blur-3xl" />
                            <div className="flex items-center gap-4 border-b border-indigo-900/40 pb-6">
                                <Activity className="text-indigo-400" size={24} />
                                <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">Admin Command Console</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Register Validation', desc: 'Sync pending participant entries' },
                                    { label: 'Draw Orchestration', desc: 'Manually adjust pool distributions' },
                                    { label: 'Metric Analytics', desc: 'Export engagement engagement datasets' },
                                    { label: 'Audit Archives', desc: 'Track history of score modifications' },
                                ].map(action => (
                                    <button key={action.label} className="flex flex-col gap-2 p-6 bg-indigo-950/20 hover:bg-indigo-900/40 border border-indigo-900/30 rounded-3xl text-left transition-all group">
                                        <p className="font-black text-xs text-indigo-300 group-hover:text-white uppercase tracking-widest">{action.label}</p>
                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tight opacity-70">{action.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>

            {/* STICKY BOTTOM SAVE BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-slate-950/90 backdrop-blur-3xl border-t border-slate-900 flex justify-end z-[100]">
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-slate-900 transition-all border border-transparent hover:border-slate-800/50">
                        <LogOut size={16} /> Disconnect System
                    </button>
                    <button onClick={() => handleSave()} disabled={saving} className="bg-primary-600 hover:bg-primary-500 px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 shadow-2xl shadow-primary-950/60 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-70 text-white">
                        {saving ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save size={20} />}
                        {saving ? 'Synchronizing Cluster...' : 'Commit Settings'}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AccountSettingsPage;
