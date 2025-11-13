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
        // First, try to load cached user from localStorage (persists across refreshes)
        const cachedUser = localStorage.getItem('auth:user');
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setIsAuthenticated(true);
            console.log('AuthContext: Loaded cached user from localStorage');
          } catch (e) {
            console.log('AuthContext: Failed to parse cached user');
            localStorage.removeItem('auth:user');
          }
        }

        // Then try to refresh token and fetch current user profile
        const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        
        console.log('AuthContext: Refresh response status:', res.status);
        
        if (res.ok) {
          setIsAuthenticated(true);
          
          // Fetch user profile to get current user info
          try {
            const profileRes = await fetch(`${API_BASE}/api/auth/profile/`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              // Get user ID from cached user if available, otherwise try to infer from profile
              const cachedUserData = cachedUser ? JSON.parse(cachedUser) : null;
              const userData = {
                id: cachedUserData?.id || profileData.user?.id || profileData.id, // Profile ID might be different from User ID
                email: profileData.email,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                role: cachedUserData?.role || 'client', // Role might not be in profile response
                phone: profileData.phone,
              };
              setUser(userData);
              // Store in localStorage for persistence across refreshes
              localStorage.setItem('auth:user', JSON.stringify(userData));
              console.log('AuthContext: Fetched and cached user profile');
            } else {
              console.log('AuthContext: Failed to fetch profile, using cached user');
              // If profile fetch fails but token is valid, keep using cached user
              if (!cachedUser) {
                setIsAuthenticated(false);
                setUser(null);
              }
            }
          } catch (profileErr) {
            console.log('AuthContext: Profile fetch error:', profileErr);
            // If profile fetch fails but token is valid, keep using cached user
            if (!cachedUser) {
              setIsAuthenticated(false);
              setUser(null);
            }
          }
        } else {
          console.log('AuthContext: Refresh failed, clearing auth state');
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('auth:user');
        }
      } catch (err) {
        console.log('AuthContext: Refresh error:', err);
        // Only clear auth if we don't have a cached user
        const cachedUser = localStorage.getItem('auth:user');
        if (!cachedUser) {
          setIsAuthenticated(false);
          setUser(null);
        } else {
          // If we have cached user but refresh failed, still try to use cached user
          // but mark as potentially unauthenticated
          console.log('AuthContext: Using cached user despite refresh failure');
        }
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
      let errorMessage = 'Login failed';
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorData.non_field_errors?.[0] || JSON.stringify(errorData);
      } catch {
        const msg = await res.text();
        errorMessage = msg || 'Login failed';
      }
      throw new Error(errorMessage);
    }
    const data = await res.json();
    const userData = data.user || data;
    setIsAuthenticated(true);
    setUser(userData);
    // Store in localStorage for persistence across page refreshes
    try { 
      localStorage.setItem('auth:user', JSON.stringify(userData)); 
      console.log('AuthContext: Saved user to localStorage');
    } catch (e) { 
      console.error('AuthContext: Failed to save user to localStorage:', e);
    }
    return userData;
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
    // Clear both localStorage and sessionStorage
    localStorage.removeItem('auth:user');
    try { sessionStorage.removeItem('auth:user'); } catch (_) { }
  };

  const userType = user?.role ?? null;

  const value = useMemo(() => ({ isAuthenticated, userType, user, login, logout }), [isAuthenticated, userType, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


