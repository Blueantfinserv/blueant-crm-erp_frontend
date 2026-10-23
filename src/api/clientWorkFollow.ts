import { SecureStorageService } from '../services/SecureStorageService';
import { requestWithSessionRefresh } from './authenticatedRequest';
import type { ClientWorkFollowPage } from '../types/crm';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api';
type ApiResponse<T> = { success?: boolean; message?: string; data?: T };

export class ClientWorkFollowApiError extends Error {
  constructor(message: string) { super(message); }
}

export const clientWorkFollowApi = {
  async getQueue({ search = '', status = '', salesPersonCode = '', page = 0, size = 100 }: { search?: string; status?: string; salesPersonCode?: string; page?: number; size?: number } = {}) {
    const token = await SecureStorageService.getToken();
    if (!token) throw new ClientWorkFollowApiError('Authentication token is unavailable.');
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search.trim()) params.set('search', search.trim());
    if (status.trim()) params.set('status', status.trim());
    if (salesPersonCode.trim()) params.set('salesPersonCode', salesPersonCode.trim());
    let response: Response;
    try {
      response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${API_BASE_URL}/v1/clients/work-follow?${params.toString()}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } }));
    } catch { throw new ClientWorkFollowApiError('Network unavailable. Please check your internet connection.'); }
    const payload = await response.json().catch(() => null) as ApiResponse<ClientWorkFollowPage> | null;
    if (!response.ok || payload?.success !== true || !payload.data) throw new ClientWorkFollowApiError(payload?.message ?? `Client work follow request failed (${response.status}).`);
    return payload.data;
  },
};
