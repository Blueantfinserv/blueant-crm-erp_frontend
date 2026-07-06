import { AuthResponse, AuthUser } from '../types/auth';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildResponse = (user: AuthUser, message: string): AuthResponse => ({
  user,
  tokens: {
    accessToken: `access_${Date.now()}_${user.id}`,
    refreshToken: `refresh_${Date.now()}_${user.id}`,
  },
  message,
});

export const authApi = {
  login: async (): Promise<AuthResponse> => {
    await delay(1500);
    return buildResponse(
      {
        id: 'emp-1001',
        name: 'Blueant User',
        email: 'user@blueant.com',
        employeeId: 'EMP1001',
        provider: 'password',
      },
      'Logged in successfully.',
    );
  },
  activateAccount: async (): Promise<AuthResponse> => {
    await delay(1500);
    return buildResponse(
      {
        id: 'emp-3001',
        name: 'Activated Employee',
        email: 'activated@blueant.com',
        employeeId: 'EMP3001',
        provider: 'password',
      },
      'Your account has been activated successfully.',
    );
  },
  forgotPassword: async (): Promise<{ message: string }> => {
    await delay(1500);
    return { message: 'Password reset link sent.' };
  },
  resetPassword: async (): Promise<{ message: string }> => {
    await delay(1500);
    return { message: 'Password updated successfully.' };
  },
  logout: async (): Promise<{ message: string }> => {
    await delay(500);
    return { message: 'Logged out successfully.' };
  },
};
