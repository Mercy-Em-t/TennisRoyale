import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import TournamentPage from './pages/TournamentPage';
import ProfilePage from './pages/ProfilePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import EventsPage from './pages/EventsPage';
import CoachHub from './pages/CoachHub';
import RefereeHub from './pages/RefereeHub';
import ScoringInterface from './pages/ScoringInterface';
import CourtCheckIn from './pages/CourtCheckIn';
import MatchCenter from './pages/MatchCenter';
import SpectatorFeed from './pages/SpectatorFeed';
import VolunteerHub from './pages/VolunteerHub';

import AppShell from './components/AppShell';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell>{children}</AppShell> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Navigate to="/login" replace state={{ tab: 'register' }} />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tournaments/:id/*"
          element={
            <PrivateRoute>
              <TournamentPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AccountSettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/events"
          element={
            <PrivateRoute>
              <EventsPage />
            </PrivateRoute>
          }
        />
        <Route path="/coach" element={<PrivateRoute><CoachHub /></PrivateRoute>} />
        <Route path="/official" element={<PrivateRoute><RefereeHub /></PrivateRoute>} />
        <Route path="/tournaments/:id/score/:matchId" element={<PrivateRoute><ScoringInterface /></PrivateRoute>} />
        <Route path="/tournaments/:id/logistics" element={<PrivateRoute><CourtCheckIn /></PrivateRoute>} />
        <Route path="/tournaments/:id/match/:matchId" element={<PrivateRoute><MatchCenter /></PrivateRoute>} />
        <Route path="/feed" element={<PrivateRoute><SpectatorFeed /></PrivateRoute>} />
        <Route path="/volunteer" element={<PrivateRoute><VolunteerHub /></PrivateRoute>} />
        <Route path="/feed" element={<PrivateRoute><SpectatorFeed /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
