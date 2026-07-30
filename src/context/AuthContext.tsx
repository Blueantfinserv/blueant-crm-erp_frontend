import { createContext, useContext } from 'react';
import { AuthState } from '../types/auth';
import { AuthService } from '../services/AuthService';
import { ForgotPasswordCredentials, LoginCredentials, RegisterCredentials, ResetPasswordCredentials } from '../types/auth';

export type AuthContextValue = AuthState & {
  login: (credentials: LoginCredentials) => Promise<void>;
  createAccount: (credentials: RegisterCredentials) => Promise<void>;
  forgotPassword: (credentials: ForgotPasswordCredentials) => Promise<void>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<void>;
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
  login: async (credentials) => {
    await service.login(credentials);
  },
  createAccount: async (credentials) => {
    await service.createAccount(credentials);
  },
  forgotPassword: async (credentials) => {
    await service.forgotPassword(credentials);
  },
  resetPassword: async (credentials) => {
    await service.resetPassword(credentials);
  },
  logout: async () => {
    await service.logout();
  },
});
