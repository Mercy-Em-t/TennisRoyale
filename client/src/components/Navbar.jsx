import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🎾 TennisRoyale</Link>
      <div className="nav-links">
        <Link to="/tournaments">Tournaments</Link>
        {user ? (
          <>
            {user.role === 'host' && (
              <>
                <Link to="/host/dashboard">Host Dashboard</Link>
                <Link to="/host/create-tournament">Create Tournament</Link>
              </>
            )}
            <Link to="/player/dashboard">My Tournaments</Link>
            <button onClick={logout} className="btn-logout">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
