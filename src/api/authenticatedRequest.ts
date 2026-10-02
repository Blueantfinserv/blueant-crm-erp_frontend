import { authService } from '../services/AuthService';
import { SecureStorageService } from '../services/SecureStorageService';

type AuthenticatedRequest = (accessToken: string) => Promise<Response>;

export const requestWithSessionRefresh = async (
  accessToken: string,
  request: AuthenticatedRequest,
): Promise<Response> => {
  const response = await request(accessToken);
  if (response.status !== 401) return response;

  await authService.refreshSession();
  const refreshedAccessToken = await SecureStorageService.getToken();
  return refreshedAccessToken ? request(refreshedAccessToken) : response;
};
