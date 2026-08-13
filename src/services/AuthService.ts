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
  isInitialized: false,
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
  isInitialized: true,
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
  private operationGeneration = 0;
  private refreshPromise: Promise<void> | null = null;

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
    const generation = ++this.operationGeneration;
    this.setState({ isInitialized: false, isLoading: true, error: null });
    try {
      const [user, refreshToken, rememberMe] = await Promise.all([
        SecureStorageService.getUserData(),
        SecureStorageService.getRefreshToken(),
        SecureStorageService.getRememberMe(),
      ]);
      if (generation !== this.operationGeneration) return;

      if (!refreshToken || !user) {
        await SecureStorageService.removeToken();
        if (generation !== this.operationGeneration) return;
        this.setState({
          ...initialState,
          isInitialized: true,
          isLoading: false,
          rememberMe,
        });
        return;
      }

      this.setState({ user, rememberMe, isRefreshing: true });
      await this.refreshSession(generation);
    } catch (error) {
      await SecureStorageService.removeToken();
      if (generation !== this.operationGeneration) return;
      this.setState({
        ...initialState,
        isInitialized: true,
        isLoading: false,
        error: toMessage(error, 'Stored session could not be restored.'),
      });
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const generation = ++this.operationGeneration;
    this.setState({ isLoading: true, error: null, success: null });
    try {
      await this.refreshPromise;
      if (generation !== this.operationGeneration) {
        throw new AuthApiError('Login was superseded by another authentication action.', 'STALE_AUTH_OPERATION');
      }
      const response = await authApi.login(credentials);
      if (generation !== this.operationGeneration) {
        throw new AuthApiError('Login was superseded by another authentication action.', 'STALE_AUTH_OPERATION');
      }
      await this.persistSession(response, credentials.rememberMe);
      return response;
    } catch (error) {
      if (generation === this.operationGeneration) {
        this.setState({ isInitialized: true, isLoading: false, error: toMessage(error, 'Login failed.') });
      }
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

  async refreshSession(expectedGeneration?: number) {
    if (this.refreshPromise) return this.refreshPromise;
    const generation = expectedGeneration ?? this.operationGeneration;
    this.refreshPromise = this.performRefresh(generation).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async performRefresh(generation: number) {
    const refreshToken = await SecureStorageService.getRefreshToken();
    if (!refreshToken || generation !== this.operationGeneration) {
      if (generation === this.operationGeneration) {
        this.setState({ isInitialized: true, isLoading: false, isRefreshing: false });
      }
      return;
    }

    this.setState({ isRefreshing: true, error: null });
    try {
      const response = await authApi.refreshToken(refreshToken);
      if (generation !== this.operationGeneration) return;
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
      if (generation !== this.operationGeneration) {
        await SecureStorageService.removeToken();
        return;
      }
      this.setState({
        user,
        rememberMe,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        isRefreshing: false,
        sessionExpiresAt: Date.now() + response.expiresIn * 1000,
        error: null,
      });
    } catch (error) {
      if (generation !== this.operationGeneration) return;
      await SecureStorageService.removeToken();
      this.setState({
        ...initialState,
        isInitialized: true,
        isLoading: false,
        isRefreshing: false,
        error: toMessage(error, 'Session refresh failed.'),
      });
    }
  }

  async logout() {
    ++this.operationGeneration;
    this.setState({ isLoading: true, error: null, success: null });
    let logoutError: unknown;
    try {
      const refreshToken = await SecureStorageService.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      logoutError = error;
    } finally {
      await SecureStorageService.removeToken();
      this.setState({
        ...initialState,
        isInitialized: true,
        isLoading: false,
        success: logoutError ? null : 'Logged out successfully.',
        error: logoutError ? 'Signed out locally. The server session could not be revoked.' : null,
      });
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
