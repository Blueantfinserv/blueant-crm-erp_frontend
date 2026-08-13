import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { AuthContext, createAuthContextValue } from './AuthContext';
import { authService } from '../services/AuthService';
import { AuthState } from '../types/auth';

const initialState: AuthState = {
  user: null,
  rememberMe: true,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: true,
  isRefreshing: false,
  sessionExpiresAt: null,
  error: null,
  success: null,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setState);
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    void authService.bootstrap();
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated || !state.sessionExpiresAt) return undefined;
    const refreshAt = Math.max(0, state.sessionExpiresAt - Date.now() - 30_000);
    const timer = setTimeout(() => {
      void authService.refreshSession();
    }, Math.min(refreshAt, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [state.isAuthenticated, state.sessionExpiresAt]);

  const value = useMemo(() => createAuthContextValue(state, authService), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
