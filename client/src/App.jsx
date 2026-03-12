import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import PlayerDashboard from './pages/PlayerDashboard';
import HostDashboard from './pages/HostDashboard';
import CreateTournament from './pages/CreateTournament';
import Navbar from './components/Navbar';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetails />} />
          <Route path="/player/dashboard" element={
            <ProtectedRoute><PlayerDashboard /></ProtectedRoute>
          } />
          <Route path="/host/dashboard" element={
            <ProtectedRoute><HostDashboard /></ProtectedRoute>
          } />
          <Route path="/host/create-tournament" element={
            <ProtectedRoute><CreateTournament /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/tournaments" />} />
        </Routes>
      </main>
import { Routes, Route } from 'react-router-dom';
import TournamentList from './pages/TournamentList';
import TournamentDetail from './pages/TournamentDetail';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1><a href="/">🎾 TennisRoyale</a></h1>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TournamentList />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
        </Routes>
      </main>
    </div>
  );
}
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
