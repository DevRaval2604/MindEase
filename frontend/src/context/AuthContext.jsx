import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const AuthContext = createContext({
  isAuthenticated: false,
  userType: null,
  login: () => { },
  logout: () => { },
});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // {id,email,first_name,last_name,role}

  // On app mount, try to refresh to restore session from HttpOnly cookies
  useEffect(() => {
    const didRunRef = { current: false };
    const tryRefresh = async () => {
      if (didRunRef.current) return; // avoid double-run in StrictMode
      didRunRef.current = true;
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (res.ok) {
          setIsAuthenticated(true);
          // We don't receive user info here; keep previous non-sensitive info if stored
          const cachedUser = sessionStorage.getItem('auth:user');
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          sessionStorage.removeItem('auth:user');
        }
      } catch (_) {
        setIsAuthenticated(false);
        setUser(null);
        sessionStorage.removeItem('auth:user');
      }
    };
    tryRefresh();
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Login failed');
    }
    const data = await res.json();
    setIsAuthenticated(true);
    setUser(data);
    try { sessionStorage.setItem('auth:user', JSON.stringify(data)); } catch (_) { }
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
    } catch (_) { }
    setIsAuthenticated(false);
    setUser(null);
    sessionStorage.removeItem('auth:user');
  };

  const userType = user?.role ?? null;

  const value = useMemo(() => ({ isAuthenticated, userType, user, login, logout }), [isAuthenticated, userType, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


