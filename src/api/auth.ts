import {
  AuthResponse,
  ApiSuccessResponse,
  AuthRole,
  AuthUser,
  ForgotPasswordCredentials,
  LoginCredentials,
  LoginRequest,
  LoginResponseData,
  LogoutRequest,
  normalizeAuthRole,
  RefreshTokenRequest,
  RefreshTokenResponseData,
  RegisterCredentials,
  ResetPasswordCredentials,
} from '../types/auth';
import { Platform } from 'react-native';
import { SecureStorageService } from '../services/SecureStorageService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://blueant-crm-erp.up.railway.app/api';

const getDeviceMetadata = async () => {
  const navigatorInfo = typeof navigator === 'undefined' ? null : navigator;
  const operatingSystem = Platform.OS === 'web'
    ? (navigatorInfo?.platform || 'web')
    : Platform.OS;

  return {
    deviceId: await SecureStorageService.getOrCreateDeviceId(),
    deviceName: (navigatorInfo?.platform || `${Platform.OS} device`).slice(0, 150),
    deviceType: (Platform.OS === 'web' ? 'WEB' : Platform.OS.toUpperCase()).slice(0, 50),
    browser: (navigatorInfo?.userAgent || 'native-app').slice(0, 100),
    operatingSystem: operatingSystem.slice(0, 100),
  };
};

const request = async <T>(path: string, init: RequestInit): Promise<ApiSuccessResponse<T>> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new AuthApiError('Network request failed. Please try again.', 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => null) as ApiSuccessResponse<T> | null;
  if (!response.ok || !payload?.success) {
    throw new AuthApiError(payload?.message || `Authentication request failed (${response.status}).`, String(response.status));
  }
  return payload;
};

const toAuthResponse = (response: ApiSuccessResponse<LoginResponseData>): AuthResponse => {
  const role = normalizeAuthRole(response.data.role);
  if (!role) {
    throw new AuthApiError(`Unsupported account role: ${response.data.role}`, 'UNSUPPORTED_ROLE');
  }

  return {
    success: response.success,
    message: response.message,
    user: {
      id: response.data.userId,
      employeeId: response.data.employeeCode,
      fullName: response.data.fullName,
      email: response.data.email,
      role,
      permissions: response.data.permissions,
    },
    tokens: {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresIn: response.data.expiresIn,
      tokenType: response.data.tokenType,
      refreshTokenExpiry: response.data.refreshTokenExpiry,
      sessionId: response.data.sessionId,
    },
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AuthApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
  }
}

type MockAccount = {
  email: string;
  password: string;
  role: AuthRole;
  fullName: string;
  id: number;
  permissions: string[];
};

const accounts: MockAccount[] = [
  {
    id: 1,
    fullName: 'Super Admin',
    email: 'superadmin@erp.com',
    password: '12345678@aA',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
  },
  {
    id: 2,
    fullName: 'Admin',
    email: 'admin@erp.com',
    password: '12345678@bB',
    role: 'ADMIN',
    permissions: ['dashboard:view', 'user:view', 'user:create'],
  },
  {
    id: 3,
    fullName: 'Leader',
    email: 'leader@erp.com',
    password: '12345678@cC',
    role: 'LEADER',
    permissions: ['lead:view', 'lead:create', 'meeting:view'],
  },
  {
    id: 4,
    fullName: 'Team Leader',
    email: 'teamleader@erp.com',
    password: '12345678@dD',
    role: 'TEAM_LEADER',
    permissions: ['lead:view', 'lead:assign', 'team:view'],
  },
  {
    id: 5,
    fullName: 'Sales Manager',
    email: 'sm@erp.com',
    password: '12345678@eE',
    role: 'SALES_MANAGER',
    permissions: ['lead:view', 'lead:assign', 'pipeline:view'],
  },
];

const buildResponse = (account: MockAccount, message: string): AuthResponse => ({
  success: true,
  message,
  user: {
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    role: account.role,
    permissions: account.permissions,
    provider: 'password',
  },
  tokens: {
    accessToken: `dummy-access-token.${account.role}.${Date.now()}`,
    refreshToken: `dummy-refresh-token.${account.role}.${Date.now()}`,
    expiresIn: 900,
  },
});

const resolveAccount = (email: string) => accounts.find((account) => account.email.toLowerCase() === email.trim().toLowerCase());

const simulateNetwork = async (shouldFail = false) => {
  await delay(900 + Math.round(Math.random() * 500));
  if (shouldFail) {
    throw new AuthApiError('Network request failed. Please try again.', 'NETWORK_ERROR');
  }
};

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const device = await getDeviceMetadata();
    const body: LoginRequest = {
      employeeCode: credentials.employeeCode.trim(),
      password: credentials.password,
      ...device,
      rememberMe: credentials.rememberMe,
    };
    const response = await request<LoginResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return toAuthResponse(response);
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    await simulateNetwork(false);
    const account = resolveAccount(credentials.email);
    if (account) {
      throw new AuthApiError('An account already exists for this email.', 'ACCOUNT_EXISTS');
    }

    return {
      success: true,
      message: 'Registration Successful',
      user: {
        id: Date.now(),
        fullName: credentials.email.split('@')[0],
        email: credentials.email,
        role: 'LEADER',
        permissions: ['lead:view'],
        provider: 'password',
      },
      tokens: {
        accessToken: `dummy-access-token.LEADER.${Date.now()}`,
        refreshToken: `dummy-refresh-token.LEADER.${Date.now()}`,
        expiresIn: 900,
      },
    };
  },

  forgotPassword: async (credentials: ForgotPasswordCredentials): Promise<{ success: boolean; message: string }> => {
    await simulateNetwork(false);
    const account = resolveAccount(credentials.email);
    if (!account) {
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      };
    }

    return {
      success: true,
      message: 'Password reset link has been sent to your registered email.',
    };
  },

  resetPassword: async (_credentials: ResetPasswordCredentials): Promise<{ success: boolean; message: string }> => {
    await simulateNetwork(false);
    return {
      success: true,
      message: 'Password updated successfully.',
    };
  },

  refreshToken: async (refreshToken: string) => {
    const deviceId = await SecureStorageService.getOrCreateDeviceId();
    const body: RefreshTokenRequest = { refreshToken, deviceId };
    const response = await request<RefreshTokenResponseData>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<{ success: boolean; message: string }> => {
    const deviceId = await SecureStorageService.getOrCreateDeviceId();
    const body: LogoutRequest = {
      refreshToken,
      logoutFromAllDevices: false,
      deviceId,
    };
    const response = await request<Record<string, never>>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { success: response.success, message: response.message };
  },
};
