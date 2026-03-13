/**
 * AdBanner — Monetization Ad Unit Component
 * ─────────────────────────────────────────────────────────────
 * Supports 4 formats:
 *   'leaderboard' — full-width horizontal banner (320×50 → 728×90)
 *   'native'      — blends with match/tournament card list
 *   'sidebar'     — vertical rectangle (300×250)
 *   'interstitial'— full-width section break with sponsor CTA
 *
 * In production: swap the placeholder <div> for <ins class="adsbygoogle">
 * or your ad network's tag. The slot IDs are wired as data attributes.
 *
 * Google AdSense integration:
 *   1. Add <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" to index.html
 *   2. Replace DEV placeholders below with real <ins> tags
 *   3. Set VITE_AD_CLIENT and VITE_AD_SLOT_* in .env.local
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

// ── Sponsor placeholder data shown in DEV_MODE ────────────────
// Replace with real ads in production
const DEMO_SPONSORS = [
    {
        id: 's1',
        tag: 'EQUIPMENT',
        headline: 'Wilson Pro Staff X — Built for Champions',
        body: 'Official racket of the ATP Tour. 15% off for tournament players.',
        cta: 'Shop Now',
        url: '#',
        accent: 'from-red-900/40 to-slate-900',
        badge: '#E31837',
    },
    {
        id: 's2',
        tag: 'NUTRITION',
        headline: 'Fuel Your Game with Precision',
        body: 'Isotonic sports drinks trusted by pros. Maximum hydration on court.',
        cta: 'Get Free Sample',
        url: '#',
        accent: 'from-cyan-900/40 to-slate-900',
        badge: '#00B4D8',
    },
    {
        id: 's3',
        tag: 'COACHING',
        headline: 'Elite Online Tennis Coaching',
        body: 'Video analysis from ATP-level coaches. Your next level starts here.',
        cta: 'Book a Session',
        url: '#',
        accent: 'from-amber-900/40 to-slate-900',
        badge: '#F59E0B',
    },
    {
        id: 's4',
        tag: 'APPAREL',
        headline: 'Nike Court — Engineered for Speed',
        body: 'Tournament-grade apparel with UV protection and moisture-wicking tech.',
        cta: 'View Collection',
        url: '#',
        accent: 'from-violet-900/40 to-slate-900',
        badge: '#7C3AED',
    },
];

// Deterministic pick — rotate based on position so each slot shows a different ad
let _globalIndex = 0;
const pickSponsor = () => DEMO_SPONSORS[(_globalIndex++) % DEMO_SPONSORS.length];

// ── Google AdSense slot (renders in production if window.adsbygoogle exists) ──
const AdSenseSlot = ({ client, slot, format = 'auto', responsive = true }) => {
    const ref = useRef(null);
    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (_) { }
    }, []);

    return (
        <ins
            ref={ref}
            className="adsbygoogle block"
            style={{ display: 'block' }}
            data-ad-client={client || import.meta.env.VITE_AD_CLIENT || ''}
            data-ad-slot={slot || ''}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
        />
    );
};

// ── Format: Leaderboard (full-width banner) ────────────────────
const LeaderboardAd = ({ adClient, adSlot, isLive }) => {
    const s = pickSponsor();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full my-2"
        >
            <p className="text-[9px] text-slate-600 uppercase text-center mb-1 tracking-widest">
                Sponsored
            </p>
            {isLive && adClient ? (
                <AdSenseSlot client={adClient} slot={adSlot} format="horizontal" />
            ) : (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center justify-between gap-4 w-full bg-gradient-to-r ${s.accent} border border-white/5 rounded-2xl px-5 py-3 hover:border-white/10 transition-all group overflow-hidden`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: s.badge }}>{s.tag}</span>
                        <p className="text-xs font-bold text-slate-200 truncate">{s.headline}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-black text-white/70 group-hover:text-white transition-colors flex items-center gap-1">
                        {s.cta} <ExternalLink size={9} />
                    </span>
                </a>
            )}
        </motion.div>
    );
};

// ── Format: Native Card (blends with match cards) ─────────────
const NativeAd = ({ adClient, adSlot, isLive }) => {
    const s = pickSponsor();
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[9px] text-slate-600 uppercase text-center mb-1 tracking-widest">
                Advertisement
            </p>
            {isLive && adClient ? (
                <AdSenseSlot client={adClient} slot={adSlot} format="fluid" />
            ) : (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className={`block w-full bg-gradient-to-br ${s.accent} border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group space-y-2`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: s.badge }}>{s.tag}</span>
                        <span className="text-[9px] text-slate-600">Ad</span>
                    </div>
                    <p className="text-sm font-black text-white leading-tight">{s.headline}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.body}</p>
                    <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                            {s.cta} <ExternalLink size={10} />
                        </span>
                    </div>
                </a>
            )}
        </motion.div>
    );
};

// ── Format: Interstitial (full-width section break) ────────────
const InterstitialAd = ({ adClient, adSlot, isLive }) => {
    const s = pickSponsor();
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full my-1">
            <p className="text-[9px] text-slate-600 uppercase text-center mb-2 tracking-widest">Sponsored</p>
            {isLive && adClient ? (
                <AdSenseSlot client={adClient} slot={adSlot} format="rectangle" />
            ) : (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className={`relative flex flex-col sm:flex-row items-center gap-4 w-full bg-gradient-to-r ${s.accent} border border-white/8 rounded-3xl p-6 overflow-hidden hover:border-white/15 transition-all group`}
                >
                    {/* Decorative circle */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10"
                        style={{ backgroundColor: s.badge }} />
                    <div className="flex-1 min-w-0 space-y-1">
                        <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white mb-1"
                            style={{ backgroundColor: s.badge }}>{s.tag}</span>
                        <p className="font-black text-base text-white leading-tight">{s.headline}</p>
                        <p className="text-xs text-slate-400">{s.body}</p>
                    </div>
                    <span className="shrink-0 px-6 py-3 rounded-2xl font-black text-sm text-white transition-all group-hover:brightness-110"
                        style={{ backgroundColor: s.badge }}>
                        {s.cta}
                    </span>
                </a>
            )}
        </motion.div>
    );
};

// ── Main export ────────────────────────────────────────────────
/**
 * @param {string}  format     - 'leaderboard' | 'native' | 'interstitial' (default: 'leaderboard')
 * @param {string}  adClient   - Google AdSense publisher ID (ca-pub-XXXX). Omit to use placeholder.
 * @param {string}  adSlot     - Google AdSense slot ID. Omit to use placeholder.
 * @param {boolean} isLive     - Set true in production to render real AdSense slots.
 */
const AdBanner = ({
    format = 'leaderboard',
    adClient = import.meta.env.VITE_AD_CLIENT || '',
    adSlot = '',
    isLive = !!import.meta.env.VITE_AD_CLIENT,
}) => {
    if (format === 'native') return <NativeAd adClient={adClient} adSlot={adSlot} isLive={isLive} />;
    if (format === 'interstitial') return <InterstitialAd adClient={adClient} adSlot={adSlot} isLive={isLive} />;
    return <LeaderboardAd adClient={adClient} adSlot={adSlot} isLive={isLive} />;
};

export default AdBanner;
