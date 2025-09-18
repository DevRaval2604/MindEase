import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  userType: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('auth:isAuthenticated');
    return saved === 'true';
  });
  const [userType, setUserType] = useState(() => localStorage.getItem('auth:userType'));

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


