'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api';

export type UserRole = 'citizen' | 'family' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthResponse = { token: string; user: AuthUser };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const saveSession = (data: AuthResponse) => {
    tokenStore.set(data.token);
    localStorage.setItem(tokenStore.userKey, JSON.stringify(data.user));
    setUser(data.user);
  };

  // On load: show the cached user immediately, then confirm the token with the
  // server (the role comes from the server, not from editable localStorage).
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      tokenStore.clear();
      setIsLoading(false);
      return;
    }
    try {
      const cached = localStorage.getItem(tokenStore.userKey);
      if (cached) setUser(JSON.parse(cached));
    } catch {
      /* ignore bad cache */
    }
    api<{ user: AuthUser }>('/api/auth/me')
      .then(({ user }) => {
        setUser(user);
        localStorage.setItem(tokenStore.userKey, JSON.stringify(user));
      })
      .catch((err) => {
        if (err.status === 401) logout();
      })
      .finally(() => setIsLoading(false));
  }, [logout]);

  // Any 401 from the API (e.g. expired token) logs the user out
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('safesight:unauthorized', onUnauthorized);
    return () => window.removeEventListener('safesight:unauthorized', onUnauthorized);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const data = await api<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(data);
  };

  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    const data = await api<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    saveSession(data);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
