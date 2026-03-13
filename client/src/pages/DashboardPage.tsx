// HMR Cache Bust: 1
import React from 'react';
import { useAuth } from '../context/AuthContext';
import HostDashboard from './HostDashboard';
import PlayerDashboard from './PlayerDashboard';
import RefereeDashboard from './RefereeDashboard';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
            <Loader2 className="animate-spin text-primary-500 relative z-10" size={48} />
          </div>
          <div className="space-y-2 relative z-10">
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Initializing Core Matrix</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Synchronizing User Permissions...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Switch based on activeRole
  switch (activeRole) {
    case 'admin':
    case 'host':
      return <HostDashboard />;
    case 'referee':
      return <RefereeDashboard />;
    case 'player':
    default:
      return <PlayerDashboard />;
  }
}
