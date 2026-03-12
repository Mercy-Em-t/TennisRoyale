import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {
        setToken(null);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, [token]);

  const signup = async (email, password, name, role) => {
    const res = await api.post('/auth/signup', { email, password, name, role });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout }}>
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  // activeRole tracks the current view mode: 'player' is the base view,
  // host/referee can switch between their management role and player mode
  const [activeRole, setActiveRole] = useState(null);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // For player-role users, default to player. For others, default to their role.
        setActiveRole(data.user.role);
      } else {
        setToken(null);
        setUser(null);
        setActiveRole(null);
        localStorage.removeItem('token');
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  function login(userData, authToken) {
    setUser(userData);
    setToken(authToken);
    setActiveRole(userData.role);
    localStorage.setItem('token', authToken);
  }

  function logout() {
    setUser(null);
    setToken(null);
    setActiveRole(null);
    localStorage.removeItem('token');
  }

  // Switch to player mode (available for host/referee)
  function switchToPlayer() {
    setActiveRole('player');
  }

  // Switch back to the user's primary management role
  function switchToManagement() {
    if (user) setActiveRole(user.role);
  }

  // Whether this user has a management role (non-player)
  const hasManagementRole = user && user.role !== 'player';
  // Whether we're currently in player mode
  const isPlayerMode = activeRole === 'player';

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      activeRole, switchToPlayer, switchToManagement,
      hasManagementRole, isPlayerMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
