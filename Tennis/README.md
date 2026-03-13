# Tennis Royale 🎾
### Real-Time Tournament Management Platform

A production-grade, mobile-first tournament platform for tennis with live scoring, bracket progression, dispute resolution, and offline resilience.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication |
| Database | Firestore (NoSQL, real-time, offline-persistent) |
| Backend Logic | Firebase Cloud Functions (TypeScript, Node 20) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Offline Queue | IndexedDB (custom OfflineQueue service) |
| Hosting | Firebase Hosting |

---

## Local Development

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`

### 1. Install dependencies

```powershell
# Frontend
cd "C:\Users\LIZBETH\Desktop\Tennis"
npm install

# Cloud Functions
cd functions
npm install
```

### 2. Configure environment

```powershell
# Copy the template
copy .env.example .env.local
```

Open `.env.local` and fill in your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com).

Set `VITE_DEV_MODE=false` to use real Firebase.

### 3. Start local dev server

```powershell
npm run dev
```

App runs at **http://localhost:5173**

### 4. (Optional) Run Firebase Emulators

```powershell
firebase emulators:start
```

Emulator UI runs at **http://localhost:4000**

---

## Deploying to Production

### Step 1 — Firebase login & project link

```powershell
firebase login
firebase use --add   # select your project
```

### Step 2 — Deploy Firestore rules & indexes

```powershell
firebase deploy --only firestore
```

> ⚠️ Deploy rules BEFORE going live. Without them, Firestore is open to the public.

### Step 3 — Build & deploy Cloud Functions

```powershell
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Step 4 — Build & deploy frontend

```powershell
npm run build
firebase deploy --only hosting
```

### Full deploy (all at once)

```powershell
npm run build && cd functions && npm run build && cd .. && firebase deploy
```

---

## Architecture

```
src/
├── contexts/
│   └── AuthContext.jsx        ← register/login/logout, ROLES, DEV_MODE
├── services/
│   ├── firebase.js            ← Multi-tab IndexedDB, env config, FCM init
│   ├── TournamentService.js   ← State machine, evaluation, kill switch
│   ├── OfflineQueue.js        ← IDB queue for offline score submissions
│   ├── ExportService.js       ← JSON + CSV tournament data export
│   ├── AdminService.js        ← System manager Firestore queries
│   └── NotificationService.js ← Browser notification wrapper
├── hooks/
│   ├── useMyMatches.js        ← collectionGroup real-time match listener
│   └── useMyStanding.js       ← Pool ranking (Points > SetRatio > GameRatio)
├── engines/
│   ├── ScoringEngine.js       ← Short Set, Full Set, Knockout formats
│   └── BracketEngine.js       ← Pool → bracket progression logic
├── components/
│   ├── AppShell.jsx           ← Mobile bottom nav + More drawer
│   ├── OfflineBanner.jsx      ← Network status + sync indicator
│   ├── QRGenerator.jsx        ← Per-tournament & per-court QR codes
│   └── QRScanner.jsx          ← Camera QR scanner
└── pages/
    ├── LandingPage.jsx
    ├── Login.jsx / SignUp.jsx
    ├── Feed.jsx                ← Self-centered lobby (real Firestore)
    ├── Events.jsx              ← Public tournament discovery
    ├── TournamentPage.jsx      ← Live public scoreboard
    ├── MyTournamentSpace.jsx   ← Personal tournament view
    ├── MatchCenter.jsx         ← Score submission (Cloud Function callable)
    ├── HostDashboard.jsx       ← Tournament control (kill switch, export)
    ├── OfficialDashboard.jsx   ← Dispute resolution
    ├── AdminDashboard.jsx      ← System manager (users, tournaments, ledger)
    ├── CourtCheckIn.jsx        ← QR scan destination
    └── Profile.jsx

functions/src/
├── matches/
│   ├── submitMatchScore.ts    ← Double-entry verification (onCall)
│   └── onMatchCompleted.ts    ← Pool stats update + bracket progression
├── tournament/
│   ├── triggerKillSwitch.ts   ← Batch match freeze + FCM push (onCall)
│   └── onTournamentRegistration.ts ← participantCount + welcome FCM
└── users/
    └── onUserCreated.ts       ← Auto-create Firestore user doc on signup
```

---

## User Roles

| Role | Can Do |
|---|---|
| **Player** | Browse events, join tournaments, submit scores, view own matches |
| **Host** | Create tournaments, assign courts, activate Kill Switch, export data |
| **Official** | Resolve score disputes, assign courts |
| **Admin** | Everything above + manage all users/tournaments, view financial ledger |

*All roles start as Player. Hosts and Officials are elevated by an Admin.*

---

## Key SOW Features

| Feature | Implementation |
|---|---|
| Double-Entry Score Verification | `submitMatchScore` Cloud Function (atomic transaction) |
| Self-Centered Lobby | `useMyMatches` hook (collectionGroup Firestore listener) |
| Pool Standings | Points → Set Ratio → Game Ratio ranking |
| Late Basket Algorithm | `appendToPool()` — Bye-first pool assignment |
| Bracket Progression | Auto Bye distribution, winner advances server-side |
| Kill Switch | Batch freeze all live matches + FCM push notification |
| Offline Resilience | IndexedDB queue, auto-sync on reconnect |
| Court QR Routing | Per-court QR codes → `/court/:tournamentId/:courtId` |
| Push Notifications | FCM via service worker (background) + Notification API (foreground) |
| Financial Ledger | Admin-only ledger collection in Firestore |
| PWA | Installable, offline-capable, safe-area-inset support |

---

## Firestore Index Required

The `useMyMatches` hook uses a `collectionGroup` query that requires a manual index. After running `firebase deploy --only firestore`, if you see a Firestore index error in the console, click the link in the error message to create it automatically, or run:

```powershell
firebase deploy --only firestore:indexes
```

---

## Environment Variables Reference

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_FIREBASE_VAPID_KEY` | FCM Web Push VAPID key |
| `VITE_DEV_MODE` | `true` = mock data, `false` = real Firebase |
