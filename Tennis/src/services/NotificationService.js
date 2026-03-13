/**
 * NotificationService — Browser Push Notifications + system alerts
 * ─────────────────────────────────────────────────────────────
 * Uses the Web Notification API for immediate local notifications.
 * Designed to be extended with Firebase Cloud Messaging (FCM) for
 * remote push once a service worker is registered.
 *
 * SOW §4.1: notify on match "Called" + Kill Switch fire
 */

const NotificationService = {

    /** Request notification permission from the browser */
    async requestPermission() {
        if (!('Notification' in window)) return 'unsupported';
        if (Notification.permission === 'granted') return 'granted';
        const result = await Notification.requestPermission();
        return result; // 'granted' | 'denied' | 'default'
    },

    /** Show a local browser notification */
    _show(title, options = {}) {
        if (Notification.permission !== 'granted') return;
        const n = new Notification(title, {
            icon: '/icon-192.png',
            badge: '/icon-72.png',
            ...options,
        });
        // Auto-close after 8 seconds
        setTimeout(() => n.close(), 8000);
        return n;
    },

    // ── Domain-specific notifications ──────────────────────

    /** SOW §4.1 step 4: Court has been assigned — notify both players */
    matchCalled({ playerName, opponent, court, time }) {
        this._show(`🎾 Court ${court} — Your Match Is Called!`, {
            body: `${playerName} vs ${opponent}\nHead to Court ${court}` + (time ? ` · ${time}` : ''),
            tag: `match-called-${Date.now()}`,
        });
    },

    /** SOW §5: Kill Switch — rain delay / suspension */
    killSwitch({ reason = 'Rain delay' } = {}) {
        this._show('⚠️ Tournament Suspended', {
            body: `${reason} — All live matches have been paused. Please wait for further instructions from the Host.`,
            tag: 'kill-switch',
            requireInteraction: true,   // stays until dismissed
        });
    },

    /** Match result locked (dispute or completion) */
    matchResult({ isDisputeResolved = false, winner }) {
        if (isDisputeResolved) {
            this._show('✅ Score Dispute Resolved', {
                body: `The official result has been recorded by the Marshall.`,
            });
        } else {
            this._show('✅ Match Completed', {
                body: winner ? `Winner: ${winner}` : 'Match result has been verified.',
            });
        }
    },

    /** Player joined tournament via invite code */
    tournamentJoined({ tournamentName }) {
        this._show(`🏆 Joined: ${tournamentName}`, {
            body: 'You are now registered. Check your Feed for your pool assignment.',
        });
    },
};

export default NotificationService;
