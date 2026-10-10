import {
  AuthResponse,
  AuthUser,
  ApiSuccessResponse,
  CurrentUserResponseData,
  ForgotPasswordCredentials,
  LoginCredentials,
  LoginRequest,
  LoginResponseData,
  LogoutRequest,
  normalizeAuthRole,
  RefreshTokenRequest,
  RefreshTokenResponseData,
  ResetPasswordCredentials,
} from '../types/auth';
import { Platform } from 'react-native';
import { SecureStorageService } from '../services/SecureStorageService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api';

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
      roleName: response.data.role,
      permissions: response.data.permissions,
      mobileNumber: response.data.mobileNumber,
      profileImage: response.data.profileImage,
      department: response.data.department,
      designation: response.data.designation,
      team: response.data.team,
      reportingManager: response.data.reportingManager,
      status: response.data.status,
      firstLogin: response.data.firstLogin,
      passwordExpired: response.data.passwordExpired,
      accountLocked: response.data.accountLocked,
      enabled: response.data.enabled,
      loginAt: response.data.loginAt,
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

const toCurrentAuthUser = (data: CurrentUserResponseData): AuthUser => {
  const role = normalizeAuthRole(data.role);
  if (!role) {
    throw new AuthApiError(`Unsupported account role: ${data.role}`, 'UNSUPPORTED_ROLE');
  }
  return {
    id: data.userId,
    employeeId: data.employeeCode,
    fullName: data.fullName,
    email: data.email,
    role,
    roleName: data.role,
    permissions: data.permissions,
    mobileNumber: data.mobileNumber,
    profileImage: data.profileImage,
    department: data.department,
    designation: data.designation,
    team: data.team,
    reportingManager: data.reportingManager,
    status: data.status,
    firstLogin: data.firstLogin,
    accountLocked: data.accountLocked,
    enabled: data.enabled,
  };
};

export class AuthApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
  }
}

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

  forgotPassword: async (credentials: ForgotPasswordCredentials): Promise<{ success: boolean; message: string }> => {
    const response = await request<Record<string, never>>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        employeeCode: credentials.employeeCode.trim(),
        email: credentials.email.trim(),
        mobileNumber: credentials.mobileNumber.trim(),
      }),
    });
    return { success: response.success, message: response.message };
  },

  resetPassword: async (credentials: ResetPasswordCredentials): Promise<{ success: boolean; message: string }> => {
    const response = await request<Record<string, never>>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        employeeCode: credentials.employeeCode.trim(),
        otp: credentials.otp.trim(),
        newPassword: credentials.newPassword,
        confirmPassword: credentials.confirmPassword,
      }),
    });
    return { success: response.success, message: response.message };
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

  getCurrentUser: async (accessToken: string): Promise<AuthUser> => {
    const response = await request<CurrentUserResponseData>('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return toCurrentAuthUser(response.data);
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
