import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Mail, Lock, Eye, EyeOff, ArrowLeft, User, CheckCircle2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import CoachService from '../services/CoachService';

const errorMessages = {
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Check your connection.',
};

const SignUp = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isClaimMode = new URLSearchParams(location.search).get('claim') === 'true';

    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [claimStatus, setClaimStatus] = useState('idle'); // 'idle' | 'found' | 'not_found' | 'success'
    const [shadowUser, setShadowUser] = useState(null);

    const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleCheckShadow = async () => {
        setLoading(true);
        setError('');
        try {
            const user = await CoachService.checkShadowAccount(form.email);
            if (user) {
                setShadowUser(user);
                setForm(p => ({ ...p, name: user.displayName }));
                setClaimStatus('found');
            } else {
                setClaimStatus('not_found');
            }
        } catch (err) {
            setError("Could not verify email.");
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await CoachService.claimAccount(shadowUser.uid, form.password);
            setClaimStatus('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError("Failed to activate account.");
        } finally {
            setLoading(false);
        }
    };

    if (isClaimMode && claimStatus === 'success') {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm text-center space-y-6">
                    <div className="w-20 h-20 bg-green-900/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white">Account Activated!</h2>
                        <p className="text-sm text-slate-400">Welcome to the team. You're being redirected to login.</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-8"
            >
                <div className="text-center">
                    <Link to="/" className="inline-flex items-center gap-2 group mb-6">
                        <ArrowLeft size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                        <Trophy className="text-primary-400" size={28} />
                        <span className="text-lg font-black gradient-text">Tennis Royale</span>
                    </Link>
                    <h1 className="text-2xl font-black">
                        {isClaimMode ? 'Claim your spot' : 'Create your account'}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {isClaimMode ? 'Verify your roster invitation' : 'Free forever for players.'}
                    </p>
                </div>

                <form onSubmit={isClaimMode ? (claimStatus === 'found' ? handleClaim : handleCheckShadow) : handleSubmit} className="space-y-4">
                    {/* Name (Only for standard signup or if found) */}
                    {(!isClaimMode || claimStatus === 'found') && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                                {isClaimMode ? 'Confirm Full Name' : 'Full Name'}
                            </label>
                            <div className="relative">
                                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
                                    readOnly={isClaimMode}
                                    placeholder="Roger Federer"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                            </div>
                        </motion.div>
                    )}

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Invite Email</label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                                readOnly={isClaimMode && claimStatus === 'found'}
                                placeholder="you@example.com"
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>
                        {isClaimMode && claimStatus === 'not_found' && (
                            <p className="text-[10px] text-red-400 font-bold mt-2 ml-1">No roster invitation found for this email.</p>
                        )}
                    </div>

                    {/* Password (Only if claiming or normal) */}
                    {(!isClaimMode || claimStatus === 'found') && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                                {isClaimMode ? 'Set New Password' : 'Password'}
                            </label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type={showPass ? 'text' : 'password'} required minLength={6}
                                    value={form.password} onChange={e => update('password', e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 min-h-0 h-auto p-1">
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-red-400 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-primary-900/30 mt-2">
                        {loading ? 'Processing…' : (
                            isClaimMode ? (claimStatus === 'found' ? 'Activate Account →' : 'Check Invitation →') : 'Create Account →'
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-400 font-bold hover:text-primary-300">Log in</Link>
                </p>
                <p className="text-center text-[10px] text-slate-700">
                    By signing up you agree to our Terms of Service.
                </p>
            </motion.div>
        </div>
    );
};

export default SignUp;
