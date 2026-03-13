import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, Bell, Trophy, User, PlusCircle, ShieldCheck, Menu, X, Settings, LogOut, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const AppShell = ({ children }) => {
    const { currentUser, userRole, switchRole } = useAuth();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    // ── 1. BASE PLAYER NAVIGATION ──
    const baseNavItems = [
        { path: '/feed', icon: Home, label: 'Home' },
        { path: '/events', icon: Calendar, label: 'Events' },
        { path: '/tournaments', icon: Trophy, label: 'Explore' },
        { path: '/notifications', icon: Bell, label: 'Alerts' },
        { path: '/profile', icon: User, label: 'Profile' }
    ];

    // ── 2. WORKSPACE / ROLE-SPECIFIC NAVIGATION ──
    const getWorkspaceLinks = () => {
        switch (userRole) {
            case 'coach':
                return [
                    { path: '/roster', icon: User, label: 'My Roster', desc: 'Manage your players and teams' },
                    { path: '/schedule', icon: Calendar, label: 'Schedule', desc: 'Upcoming matches for your players' },
                ];
            case 'official':
                return [
                    { path: '/official', icon: ShieldCheck, label: 'Scoring Desk', desc: 'Manage your assigned matches' },
                ];
            case 'volunteer':
                return [
                    { path: '/tasks', icon: ShieldCheck, label: 'My Duties', desc: 'View and check-off assigned tasks' },
                ];
            case 'host':
            case 'admin':
                return [
                    { path: '/management', icon: ShieldCheck, label: 'Admin Dashboard', desc: 'Manage tournaments and registrations' },
                    { path: '/create', icon: PlusCircle, label: 'Create Tournament', desc: 'Host a new event' },
                ];
            case 'system_manager':
                return [
                    { path: '/users', icon: User, label: 'User Directory', desc: 'Global user management' },
                    { path: '/tournaments', icon: Trophy, label: 'Global Dashboard', desc: 'System-wide oversight' },
                    { path: '/reports', icon: ShieldCheck, label: 'Audit & Reports', desc: 'System logs and analytics' },
                ];
            case 'spectator':
                return [
                    { path: '/media', icon: Trophy, label: 'Media Hub', desc: 'Highlights and photo galleries' },
                ];
            case 'player':
            default:
                return [
                    { path: '/events', icon: Calendar, label: 'My Tournaments', desc: 'View your active brackets and matches' },
                ];
        }
    };

    const workspaceLinks = getWorkspaceLinks();

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 flex overflow-hidden">

            {/* ── DESKTOP SIDEBAR (Static Left Nav for md+ screens) ── */}
            <aside className="hidden md:flex w-64 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/60 flex-col fixed inset-y-0 left-0 z-40">
                <div className="p-6">
                    <Link to="/feed" className="flex items-center gap-3 min-h-0 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:shadow-primary-500/25 transition-all">
                            <Trophy size={20} className="text-white" />
                        </div>
                        <span className="font-black text-xl gradient-text">Tennis Royale</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-hide">
                    {/* Base Player Links */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-3 mb-3">Player Base</h3>
                        {baseNavItems.map(({ path, icon: Icon, label }) => {
                            const active = isActive(path);
                            return (
                                <Link key={path} to={path} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-primary-500/10 text-primary-400 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                                    <Icon size={20} className={active ? '' : 'opacity-70'} />
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Desktop Role Workspace */}
                    <div className="space-y-2">
                        <div className="px-3 flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">{userRole ? userRole.replace('_', ' ') : 'PLAYER'} Tools</h3>
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        </div>
                        {workspaceLinks.map((link) => {
                            const NavIcon = link.icon;
                            return (
                                <Link key={link.path} to={link.path} className="group flex gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-800 block">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800/50 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                                        <NavIcon size={16} />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <p className="font-bold text-sm text-slate-200 group-hover:text-indigo-400 transition-colors">{link.label}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop User Footer */}
                <div className="p-4 border-t border-slate-800">
                    <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-sm font-black ring-2 ring-primary-500/30 shrink-0 shadow-lg">
                            {currentUser?.displayName?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-sm text-white truncate">{currentUser?.displayName || 'Player'}</p>
                            <p className="text-xs text-slate-400 truncate capitalize">{userRole ? userRole.replace('_', ' ') : 'Player'}</p>
                        </div>
                    </Link>
                </div>
            </aside>

            {/* ── MAIN CONTENT AREA ── */}
            <div className="flex-1 flex flex-col w-full md:ml-64">

                {/* ── MOBILE TOP BAR ── */}
                <header className="md:hidden sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                    <div className="px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                                <Menu size={22} />
                            </button>
                            <Link to="/feed" className="flex items-center gap-2 min-h-0">
                                <Trophy className="text-primary-400 shrink-0" size={18} />
                                <span className="font-black text-base gradient-text hidden sm:block">Tennis Royale</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            {userRole && userRole !== 'player' && userRole !== 'spectator' && (
                                <div onClick={() => setDrawerOpen(true)} className="cursor-pointer hidden sm:flex items-center gap-1.5 bg-indigo-900/40 border border-indigo-800/60 pl-2 pr-3 py-1 rounded-full text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                    {userRole.replace('_', ' ')} WORKSPACE
                                </div>
                            )}
                            <Link to="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-sm font-black ring-2 ring-primary-500/30 shrink-0 shadow-lg">
                                {currentUser?.displayName?.[0]?.toUpperCase() || 'D'}
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
                    {/* Inner wrapper to keep content centered on ultra-wide screens if needed */}
                    <div className="h-full w-full">
                        {children}
                    </div>
                </main>

                {/* ── MOBILE BOTTOM NAV ── */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <div className="flex items-stretch justify-around max-w-lg mx-auto">
                        {baseNavItems.map(({ path, icon: Icon, label }) => {
                            const active = isActive(path);
                            return (
                                <Link key={path} to={path} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-0 transition-all ${active ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <div className={`w-5 h-0.5 rounded-full mb-1.5 transition-all ${active ? 'bg-primary-400' : 'bg-transparent'}`} />
                                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                                    <span className={`text-[10px] font-bold mt-0.5 ${active ? 'text-primary-400' : 'text-slate-600'}`}>{label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {/* ── MOBILE SIDE DRAWER (Workspace / Tools) ── */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="md:hidden fixed top-0 bottom-0 left-0 z-50 w-[85%] max-w-[320px] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col"
                            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                        >
                            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg">
                                        <Trophy size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-sm text-white">Tennis Royale</h2>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{userRole ? userRole.replace('_', ' ') : 'PLAYER'} Workspace</p>
                                    </div>
                                </div>
                                <button onClick={() => setDrawerOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Professional Tools</h3>
                                    <div className="space-y-2">
                                        {workspaceLinks.map((link) => {
                                            const NavIcon = link.icon;
                                            return (
                                                <Link
                                                    key={link.path}
                                                    to={link.path}
                                                    onClick={() => setDrawerOpen(false)}
                                                    className="group flex gap-3 p-3 rounded-2xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700/50 block"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-primary-500/20 group-hover:text-primary-400 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                                                        <NavIcon size={18} />
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <p className="font-bold text-sm text-slate-200 group-hover:text-primary-400 transition-colors">{link.label}</p>
                                                        <p className="text-xs text-slate-500 leading-snug truncate pr-2">{link.desc}</p>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-500 transition-opacity">
                                                        <ChevronRight size={16} />
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-800 my-4" />

                                <div className="space-y-3 bg-indigo-900/10 border border-indigo-900/40 p-4 rounded-3xl">
                                    <h3 className="text-[10px] font-black text-indigo-400/80 uppercase tracking-widest flex items-center gap-1.5">
                                        <Settings size={12} /> Environment Simulator
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-snug">Toggle roles to preview other workspaces.</p>
                                    <select
                                        value={userRole}
                                        onChange={(e) => {
                                            switchRole(e.target.value);
                                            setDrawerOpen(false);
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="player">Player (Base)</option>
                                        <option value="host">Host / Organizer</option>
                                        <option value="official">Official / Referee</option>
                                        <option value="coach">Coach</option>
                                        <option value="volunteer">Volunteer / Staff</option>
                                        <option value="spectator">Spectator / Media</option>
                                        <option value="system_manager">System Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-800">
                                <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                                    <LogOut size={14} /> System Logout
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AppShell;
