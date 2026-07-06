import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { AuthContext, createAuthContextValue } from './AuthContext';
import { authService } from '../services/AuthService';
import { AuthState } from '../types/auth';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isRefreshing: false,
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

  const value = useMemo(() => createAuthContextValue(state, authService), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
