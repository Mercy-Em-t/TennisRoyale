import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import OfflineQueue from '../services/OfflineQueue';

/**
 * OfflineBanner
 * ─────────────────────────────────────────────────────────────
 * Shows a sticky top banner when:
 *   • The device is offline  — red "No connection" state
 *   • Just came back online with queued actions — amber "Syncing" state
 *   • Queue drained — green "Back online" state (auto-hides after 3s)
 *
 * Props:
 *   onFlush(processFn) — optional callback to trigger queue flush
 */
const OfflineBanner = ({ onFlush }) => {
    const [online, setOnline] = useState(navigator.onLine);
    const [queueCount, setQueueCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [justSynced, setJustSynced] = useState(false);

    // Poll queue count every 5 seconds
    useEffect(() => {
        const poll = async () => {
            const n = await OfflineQueue.count();
            setQueueCount(n);
        };
        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, []);

    // Network status listeners
    useEffect(() => {
        const goOnline = async () => {
            setOnline(true);
            const n = await OfflineQueue.count();
            if (n > 0 && onFlush) {
                setSyncing(true);
                await onFlush();
                setSyncing(false);
                setQueueCount(0);
                setJustSynced(true);
                setTimeout(() => setJustSynced(false), 3000);
            }
        };
        const goOffline = () => setOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [onFlush]);

    const visible = !online || syncing || justSynced || (!online && queueCount > 0);

    const bannerState = !online
        ? 'offline'
        : syncing
            ? 'syncing'
            : justSynced
                ? 'synced'
                : null;

    const config = {
        offline: {
            bg: 'bg-red-900/90 border-red-800',
            icon: <WifiOff size={15} className="shrink-0" />,
            text: queueCount > 0
                ? `No connection · ${queueCount} action${queueCount > 1 ? 's' : ''} queued`
                : 'No internet connection — changes will sync when connected',
            dot: 'bg-red-500',
        },
        syncing: {
            bg: 'bg-amber-900/90 border-amber-800',
            icon: <RefreshCw size={15} className="shrink-0 animate-spin" />,
            text: `Syncing ${queueCount} queued action${queueCount > 1 ? 's' : ''}…`,
            dot: 'bg-amber-500',
        },
        synced: {
            bg: 'bg-green-900/90 border-green-800',
            icon: <Wifi size={15} className="shrink-0" />,
            text: 'Back online — all changes synced ✓',
            dot: 'bg-green-500',
        },
    };

    if (!bannerState) return null;

    const { bg, icon, text, dot } = config[bannerState];

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: -48, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -48, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`fixed top-0 left-0 right-0 z-[100] ${bg} border-b text-white text-xs font-bold px-4 py-2.5 flex items-center gap-2`}
                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
                >
                    <span className={`w-2 h-2 rounded-full ${dot} animate-pulse shrink-0`} />
                    {icon}
                    <span className="flex-1">{text}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineBanner;
