import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLES } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import OfflineBanner from './components/OfflineBanner';
import QRScanner from './components/QRScanner';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import OfflineQueue from './services/OfflineQueue';
import { evaluateSubmissions } from './services/TournamentService';

// ── Public pages (no AppShell) ──────────────────────────────
import LandingPage from './pages/LandingPage';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

// ── Authenticated pages (inside AppShell) ───────────────────
import Feed from './pages/Feed';
import Events from './pages/Events';
import Tournaments from './pages/Tournaments';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';
import TournamentPage from './pages/TournamentPage';
import MyTournamentSpace from './pages/MyTournamentSpace';
import MatchCenter from './pages/MatchCenter';
import CourtCheckIn from './pages/CourtCheckIn';
import Notifications from './pages/Notifications';
import ScoringInterface from './pages/ScoringInterface';

// ── Role-gated management pages ─────────────────────────────
import HostDashboard from './pages/HostDashboard';
import CreateTournament from './pages/CreateTournament';
import OfficialDashboard from './pages/OfficialDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CoachPortfolio from './pages/CoachPortfolio';
import VolunteerDashboard from './pages/VolunteerDashboard';
import SpectatorFeed from './pages/SpectatorFeed';
import SystemManagerDashboard from './pages/SystemManagerDashboard';

// Convenience wrapper — page inside AppShell
const Shell = ({ children }) => <AppShell>{children}</AppShell>;

// 404 page
const NotFound = () => (
  <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-center px-6 space-y-4">
    <span className="text-6xl">🎾</span>
    <h2 className="text-2xl font-black text-white">Page Not Found</h2>
    <Link to="/" className="text-primary-400 font-bold hover:text-primary-300">← Go home</Link>
  </div>
);

// Unauthorized page
const Unauthorized = () => (
  <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-center px-6 space-y-6">
    <Shield size={64} className="text-slate-700" />
    <h2 className="text-3xl font-black text-white">Access Denied</h2>
    <p className="text-slate-400 max-w-sm">You don't have the required role to view this page. Switch your role or go back.</p>
    <Link to="/feed" className="bg-primary-600 hover:bg-primary-500 px-8 py-4 rounded-2xl font-bold transition-all">
      Back to Home
    </Link>
  </div>
);

// ── Offline queue flush function ────────────────────────────
// Called automatically when the device comes back online
const processQueuedAction = async (action) => {
  if (action.type === 'SUBMIT_SCORE') {
    await evaluateSubmissions(
      action.tournamentId,
      action.matchId,
      action.submittingUid,
      action.score,
    );
  }
};

function App() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Global offline banner — sits above everything */}
      <OfflineBanner onFlush={() => OfflineQueue.flush(processQueuedAction)} />

      <Routes>
        {/* ── PUBLIC ROUTES ── */}
        <Route path="/" element={currentUser ? <Navigate to="/feed" /> : <LandingPage />} />
        <Route path="/login" element={currentUser ? <Navigate to="/feed" /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/feed" /> : <SignUp />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />

        {/* Public browsing — no auth required */}
        <Route path="/tournaments" element={<Shell><Tournaments /></Shell>} />
        <Route path="/tournament/:tournamentId" element={<Shell><TournamentPage /></Shell>} />

        {/* Court QR scan destination — publicly accessible for quick check-in */}
        <Route path="/court/:tournamentId/:courtId" element={<CourtCheckIn />} />

        {/* ── AUTHENTICATED ROUTES ── */}
        <Route path="/feed" element={
          <ProtectedRoute>
            <Shell>
              <Feed />
            </Shell>
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <Shell>
              <Events />
            </Shell>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute><Shell><Notifications /></Shell></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Shell><Profile /></Shell></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><Shell><AccountSettings /></Shell></ProtectedRoute>
        } />
        <Route path="/tournament/:tournamentId/my-space" element={
          <ProtectedRoute><Shell><MyTournamentSpace /></Shell></ProtectedRoute>
        } />
        <Route path="/match/:tournamentId/:matchId" element={
          <ProtectedRoute><Shell><MatchCenter /></Shell></ProtectedRoute>
        } />
        <Route path="/match/:tournamentId/:matchId/score" element={
          <ProtectedRoute allowedRoles={[ROLES.OFFICIAL, ROLES.ADMIN]}>
            <ScoringInterface />
          </ProtectedRoute>
        } />

        {/* ── ROLE-GATED ROUTES ── */}
        <Route path="/host" element={
          <ProtectedRoute allowedRoles={[ROLES.HOST, ROLES.ADMIN]}>
            <Shell><HostDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/create" element={
          <ProtectedRoute allowedRoles={[ROLES.HOST, ROLES.ADMIN]}>
            <Shell><CreateTournament /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/official" element={
          <ProtectedRoute allowedRoles={[ROLES.OFFICIAL, ROLES.ADMIN]}>
            <Shell><OfficialDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/tasks" element={
          <ProtectedRoute allowedRoles={[ROLES.VOLUNTEER, ROLES.ADMIN]}>
            <Shell><VolunteerDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/roster" element={
          <ProtectedRoute allowedRoles={[ROLES.COACH, ROLES.ADMIN]}>
            <Shell><CoachPortfolio /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute allowedRoles={[ROLES.COACH, ROLES.OFFICIAL, ROLES.ADMIN]}>
            <Shell><CoachPortfolio /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/management" element={
          <ProtectedRoute allowedRoles={[ROLES.HOST, ROLES.ADMIN]}>
            <Shell><AdminDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={[ROLES.SYSTEM_MANAGER]}>
            <Shell><SystemManagerDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={[ROLES.SYSTEM_MANAGER, ROLES.ADMIN]}>
            <Shell><SystemManagerDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/media" element={
          <ProtectedRoute>
            <Shell><SpectatorFeed /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <Shell><AdminDashboard /></Shell>
          </ProtectedRoute>
        } />

        {/* ── FALLBACK ROUTES ── */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Floating QR scanner — available on all authenticated pages */}
      {currentUser && <QRScanner />}
    </>
  );
}

export default App;
