'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearApiCache, loginUser, registerUser, getMe } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken) {
          setToken(savedToken);
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (e) {
              console.error('Failed to parse saved user JSON');
            }
          }

          // Verify token with backend
          const meRes = await getMe();
          if (meRes && meRes.success && meRes.user) {
            setUser(meRes.user);
            localStorage.setItem('user', JSON.stringify(meRes.user));
          } else if (!meRes?.success) {
            logoutSilently();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const setAuthSession = (authToken, userData) => {
    clearApiCache();
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    // Set cookie for Next.js middleware route protection
    document.cookie = `auth_token=${authToken}; path=/; max-age=86400; SameSite=Lax`;
  };

  const logoutSilently = () => {
    clearApiCache();
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  };

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.success && res.token) {
      setAuthSession(res.token, res.user);
      return { success: true, user: res.user };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (name, email, password) => {
    const res = await registerUser({ name, email, password });
    if (res.success && res.token) {
      setAuthSession(res.token, res.user);
      return { success: true, user: res.user };
    }
    return { success: false, error: res.error || 'Registration failed' };
  };

  const logout = () => {
    logoutSilently();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
