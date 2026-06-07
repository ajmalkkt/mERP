import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  companyId: string | null;
  username: string | null;
  name: string | null;
  login: (token: string, userId: string, companyId: string, username?: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserId = localStorage.getItem('userId');
    const storedCompanyId = localStorage.getItem('companyId');
    const storedUsername = localStorage.getItem('username');
    const storedName = localStorage.getItem('name');

    if (storedToken) {
      setToken(storedToken);
      setUserId(storedUserId);
      setCompanyId(storedCompanyId);
      setUsername(storedUsername);
      setName(storedName);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUserId: string, newCompanyId: string, newUsername?: string, newName?: string) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userId', newUserId);
    localStorage.setItem('companyId', newCompanyId);
    if (newUsername) localStorage.setItem('username', newUsername);
    if (newName) localStorage.setItem('name', newName);

    setToken(newToken);
    setUserId(newUserId);
    setCompanyId(newCompanyId);
    setUsername(newUsername || null);
    setName(newName || null);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('companyId');
    localStorage.removeItem('username');
    localStorage.removeItem('name');

    setToken(null);
    setUserId(null);
    setCompanyId(null);
    setUsername(null);
    setName(null);
    setIsAuthenticated(false);
  };

  // Listen for storage changes (e.g., logout in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        logout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, userId, companyId, username, name, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
