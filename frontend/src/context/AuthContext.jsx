import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  userType: null,
  login: () => { },
  logout: () => { },
});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);

  // Clear any existing authentication data on mount to ensure clean state
  useEffect(() => {
    localStorage.removeItem('auth:isAuthenticated');
    localStorage.removeItem('auth:userType');
  }, []);

  useEffect(() => {
    localStorage.setItem('auth:isAuthenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    if (userType) {
      localStorage.setItem('auth:userType', userType);
    } else {
      localStorage.removeItem('auth:userType');
    }
  }, [userType]);

  const login = (type = 'client') => {
    setIsAuthenticated(true);
    setUserType(type);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    localStorage.removeItem('auth:isAuthenticated');
    localStorage.removeItem('auth:userType');
  };

  const value = useMemo(() => ({ isAuthenticated, userType, login, logout }), [isAuthenticated, userType]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


