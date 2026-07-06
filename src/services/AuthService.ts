import { authApi } from '../api/auth';
import { SecureStorageService } from './SecureStorageService';
import { AuthResponse, AuthState, AuthUser } from '../types/auth';

type Listener = (state: AuthState) => void;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRefreshing: false,
  error: null,
  success: null,
};

const createSuccessState = (response: AuthResponse): AuthState => ({
  user: response.user,
  isAuthenticated: true,
  isLoading: false,
  isRefreshing: false,
  error: null,
  success: response.message,
});

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

  async bootstrap() {
    this.setState({ isLoading: true });
    const [token, user] = await Promise.all([SecureStorageService.getToken(), SecureStorageService.getUserData()]);
    this.setState({
      user,
      isAuthenticated: Boolean(token && user),
      isLoading: false,
    });
  }

  async login(): Promise<AuthResponse> {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.login();
      await SecureStorageService.saveToken(response.tokens, response.user);
      this.setState(createSuccessState(response));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      this.setState({ isLoading: false, error: message });
      throw error;
    }
  }

  async activateAccount(): Promise<AuthResponse> {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.activateAccount();
      await SecureStorageService.saveToken(response.tokens, response.user);
      this.setState(createSuccessState(response));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account activation failed.';
      this.setState({ isLoading: false, error: message });
      throw error;
    }
  }

  async forgotPassword() {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.forgotPassword();
      this.setState({ isLoading: false, success: response.message });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forgot password failed.';
      this.setState({ isLoading: false, error: message });
      throw error;
    }
  }

  async resetPassword() {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await authApi.resetPassword();
      this.setState({ isLoading: false, success: response.message });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reset password failed.';
      this.setState({ isLoading: false, error: message });
      throw error;
    }
  }

  async logout() {
    this.setState({ isLoading: true, error: null, success: null });
    await authApi.logout();
    await SecureStorageService.removeToken();
    this.setState({ ...initialState, isLoading: false, success: 'Logged out successfully.' });
  }

  getState() {
    return this.state;
  }
}

export const authService = new AuthService();

export type AuthServiceApi = {
  login: () => Promise<AuthResponse>;
  activateAccount: () => Promise<AuthResponse>;
  forgotPassword: () => Promise<{ message: string }>;
  resetPassword: () => Promise<{ message: string }>;
  logout: () => Promise<void>;
};

export type { AuthUser, AuthResponse };
