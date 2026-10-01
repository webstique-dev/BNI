import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      const res = await api.getAdminMe();
      if (res?.success && res.admin) {
        setAdmin(res.admin);
      } else {
        setAdmin(null);
      }
    } catch (err) {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const res = await api.adminLogin({ username, password });
    if (res?.success && res.admin) {
      if (res.token) {
        localStorage.setItem('bni_admin_token', res.token);
      }
      setAdmin(res.admin);
      return res.admin;
    }
    throw new Error(res?.message || 'Login failed');
  }

  async function logout() {
    try {
      await api.adminLogout();
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('bni_admin_token');
      setAdmin(null);
    }
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
