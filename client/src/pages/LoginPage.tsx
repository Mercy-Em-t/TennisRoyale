import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, registerHost } from '../api';
import { Trophy, Mail, Lock, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await apiLogin(email, password);
        login(res.data.user || res.data.host || { id: 'unknown', name: email, email, role: 'host' }, res.data.token);
        navigate('/dashboard');
      } else {
        await registerHost(name, email, password);
        const res = await apiLogin(email, password);
        login(res.data.user || res.data.host || { id: 'unknown', name: name, email, role: 'host' }, res.data.token);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-primary-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 shadow-2xl shadow-primary-950/50 mb-6"
          >
            <Trophy size={32} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter gradient-text uppercase mb-2">Tennis Royale</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">System Authentication</p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 md:p-10">
          <div className="flex p-1.5 bg-slate-950/50 rounded-2xl mb-8 border border-slate-800/50">
            <button
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'login' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setTab('login')}
            >
              Log In
            </button>
            <button
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'register' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setTab('register')}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {tab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter legal name"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all placeholder:text-slate-700 font-medium"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@venue.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all placeholder:text-slate-700 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                {tab === 'login' && (
                  <button type="button" className="text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-400">Forgot?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all placeholder:text-slate-700 font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-xs font-bold flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary-950/40 disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {tab === 'login' ? 'Access System' : 'Initialize Account'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {tab === 'register' && (
            <p className="mt-8 text-[10px] text-slate-500 text-center font-bold leading-relaxed px-4">
              By initializing an account, you agree to the <span className="text-slate-400">Venue Terms of Service</span> and <span className="text-slate-400">Security Audit Agreement</span>.
            </p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
            <Sparkles size={14} /> Encrypted
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-800" />
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
            v1.0.4 Stable
          </div>
        </div>
      </motion.div>
    </div>
  );
}
