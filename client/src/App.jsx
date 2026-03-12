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
