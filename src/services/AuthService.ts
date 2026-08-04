import { authApi, AuthApiError } from '../api/auth';
import { SecureStorageService } from './SecureStorageService';
import {
  AuthResponse,
  AuthState,
  AuthTokens,
  AuthUser,
  ForgotPasswordCredentials,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordCredentials,
} from '../types/auth';

type Listener = (state: AuthState) => void;

const initialState: AuthState = {
  user: null,
  rememberMe: true,
  isAuthenticated: false,
  isLoading: false,
  isRefreshing: false,
  sessionExpiresAt: null,
  error: null,
  success: null,
};

const createAuthState = (response: AuthResponse, rememberMe: boolean): Partial<AuthState> => ({
  user: response.user,
  rememberMe,
  isAuthenticated: true,
  isLoading: false,
  isRefreshing: false,
  sessionExpiresAt: Date.now() + response.tokens.expiresIn * 1000,
  error: null,
  success: response.message,
});

const toMessage = (error: unknown, fallback: string) => {
  if (error instanceof AuthApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

export class AuthService {
  private state = initialState;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private setState(next: Partial<AuthState>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  private async persistSession(response: AuthResponse, rememberMe: boolean) {
    await SecureStorageService.saveToken(response.tokens, response.user, rememberMe);
    this.setState(createAuthState(response, rememberMe));
  }

  async bootstrap() {
    this.setState({ isLoading: true, error: null });
    const [user, refreshToken, rememberMe] = await Promise.all([
      SecureStorageService.getUserData(),
      SecureStorageService.getRefreshToken(),
      SecureStorageService.getRememberMe(),
    ]);

    if (!refreshToken || !user) {
      await SecureStorageService.removeToken();
      this.setState({
        ...initialState,
        isLoading: false,
        rememberMe,
      });
      return;
    }

    this.setState({
      user,
      rememberMe,
      isRefreshing: true,
    });
    await this.refreshSession();
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.login(credentials);
      await this.persistSession(response, credentials.rememberMe);
      return response;
    } catch (error) {
      this.setState({
        isLoading: false,
        error: toMessage(error, 'Login failed.'),
      });
      throw error;
    }
  }

  async createAccount(credentials: RegisterCredentials): Promise<AuthResponse> {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.register(credentials);
      await this.persistSession(response, true);
      return response;
    } catch (error) {
      this.setState({
        isLoading: false,
        error: toMessage(error, 'Account activation failed.'),
      });
      throw error;
    }
  }

  async forgotPassword(credentials: ForgotPasswordCredentials) {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.forgotPassword(credentials);
      this.setState({ isLoading: false, success: response.message });
      return response;
    } catch (error) {
      this.setState({
        isLoading: false,
        error: toMessage(error, 'Forgot password failed.'),
      });
      throw error;
    }
  }

  async resetPassword(credentials: ResetPasswordCredentials) {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.resetPassword(credentials);
      this.setState({ isLoading: false, success: response.message });
      return response;
    } catch (error) {
      this.setState({
        isLoading: false,
        error: toMessage(error, 'Reset password failed.'),
      });
      throw error;
    }
  }

  async refreshSession() {
    const refreshToken = await SecureStorageService.getRefreshToken();
    if (!refreshToken) {
      return;
    }

    this.setState({ isRefreshing: true, error: null });
    try {
      const response = await authApi.refreshToken(refreshToken);
      const rememberMe = await SecureStorageService.getRememberMe();
      const user = this.state.user ?? await SecureStorageService.getUserData();
      if (!user) {
        throw new AuthApiError('Stored user session is unavailable.', 'SESSION_UNAVAILABLE');
      }
      const tokens: AuthTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
        refreshTokenExpiry: response.refreshTokenExpiry,
        sessionId: response.sessionId,
      };
      await SecureStorageService.saveToken(tokens, user, rememberMe);
      this.setState({
        user,
        rememberMe,
        isAuthenticated: true,
        isLoading: false,
        isRefreshing: false,
        sessionExpiresAt: Date.now() + response.expiresIn * 1000,
        error: null,
      });
    } catch (error) {
      await SecureStorageService.removeToken();
      this.setState({
        ...initialState,
        isLoading: false,
        isRefreshing: false,
        error: toMessage(error, 'Session refresh failed.'),
      });
    }
  }

  async logout() {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const refreshToken = await SecureStorageService.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      await SecureStorageService.removeToken();
      this.setState({ ...initialState, isLoading: false, success: 'Logged out successfully.' });
    }
  }

  getState() {
    return this.state;
  }
}

export const authService = new AuthService();

export type AuthServiceApi = {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  createAccount: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  forgotPassword: (credentials: ForgotPasswordCredentials) => Promise<{ success: boolean; message: string }>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<{ success: boolean; message: string }>;
  refreshToken: (refreshToken: string) => Promise<import('../types/auth').RefreshTokenResponseData>;
  logout: (refreshToken: string) => Promise<{ success: boolean; message: string }>;
};

export type { AuthUser, AuthResponse };
