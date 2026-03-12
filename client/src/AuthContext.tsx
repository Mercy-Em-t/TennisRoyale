import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Host } from './types';

interface AuthContextType {
  token: string | null;
  host: Host | null;
  login: (token: string, host: Host) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [host, setHost] = useState<Host | null>(() => {
    const stored = localStorage.getItem('host');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken: string, newHost: Host) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('host', JSON.stringify(newHost));
    setToken(newToken);
    setHost(newHost);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('host');
    setToken(null);
    setHost(null);
  };

  return (
    <AuthContext.Provider value={{ token, host, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
