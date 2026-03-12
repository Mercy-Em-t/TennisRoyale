import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import TournamentList from './pages/TournamentList';
import HostDashboard from './pages/HostDashboard';
import PlayerDashboard from './pages/PlayerDashboard';
import RefereeDashboard from './pages/RefereeDashboard';

function AppRoutes() {
  const { user, loading, activeRole } = useAuth();

  if (loading) {
    return <div className="app"><div className="loading">Loading...</div></div>;
  }

  if (!user) {
    return (
      <div className="app">
        <LoginPage />
      </div>
    );
  }

  // Player is the base role. When activeRole is 'player', show PlayerDashboard.
  // For host/referee, show their management dashboard when activeRole matches.
  // Host/referee can switch to player mode (activeRole='player') and back.
  return (
    <div className="app">
      <Routes>
        {activeRole === 'player' && (
          <Route path="/" element={<PlayerDashboard />} />
        )}
        {activeRole === 'host' && (
          <>
            <Route path="/" element={<TournamentList />} />
            <Route path="/tournaments/:id" element={<HostDashboard />} />
          </>
        )}
        {activeRole === 'referee' && (
          <Route path="/" element={<RefereeDashboard />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
