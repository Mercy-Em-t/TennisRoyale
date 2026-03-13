import React, { useState } from 'react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, Bell, Shield, Sliders, CreditCard, HelpCircle,
    Activity, Settings, ChevronRight, Save, LogOut, Search,
    Monitor, Check, ExternalLink, RefreshCw
} from 'lucide-react';

// Custom Toggle Component
const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${checked ? 'bg-primary-500' : 'bg-slate-700'}`}
    >
        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const AccountSettings = () => {
    const { currentUser, userData, userRole, updateUserData, logout } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Mock Settings State
    // Default fallback settings
    const defaultSettings = {
        notifications: { push: true, email: false, reminders: '30min', updates: true, mentions: true },
        privacy: { publicProfile: true, allowInvites: true, twoFactor: false },
        preferences: { theme: 'dark', language: 'en-US', homeTab: 'events', dateFormat: 'MM/DD/YYYY' },
    };

    const [settings, setSettings] = useState(userData?.settings || defaultSettings);
    const [displayName, setDisplayName] = useState(userData?.displayName || currentUser?.displayName || '');

    // Sync state when userData loads from cloud
    React.useEffect(() => {
        if (userData) {
            if (userData.settings) setSettings(userData.settings);
            if (userData.displayName) setDisplayName(userData.displayName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.uid]); // Re-run only on user context change

    const updateToggle = (category, key) => {
        setSettings(prev => ({
            ...prev,
            [category]: { ...prev[category], [key]: !prev[category][key] }
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await updateUserData({
                displayName,
                settings
            });
        } catch (err) {
            console.error('Failed to sync settings:', err);
        } finally {
            setTimeout(() => setSaving(false), 500);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (err) {
            console.error(err);
        }
    };

    // Role computations
    const showAdminPanel = userRole === ROLES.HOST || userRole === ROLES.ADMIN || userRole === ROLES.SYSTEM_MANAGER;
    const showSystemPanel = userRole === ROLES.SYSTEM_MANAGER;

    return (
        <div className="max-w-xl md:max-w-5xl lg:max-w-7xl mx-auto px-4 lg:px-8 py-8 md:py-12 pb-32">

            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <Link to="/profile" className="p-3 bg-slate-800/80 hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-white shadow-sm">
                        <ChevronRight size={20} className="rotate-180" />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black">App <span className="text-primary-400">Settings</span></h1>
                        <p className="text-slate-500 font-bold text-sm md:text-base mt-1 uppercase tracking-widest">Power Control Cockpit</p>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search settings..."
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:font-normal"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                {/* ── DESKTOP NAVIGATION SIDEBAR ── */}
                <div className="hidden lg:block lg:col-span-3">
                    <nav className="sticky top-24 space-y-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-4 py-3">Configuration</h3>
                        <a href="#account" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"><User size={18} className="text-primary-400" /> Account Profile</a>
                        <a href="#notifications" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"><Bell size={18} className="text-primary-400" /> Notifications</a>
                        <a href="#privacy" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"><Shield size={18} className="text-primary-400" /> Privacy & Security</a>
                        <a href="#preferences" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"><Sliders size={18} className="text-primary-400" /> Preferences</a>
                        <a href="#payment" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"><CreditCard size={18} className="text-primary-400" /> Payment & Billing</a>
                        <a href="#support" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"><HelpCircle size={18} className="text-primary-400" /> Help & Support</a>

                        {(showAdminPanel || showSystemPanel) && (
                            <div className="pt-6 pb-2">
                                <h3 className="text-[10px] font-black uppercase text-indigo-400/70 tracking-widest px-4 py-2 border-t border-slate-800">Advanced Access</h3>
                            </div>
                        )}
                        {showAdminPanel && (
                            <a href="#admin-control" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-indigo-300 hover:bg-indigo-900/30 transition-colors mt-1"><Activity size={18} className="text-indigo-400" /> Tournament Admin</a>
                        )}
                        {showSystemPanel && (
                            <a href="#system-control" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-300 hover:bg-red-900/20 transition-colors mt-1"><Settings size={18} className="text-red-400" /> System Manager</a>
                        )}
                    </nav>
                </div>

                {/* ── SETTINGS PANELS ── */}
                <div className="lg:col-span-9 space-y-8">

                    {/* 1. ACCOUNT */}
                    <section id="account" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-8 border-t-2 border-primary-500/20">
                        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
                            <User className="text-primary-400" size={26} />
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-200">Account Profile</h2>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Profile Picture */}
                            <div className="flex flex-col items-center gap-4 shrink-0">
                                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-5xl font-black shadow-2xl shadow-primary-900/30">
                                    {currentUser?.displayName?.[0]?.toUpperCase() || 'D'}
                                </div>
                                <button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors">Change Avatar</button>
                            </div>

                            {/* Details Form */}
                            <div className="flex-1 w-full space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                        <input type="email" defaultValue={currentUser?.email || 'mercy@example.com'} disabled className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none text-slate-500 cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                                        <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white" />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm">Account Password</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Last changed 3 months ago</p>
                                        </div>
                                        <button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors">Update Password</button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm">Active Roles</p>
                                            <div className="mt-1.5 flex gap-2">
                                                <span className="text-[10px] bg-primary-900/40 text-primary-400 border border-primary-800/60 rounded-full px-2.5 py-1 font-bold uppercase tracking-wider">Player</span>
                                                {userRole !== ROLES.PLAYER && <span className="text-[10px] bg-indigo-900/40 text-indigo-400 border border-indigo-800/60 rounded-full px-2.5 py-1 font-bold uppercase tracking-wider">{userRole.replace('_', ' ')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. NOTIFICATIONS */}
                    <section id="notifications" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
                            <Bell className="text-primary-400" size={26} />
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-200">Notifications</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Push Notifications</p>
                                    <p className="text-xs text-slate-500 mt-1">Receive alerts directly to your device.</p>
                                </div>
                                <Toggle checked={settings.notifications.push} onChange={() => updateToggle('notifications', 'push')} />
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Email Digest</p>
                                    <p className="text-xs text-slate-500 mt-1">Receive weekly summaries and important updates via email.</p>
                                </div>
                                <Toggle checked={settings.notifications.email} onChange={() => updateToggle('notifications', 'email')} />
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Tournament Updates</p>
                                    <p className="text-xs text-slate-500 mt-1">Draw releases, schedule changes, and live score alerts.</p>
                                </div>
                                <Toggle checked={settings.notifications.updates} onChange={() => updateToggle('notifications', 'updates')} />
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Match Reminders</p>
                                    <p className="text-xs text-slate-500 mt-1">When should we alert you before a match starts?</p>
                                </div>
                                <select
                                    value={settings.notifications.reminders}
                                    onChange={(e) => setSettings(p => ({ ...p, notifications: { ...p.notifications, reminders: e.target.value } }))}
                                    className="bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="15min">15 Minutes Before</option>
                                    <option value="30min">30 Minutes Before</option>
                                    <option value="1hr">1 Hour Before</option>
                                    <option value="none">Off</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* 3. PRIVACY & SECURITY */}
                    <section id="privacy" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
                            <Shield className="text-primary-400" size={26} />
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-200">Privacy & Security</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Public Profile</p>
                                    <p className="text-xs text-slate-500 mt-1">Allow other players to view your statistics and match history.</p>
                                </div>
                                <Toggle checked={settings.privacy.publicProfile} onChange={() => updateToggle('privacy', 'publicProfile')} />
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Allow Team Invites</p>
                                    <p className="text-xs text-slate-500 mt-1">Can other players invite you to join their doubles teams automatically?</p>
                                </div>
                                <Toggle checked={settings.privacy.allowInvites} onChange={() => updateToggle('privacy', 'allowInvites')} />
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                                <div>
                                    <p className="font-bold text-sm">Two-Factor Authentication (2FA)</p>
                                    <p className="text-xs text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                                </div>
                                <Toggle checked={settings.privacy.twoFactor} onChange={() => updateToggle('privacy', 'twoFactor')} />
                            </div>
                            <div className="pt-2">
                                <button className="text-red-400 text-sm font-bold hover:text-red-300 transition-colors uppercase tracking-wider flex items-center gap-2 px-2">
                                    Manage Blocked Users <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 4. APP PREFERENCES */}
                    <section id="preferences" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
                            <Sliders className="text-primary-400" size={26} />
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-200">Preferences</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Visual Theme</label>
                                <select
                                    value={settings.preferences.theme}
                                    onChange={(e) => setSettings(p => ({ ...p, preferences: { ...p.preferences, theme: e.target.value } }))}
                                    className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                >
                                    <option value="dark">Dark Mode (Default)</option>
                                    <option value="light">Light Mode</option>
                                    <option value="system">System Default</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Language</label>
                                <select
                                    value={settings.preferences.language}
                                    onChange={(e) => setSettings(p => ({ ...p, preferences: { ...p.preferences, language: e.target.value } }))}
                                    className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                >
                                    <option value="en-US">English (US)</option>
                                    <option value="sw">Swahili</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Default Home Tab</label>
                                <select
                                    value={settings.preferences.homeTab}
                                    onChange={(e) => setSettings(p => ({ ...p, preferences: { ...p.preferences, homeTab: e.target.value } }))}
                                    className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                >
                                    <option value="feed">Global Feed</option>
                                    <option value="events">My Events</option>
                                    <option value="explore">Explore Tournaments</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Time & Date Format</label>
                                <select
                                    value={settings.preferences.dateFormat}
                                    onChange={(e) => setSettings(p => ({ ...p, preferences: { ...p.preferences, dateFormat: e.target.value } }))}
                                    className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white"
                                >
                                    <option value="MM/DD/YYYY">MM/DD/YYYY (12-hour)</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY (24-hour)</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* 5. PAYMENT & BILLING */}
                    <section id="payment" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
                            <CreditCard className="text-primary-400" size={26} />
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-200">Payment & Billing</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="p-5 border border-slate-800 bg-slate-900/40 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                        <div className="w-6 h-6 rounded-full bg-red-500 -mr-2 mix-blend-multiply opacity-80" />
                                        <div className="w-6 h-6 rounded-full bg-yellow-400 mix-blend-multiply opacity-80" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm tracking-widest text-slate-300">•••• •••• •••• 4242</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Expires 12/28</p>
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-primary-400 hover:text-primary-300 pr-2">Edit</button>
                            </div>
                            <button className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 rounded-2xl text-sm font-bold text-slate-400 transition-all flex justify-center items-center gap-2">
                                + Add Payment Method
                            </button>

                            <div className="pt-4 grid grid-cols-2 gap-4">
                                <button className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all group">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-primary-400 transition-colors">Premium Subscriptions</p>
                                    <p className="font-black text-slate-200">Basic Tier</p>
                                </button>
                                <button className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all group">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-primary-400 transition-colors">History</p>
                                    <p className="font-black text-slate-200">View Invoices</p>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 6. HELP & SUPPORT */}
                    <section id="support" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
                            <HelpCircle className="text-primary-400" size={26} />
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-200">Help & Support</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button className="p-5 bg-slate-900/50 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center justify-between group transition-all">
                                <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">Frequently Asked Questions</span>
                                <ExternalLink size={16} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
                            </button>
                            <button className="p-5 bg-slate-900/50 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center justify-between group transition-all">
                                <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">Contact Support Team</span>
                                <ExternalLink size={16} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
                            </button>
                            <button className="p-5 bg-slate-900/50 hover:bg-slate-800 border border-slate-800/80 rounded-2xl flex items-center justify-between group transition-all">
                                <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">Report a Bug</span>
                                <ExternalLink size={16} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
                            </button>
                            <button className="p-5 bg-primary-900/20 hover:bg-primary-900/40 border border-primary-900/50 rounded-2xl flex items-center justify-between group transition-all">
                                <span className="font-bold text-sm text-primary-400 transition-colors">Reset Tutorial Onboarding</span>
                                <RefreshCw size={16} className="text-primary-600 group-hover:text-primary-400 group-hover:rotate-180 transition-all duration-500" />
                            </button>
                        </div>
                    </section>

                    {/* 7. TOURNAMENT ADMIN CONTROL */}
                    {showAdminPanel && (
                        <section id="admin-control" className="glass-card rounded-[2rem] p-6 lg:p-10 space-y-6 border-t-4 border-indigo-500/40 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 bg-indigo-500/10 rounded-bl-[2rem]">
                                <Activity className="text-indigo-400" size={32} />
                            </div>
                            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-5">
                                <h2 className="text-xl font-black uppercase tracking-wider text-indigo-300">Tournament Admin Control</h2>
                            </div>

                            <p className="text-sm font-bold text-indigo-200/60 max-w-2xl">Advanced controls authorized by your Host or Admin role. These actions affect participants and tournament states.</p>

                            <div className="space-y-4">
                                <button className="w-full flex items-center justify-between p-5 bg-indigo-900/10 hover:bg-indigo-900/30 border border-indigo-500/20 rounded-2xl transition-all group">
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-indigo-200 group-hover:text-white">Approve Registrations</p>
                                        <p className="text-xs text-indigo-400/50 mt-1">Review pending player team applications</p>
                                    </div>
                                    <ChevronRight size={20} className="text-indigo-500/50 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                </button>
                                <button className="w-full flex items-center justify-between p-5 bg-indigo-900/10 hover:bg-indigo-900/30 border border-indigo-500/20 rounded-2xl transition-all group">
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-indigo-200 group-hover:text-white">Tournament Analytics Dashboard</p>
                                        <p className="text-xs text-indigo-400/50 mt-1">Player engagement, drop-outs, and match times</p>
                                    </div>
                                    <ChevronRight size={20} className="text-indigo-500/50 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                </button>
                                <button className="w-full flex items-center justify-between p-5 bg-indigo-900/10 hover:bg-indigo-900/30 border border-indigo-500/20 rounded-2xl transition-all group">
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-indigo-200 group-hover:text-white">Event Audit Logs</p>
                                        <p className="text-xs text-indigo-400/50 mt-1">Track modifications to scores and schedules</p>
                                    </div>
                                    <ChevronRight size={20} className="text-indigo-500/50 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        </section>
                    )}

                    {/* 8. SYSTEM MANAGER CONTROL */}
                    {showSystemPanel && (
                        <section id="system-control" className="rounded-[2rem] p-6 lg:p-10 space-y-6 border-2 border-red-900/40 bg-red-950/10 relative overflow-hidden backdrop-blur-2xl">
                            <div className="absolute top-0 right-0 p-4 bg-red-500/10 rounded-bl-[2rem]">
                                <Settings className="text-red-500 flex-shrink-0 animate-[spin_10s_linear_infinite]" size={32} />
                            </div>
                            <div className="flex items-center gap-3 border-b border-red-900/40 pb-5">
                                <h2 className="text-xl font-black uppercase tracking-wider text-red-400">System Platform Control</h2>
                            </div>

                            <p className="text-sm font-bold text-red-200/60 max-w-2xl bg-red-900/20 p-4 rounded-xl border border-red-900/30">
                                🚨 DANGER ZONE: Actions taken here impact all instances of the Tennis Royale application globally.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <button className="flex flex-col gap-2 p-5 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded-2xl text-left transition-all group">
                                    <Monitor size={20} className="text-red-500 mb-1" />
                                    <p className="font-black text-sm text-red-200 group-hover:text-white">Platform Configurations</p>
                                    <p className="text-xs font-bold text-red-400/60">Global themes and defaults</p>
                                </button>
                                <button className="flex flex-col gap-2 p-5 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded-2xl text-left transition-all group">
                                    <User size={20} className="text-red-500 mb-1" />
                                    <p className="font-black text-sm text-red-200 group-hover:text-white">Proxy as User</p>
                                    <p className="text-xs font-bold text-red-400/60">Impersonate hosts for debugging</p>
                                </button>
                                <button className="flex flex-col gap-2 p-5 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded-2xl text-left transition-all group">
                                    <Shield size={20} className="text-red-500 mb-1" />
                                    <p className="font-black text-sm text-red-200 group-hover:text-white">Suspend Tournaments</p>
                                    <p className="text-xs font-bold text-red-400/60">Take action on rogue events</p>
                                </button>
                                <button className="flex flex-col gap-2 p-5 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded-2xl text-left transition-all group">
                                    <RefreshCw size={20} className="text-red-500 mb-1" />
                                    <p className="font-black text-sm text-red-200 group-hover:text-white">System Audit & Logs</p>
                                    <p className="text-xs font-bold text-red-400/60">Raw Cloud Function executes</p>
                                </button>
                            </div>
                        </section>
                    )}

                </div>
            </div>

            {/* STICKY BOTTOM SAVE BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 flex justify-end z-50">
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4">
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <LogOut size={16} /> Sign Out
                    </button>
                    <button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-500 px-8 py-3.5 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-primary-900/30 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-70">
                        {saving ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save size={18} />}
                        {saving ? 'SYNCING TO CLOUD...' : 'SAVE ALL CHANGES'}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AccountSettings;
