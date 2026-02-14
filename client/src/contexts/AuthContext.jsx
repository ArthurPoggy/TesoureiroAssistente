import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchJSON } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('tesoureiro_token'));
  const [authUser, setAuthUser] = useState({ role: null, email: '', name: '', memberId: null });
  const [authChecked, setAuthChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const isAdmin = authUser.role === 'admin' || authUser.role === 'diretor_financeiro';
  const isDiretor = authUser.role === 'diretor_financeiro';
  const canEdit = isAdmin;

  const apiFetch = useCallback(
    (url, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      return fetchJSON(url, { ...options, headers });
    },
    [authToken]
  );

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const data = await fetchJSON('/api/login', { method: 'POST', body: { email, password } });
      setAuthToken(data.token);
      localStorage.setItem('tesoureiro_token', data.token);
      setAuthUser({
        role: data.role,
        email: data.email || email,
        name: data.name || '',
        memberId: data.memberId ?? null
      });
      setAuthChecked(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name, email, cpf, password) => {
    setAuthLoading(true);
    try {
      const data = await fetchJSON('/api/register', { method: 'POST', body: { name, email, cpf, password } });
      setAuthToken(data.token);
      localStorage.setItem('tesoureiro_token', data.token);
      setAuthUser({
        role: data.role,
        email: data.email || email,
        name: name,
        memberId: data.memberId ?? null
      });
      setAuthChecked(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const setupPassword = async (token, password) => {
    setAuthLoading(true);
    try {
      const data = await fetchJSON('/api/setup-password', { method: 'POST', body: { token, password } });
      setAuthToken(data.token);
      localStorage.setItem('tesoureiro_token', data.token);
      setAuthUser({
        role: data.role,
        email: data.email,
        name: data.name || '',
        memberId: data.memberId ?? null
      });
      setAuthChecked(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setAuthUser({ role: null, email: '', name: '', memberId: null });
    setAuthChecked(true);
    localStorage.removeItem('tesoureiro_token');
  };

  // Verificar token ao carregar
  useEffect(() => {
    if (!authToken) {
      setAuthUser({ role: null, email: '', name: '', memberId: null });
      setAuthChecked(true);
      return;
    }
    let canceled = false;
    apiFetch('/api/me')
      .then((data) => {
        if (!canceled) {
          setAuthUser({
            role: data.role,
            email: data.email,
            name: data.name || '',
            memberId: data.memberId ?? null
          });
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (!canceled) {
          setAuthUser({ role: null, email: '', name: '', memberId: null });
          setAuthToken(null);
          localStorage.removeItem('tesoureiro_token');
          setAuthChecked(true);
        }
      });
    return () => {
      canceled = true;
    };
  }, [authToken, apiFetch]);

  const value = {
    authToken,
    authUser,
    authChecked,
    authLoading,
    isAdmin,
    isDiretor,
    canEdit,
    apiFetch,
    login,
    register,
    setupPassword,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
