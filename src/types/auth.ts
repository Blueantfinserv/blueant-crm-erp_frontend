export type AuthRole = 'SUPER_ADMIN' | 'ADMIN' | 'LEADER' | 'TEAM_LEADER' | 'SALES_MANAGER';

export type AuthPermission = string;

export type AuthUser = {
  id: string | number;
  fullName: string;
  email: string;
  role: AuthRole;
  permissions?: AuthPermission[];
  employeeId?: string;
  provider?: 'password' | 'google';
};

export type LoginCredentials = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type RegisterCredentials = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type ForgotPasswordCredentials = {
  email: string;
};

export type ResetPasswordCredentials = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  user: AuthUser;
  tokens: AuthTokens;
};

export type AuthState = {
  user: AuthUser | null;
  rememberMe: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  sessionExpiresAt: number | null;
  error: string | null;
  success: string | null;
};
