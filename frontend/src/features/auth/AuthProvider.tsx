import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { User } from '@/types';

import { authApi } from './api';

export type AuthStatus = 'loading' | 'authed' | 'anon';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AUTH_TOKEN_KEY = 'mvp-crm-token';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    localStorage.getItem(AUTH_TOKEN_KEY) ? 'loading' : 'anon',
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setStatus('anon');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    if (status !== 'loading') {
      return undefined;
    }

    let cancelled = false;

    queryClient
      .fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authApi.me,
        retry: false,
      })
      .then((nextUser) => {
        if (cancelled) return;
        setUser(nextUser);
        setStatus('authed');
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
        setStatus('anon');
      });

    return () => {
      cancelled = true;
    };
  }, [queryClient, status]);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    setUser(result.user);
    setStatus('authed');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
