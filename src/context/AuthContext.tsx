import { createContext, useContext } from 'react';
import { AuthState } from '../types/auth';
import { AuthService } from '../services/AuthService';

export type AuthContextValue = AuthState & {
  login: () => Promise<void>;
  activateAccount: () => Promise<void>;
  forgotPassword: () => Promise<void>;
  resetPassword: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const createAuthContextValue = (state: AuthState, service: AuthService): AuthContextValue => ({
  ...state,
  login: async () => {
    await service.login();
  },
  activateAccount: async () => {
    await service.activateAccount();
  },
  forgotPassword: async () => {
    await service.forgotPassword();
  },
  resetPassword: async () => {
    await service.resetPassword();
  },
  logout: async () => {
    await service.logout();
  },
});
