export const AUTH_ROLES = ['SUPER_ADMIN', 'ADMIN', 'LEADER', 'TEAM_LEADER', 'SALES_MANAGER'] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export const normalizeAuthRole = (value: string): AuthRole | null => {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return AUTH_ROLES.find((role) => role === normalized) ?? null;
};

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
  employeeCode: string;
  password: string;
  rememberMe: boolean;
};

export type LoginRequest = LoginCredentials & {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
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
  tokenType?: string;
  refreshTokenExpiry?: string;
  sessionId?: string;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  user: AuthUser;
  tokens: AuthTokens;
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  status: number;
  message: string;
  timestamp: string;
  path: string;
  data: T;
};

export type LoginResponseData = {
  userId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  profileImage?: string;
  role: string;
  department?: string;
  designation?: string;
  team?: string;
  reportingManager?: string;
  permissions?: string[];
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn: number;
  refreshTokenExpiry?: string;
  status?: string;
  firstLogin?: boolean;
  passwordExpired?: boolean;
  accountLocked?: boolean;
  enabled?: boolean;
  loginAt?: string;
  sessionId?: string;
};

export type RefreshTokenRequest = {
  refreshToken: string;
  deviceId?: string;
};

export type RefreshTokenResponseData = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn: number;
  refreshTokenExpiry?: string;
  sessionId?: string;
};

export type LogoutRequest = {
  refreshToken: string;
  logoutFromAllDevices?: boolean;
  deviceId?: string;
};

export type AuthState = {
  user: AuthUser | null;
  rememberMe: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  sessionExpiresAt: number | null;
  error: string | null;
  success: string | null;
};
