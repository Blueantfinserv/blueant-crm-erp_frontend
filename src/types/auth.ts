export type AuthUser = {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  mobileNumber?: string;
  provider: 'password' | 'google';
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
  message: string;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  success: string | null;
};
