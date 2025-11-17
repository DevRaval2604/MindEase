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
        console.log('AuthContext: Refresh response status:', res.status);
        if (res.ok) {
          setIsAuthenticated(true);
          // We don't receive user info here; keep previous non-sensitive info if stored
          const cachedUser = sessionStorage.getItem('auth:user');
          if (cachedUser) {
            console.log('AuthContext: Loaded cached user:', cachedUser);
            setUser(JSON.parse(cachedUser));
          } else {
            console.log('AuthContext: No cached user found');
          }
        } else {
          console.log('AuthContext: Refresh failed, clearing auth state');
          setIsAuthenticated(false);
          setUser(null);
          sessionStorage.removeItem('auth:user');
        }
      } catch (err) {
        console.log('AuthContext: Refresh error:', err);
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
      let errorData = {};
    
      try {
        errorData = await res.json();   // backend JSON
      } catch {
        errorData = { detail: "Something went wrong" };
      }
    
      // Throw real error object for frontend
      throw { response: { data: errorData } };
    }
    const data = await res.json();

    // Backend returns { detail: ..., user: { id, email, first_name, last_name, role } }
    // Normalize to return/store the inner user object so callers can access `role` directly.
    const userObj = data?.user ?? data;
    setIsAuthenticated(true);
    setUser(userObj);
    try { sessionStorage.setItem('auth:user', JSON.stringify(userObj)); } catch (_) { }
    return userObj;
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


