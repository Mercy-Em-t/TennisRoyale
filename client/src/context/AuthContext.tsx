import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getMe } from '../api';

interface User {
    id: string;
    name: string;
    username?: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (userData: User, authToken: string) => void;
    logout: () => void;
    activeRole: string | null;
    switchToPlayer: () => void;
    switchToManagement: () => void;
    hasManagementRole: boolean;
    isPlayerMode: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState<string | null>(null);

    const fetchUser = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await getMe();
            const data = res.data;
            const userData = data.user || data;
            setUser(userData);
            setActiveRole(userData.role);
        } catch (err) {
            console.error('Fetch user error:', err);
            setToken(null);
            setUser(null);
            setActiveRole(null);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    function login(userData: User, authToken: string) {
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

    function switchToPlayer() {
        setActiveRole('player');
    }

    function switchToManagement() {
        if (user) setActiveRole(user.role);
    }

    const hasManagementRole = user ? user.role !== 'player' : false;
    const isPlayerMode = activeRole === 'player';
    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{
            user, token, loading, login, logout,
            activeRole, switchToPlayer, switchToManagement,
            hasManagementRole, isPlayerMode, isAuthenticated
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
