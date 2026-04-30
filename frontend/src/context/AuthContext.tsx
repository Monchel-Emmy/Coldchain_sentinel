import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types/auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cc_token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify stored token with /me
  useEffect(() => {
    const stored = localStorage.getItem('cc_token');
    if (!stored) { setLoading(false); return; }

    fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.error) {
          setUser(data);
          setToken(stored);
        } else {
          localStorage.removeItem('cc_token');
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('cc_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithToken = async (token: string) => {
    localStorage.setItem('cc_token', token);
    setToken(token);
    const res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get user');
    setUser(data);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      // Pass through requiresVerification flag so Login page can redirect
      const err: any = new Error(data.error || 'Login failed');
      if (data.requiresVerification) err.message = 'Email not verified';
      throw err;
    }
    localStorage.setItem('cc_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    localStorage.setItem('cc_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('cc_token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string) =>
    user?.role.permissions.includes(permission) ?? false;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithToken, signup, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
