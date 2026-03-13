import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Calendar, Bell, Trophy, User, LayoutDashboard, Menu, X, Settings, LogOut, ChevronRight, Zap, GraduationCap, Scale, ClipboardCheck, Activity, UserCheck } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { AnimatePresence, motion } from 'framer-motion';

interface AppShellProps {
    children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
    const { user, activeRole, logout, switchToPlayer, switchToManagement, hasManagementRole } = useAuth();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const tournamentId = location.pathname.split('/tournaments/')[1]?.split('/')[0];

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const baseNavItems = [
        { path: '/dashboard', icon: Home, label: 'Lobby' },
        { path: '/feed', icon: Activity, label: 'Stream' },
        { path: '/events', icon: Trophy, label: 'Events' },
        { path: '/profile', icon: User, label: 'Profile' }
    ];

    const getWorkspaceLinks = () => {
        if (activeRole === 'host' || activeRole === 'admin') {
            return [
                { path: '/dashboard', label: 'Host Dashboard', icon: LayoutDashboard, desc: 'Manage your tournaments' },
                { path: `/tournaments/${tournamentId || ''}/logistics`, label: 'Court Logistics', icon: ClipboardCheck, desc: 'Real-time court readiness' }
            ];
        }
        if (activeRole === 'referee') {
            return [
                { path: '/official', label: 'Referee Hub', icon: Scale, desc: 'Score your assigned matches' }
            ];
        }
        if (activeRole === 'coach') {
            return [
                { path: '/coach', label: 'Coach Hub', icon: GraduationCap, desc: 'Manage your athlete roster' }
            ];
        }
        if (activeRole === 'volunteer') {
            return [
                { path: '/volunteer', label: 'Staff Hub', icon: UserCheck, desc: 'Operational duty console' }
            ];
        }
        return [
            { path: '/events', label: 'My Registrations', icon: Calendar, desc: 'View your entry status' }
        ];
    };

    const workspaceLinks = getWorkspaceLinks();

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 flex overflow-hidden">

            {/* ── DESKTOP SIDEBAR ── */}
            <aside className="hidden md:flex w-72 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/50 flex-col fixed inset-y-0 left-0 z-40">
                <div className="p-8">
                    <Link to="/dashboard" className="flex items-center gap-3.5 group">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-primary-900/40 group-hover:scale-105 transition-transform">
                            <Trophy size={22} className="text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter gradient-text">Tennis Royale</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-10 scrollbar-hide">
                    {/* Main Nav */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-4 mb-4">Lobby Base</h3>
                        {baseNavItems.map(({ path, icon: Icon, label }) => {
                            const active = isActive(path);
                            return (
                                <Link key={label} to={path} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-primary-500/10 text-primary-400 font-black' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}>
                                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                                    <span className="text-sm">{label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Workspace Section */}
                    <div className="space-y-3">
                        <div className="px-4 flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">{activeRole?.toUpperCase()} TOOLS</h3>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        </div>
                        {workspaceLinks.map((link, i) => (
                            <Link key={i} to={link.path} className="group flex gap-4 p-4 rounded-2xl hover:bg-slate-900 transition-all border border-transparent hover:border-slate-800">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 flex items-center justify-center text-slate-600 transition-colors shrink-0">
                                    <link.icon size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-sm text-slate-200 group-hover:text-white transition-colors">{link.label}</p>
                                    <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1 group-hover:text-slate-500">{link.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* User Footer */}
                <div className="p-6 border-t border-slate-900/50">
                    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-950/40 shrink-0 capitalize">
                                {user?.name?.[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <Link to="/profile" className="font-black text-sm text-white truncate hover:text-primary-400 transition-colors block">{user?.name}</Link>
                                <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold mt-0.5">{activeRole}</p>
                            </div>
                            <button onClick={logout} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                                <LogOut size={18} />
                            </button>
                        </div>
                        {hasManagementRole && (
                            <button
                                onClick={activeRole === 'player' ? switchToManagement : switchToPlayer}
                                className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/30 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                Switch to {activeRole === 'player' ? 'Admin' : 'Player'}
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 flex flex-col w-full md:ml-72 relative">

                {/* ── MOBILE HEADER ── */}
                <header className="md:hidden sticky top-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800/30 safe-top">
                    <div className="px-5 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setDrawerOpen(true)} className="p-3 -ml-2 text-slate-500 hover:text-white active:bg-slate-900 rounded-2xl transition-all">
                                <Menu size={24} strokeWidth={2.5} />
                            </button>
                            <span className="font-black text-lg uppercase tracking-widest gradient-text">Royale</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setNotifOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-500 relative">
                                <Bell size={20} />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-slate-950" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-black shadow-xl shadow-indigo-950/40 shrink-0">
                                {user?.name?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto pb-32 md:pb-10 bg-[#020617]">
                    <div className="w-full">
                        {children}
                    </div>
                </main>

                {/* ── MOBILE BOTTOM NAV ── */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/98 backdrop-blur-3xl border-t border-slate-800/50 safe-bottom">
                    <div className="flex items-stretch justify-around px-2 py-4">
                        {baseNavItems.map(({ path, icon: Icon, label }) => {
                            const active = isActive(path);
                            return (
                                <Link key={label} to={path} className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all ${active ? 'text-primary-400' : 'text-slate-600 hover:text-slate-400'}`}>
                                    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {/* ── MOBILE DRAWER ── */}
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
                            className="md:hidden fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] bg-slate-900 border-r border-slate-800/50 flex flex-col shadow-2xl safe-top safe-bottom"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                                        <Trophy size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-sm text-white">Royale Menu</h2>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Workspace</p>
                                    </div>
                                </div>
                                <button onClick={() => setDrawerOpen(false)} className="p-2.5 bg-slate-800 rounded-xl text-slate-400">
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-8">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-3">System Actions</h3>
                                    <div className="space-y-2">
                                        {workspaceLinks.map((link, i) => (
                                            <Link key={i} to={link.path} onClick={() => setDrawerOpen(false)} className="flex gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary-400 shrink-0">
                                                    <link.icon size={20} />
                                                </div>
                                                <div className="flex-1 justify-center flex flex-col">
                                                    <p className="font-black text-sm text-slate-200">{link.label}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 pr-4">{link.desc}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-primary-950/20 border border-primary-900/30 rounded-3xl">
                                    <h4 className="text-xs font-black text-primary-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Zap size={12} className="fill-primary-400" /> Go Premium
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-4">Unlock court check-ins and live bracket notifications.</p>
                                    <button className="w-full py-2.5 bg-primary-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Upgrade Hub</button>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800">
                                <button onClick={logout} className="w-full py-4 bg-slate-800 rounded-2xl text-xs font-black text-red-400 flex items-center justify-center gap-2">
                                    <LogOut size={16} /> Sign Out System
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
    );
};

export default AppShell;
