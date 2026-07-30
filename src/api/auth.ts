import {
  AuthResponse,
  AuthRole,
  AuthUser,
  ForgotPasswordCredentials,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordCredentials,
} from '../types/auth';

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
    await simulateNetwork(false);
    const account = resolveAccount(credentials.email);
    if (!account || account.password !== credentials.password) {
      throw new AuthApiError('Invalid credentials.', 'INVALID_CREDENTIALS');
    }
    return buildResponse(account, 'Login Successful');
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

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    await simulateNetwork(false);
    const role = accounts.find((account) => refreshToken.includes(account.role))?.role ?? 'LEADER';
    const account = accounts.find((item) => item.role === role) ?? accounts[2];
    return buildResponse(account, 'Session refreshed successfully.');
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    await simulateNetwork(false);
    return {
      success: true,
      message: 'Logged out successfully.',
    };
  },
};
