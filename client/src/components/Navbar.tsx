import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <span className="text-2xl">🎾</span>
          <span>TennisRoyale</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/tournaments" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition">Tournaments</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition">Dashboard</Link>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.role}</span>
                <button
                  onClick={logout}
                  className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-red-500 transition shadow-sm"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition">Login</Link>
              <Link
                to="/login"
                state={{ tab: 'signup' }}
                className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition shadow-md"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger could go here */}
      </div>
    </nav>
  );
}
