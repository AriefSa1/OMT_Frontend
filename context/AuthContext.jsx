'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearApiCache, loginUser, registerUser, getMe } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // Must start true: AppShellContent renders inside this provider, and React runs child
  // effects before parent effects. Starting at false lets the route guard evaluate
  // `!loading && !user` and bounce to /login before initAuth has read the saved token.
  const [loading, setLoading] = useState(true);
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
    // Cookie ini hanya penanda rute untuk middleware Next.js (auth sebenarnya divalidasi
    // server via Bearer token). Tambahkan Secure di HTTPS supaya tidak ikut terkirim lewat
    // koneksi http polos; di localhost (http) Secure dilewati agar dev tetap jalan.
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `auth_token=${authToken}; path=/; max-age=86400; SameSite=Lax${secure}`;
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

  const register = async (name, email, password, registrationSecret) => {
    const res = await registerUser({ name, email, password, registrationSecret });
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
