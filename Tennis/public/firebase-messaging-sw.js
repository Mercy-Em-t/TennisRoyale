// Firebase Cloud Messaging Service Worker
// ─────────────────────────────────────────────────────────────
// Required for background push notifications when the app is
// not in the foreground. Must live at /public root.
//
// This file is served at /firebase-messaging-sw.js (no-cache)
// Firebase SDK imports via CDN (importScripts is mandatory in SW context).

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config — must match your project exactly
// In a real CI pipeline these would be injected at build time
firebase.initializeApp({
    apiKey: self.VITE_FIREBASE_API_KEY || '__FIREBASE_API_KEY__',
    authDomain: self.VITE_FIREBASE_AUTH_DOMAIN || '__FIREBASE_AUTH_DOMAIN__',
    projectId: self.VITE_FIREBASE_PROJECT_ID || '__FIREBASE_PROJECT_ID__',
    storageBucket: self.VITE_FIREBASE_STORAGE_BUCKET || '__FIREBASE_STORAGE_BUCKET__',
    messagingSenderId: self.VITE_FIREBASE_MESSAGING_ID || '__FIREBASE_MESSAGING_ID__',
    appId: self.VITE_FIREBASE_APP_ID || '__FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// Background notification handler
// Handles push messages when the app is closed or in the background
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const { title, body, icon } = payload.notification || {};
    const link = payload.data?.link || '/feed';

    const options = {
        body: body || '',
        icon: icon || '/icon-192.png',
        badge: '/icon-72.png',
        data: { link },
        vibrate: [200, 100, 200],
        requireInteraction: payload.data?.requireInteraction === 'true',
        actions: [
            { action: 'open', title: '▶ Open App' },
            { action: 'dismiss', title: '✕ Dismiss' },
        ],
    };

    self.registration.showNotification(title || 'Tennis Royale', options);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const link = event.notification.data?.link || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(link);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(link);
        })
    );
});
