export const AUTH_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'BUSINESS_HEAD',
  'SALES_MANAGER',
  'SALES_COORDINATOR',
  'TEAM_LEADER',
  'RELATIONSHIP_MANAGER',
  'EMPLOYEE',
  'LEADER',
] as const;

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
  roleName?: string;
  permissions?: AuthPermission[] | null;
  employeeId?: string;
  mobileNumber?: string | null;
  profileImage?: string | null;
  department?: string | null;
  designation?: string | null;
  team?: string | null;
  reportingManager?: string | null;
  status?: string | null;
  firstLogin?: boolean;
  passwordExpired?: boolean | null;
  accountLocked?: boolean;
  enabled?: boolean | null;
  loginAt?: string | null;
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
  employeeCode: string;
  email: string;
  mobileNumber: string;
};

export type ResetPasswordCredentials = {
  employeeCode: string;
  otp: string;
  newPassword: string;
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
  mobileNumber?: string | null;
  profileImage?: string | null;
  role: string;
  department?: string | null;
  designation?: string | null;
  team?: string | null;
  reportingManager?: string | null;
  permissions?: string[] | null;
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn: number;
  refreshTokenExpiry?: string;
  status?: string | null;
  firstLogin?: boolean;
  passwordExpired?: boolean | null;
  accountLocked?: boolean;
  enabled?: boolean | null;
  loginAt?: string | null;
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
