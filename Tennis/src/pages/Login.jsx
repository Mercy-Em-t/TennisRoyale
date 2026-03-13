import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Mail, Lock, Eye, EyeOff, ArrowLeft, Users } from 'lucide-react';

const errorMessages = {
    'auth/user-not-found': 'No account found for this email.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
};

const Login = () => {
    const { login, loginAsGuest, isDevMode } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ email: form.email, password: form.password });
            navigate('/feed');
        } catch (err) {
            setError(errorMessages[err.code] || 'Sign in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        setLoading(true);
        try {
            await loginAsGuest();
            navigate('/feed');
        } catch (err) {
            setError('Guest sign-in failed. Check Firebase credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-8"
            >
                {/* Logo / back */}
                <div className="text-center">
                    <Link to="/" className="inline-flex items-center gap-2 group mb-6">
                        <ArrowLeft size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                        <Trophy className="text-primary-400" size={28} />
                        <span className="text-lg font-black gradient-text">Tennis Royale</span>
                    </Link>
                    <h1 className="text-2xl font-black">Welcome back</h1>
                    <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
                </div>

                {isDevMode && (
                    <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl p-3 text-xs text-amber-400 text-center font-bold">
                        ⚠️ DEV MODE — set VITE_DEV_MODE=false to use real Firebase auth
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email" required
                                value={form.email}
                                onChange={e => update('email', e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password</label>
                            <button type="button" className="text-[10px] text-primary-400 hover:text-primary-300 min-h-0 h-auto">Forgot password?</button>
                        </div>
                        <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type={showPass ? 'text' : 'password'} required
                                value={form.password}
                                onChange={e => update('password', e.target.value)}
                                placeholder="Your password"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 min-h-0 h-auto p-1">
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-red-400 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-primary-900/30 mt-2">
                        {loading ? 'Signing in…' : 'Sign In →'}
                    </button>
                </form>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-600">or</span>
                    <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Guest */}
                <button onClick={handleGuest} disabled={loading}
                    className="w-full py-3.5 rounded-2xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <Users size={16} /> Continue as Guest
                </button>

                <div className="bg-primary-950/10 border border-primary-500/20 rounded-2xl p-6 text-center space-y-3">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400">
                            <Users size={18} />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">In a Team?</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium px-4">
                        If your coach registered you, claim your roster spot by entering your email.
                    </p>
                    <button
                        onClick={() => navigate('/signup?claim=true')}
                        className="text-[10px] h-8 px-4 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 font-black rounded-full border border-primary-600/20 transition-all uppercase tracking-widest"
                    >
                        Claim Roster Spot
                    </button>
                </div>

                <p className="text-center text-sm text-slate-500">
                    No account?{' '}
                    <Link to="/signup" className="text-primary-400 font-bold hover:text-primary-300">Sign up free</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
