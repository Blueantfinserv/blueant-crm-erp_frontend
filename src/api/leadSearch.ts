import { SecureStorageService } from '../services/SecureStorageService';
import type { ApiResponsePageResponseLeadResponse, LeadSearchRequest } from '../types/lead';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://blueant-crm-erp.up.railway.app/api';

export class LeadSearchApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'LeadSearchApiError';
    this.code = code;
  }
}

const getBackendMessage = (payload: unknown): string | null => {
  if (
    typeof payload === 'object'
    && payload !== null
    && 'message' in payload
    && typeof payload.message === 'string'
    && payload.message.trim()
  ) {
    return payload.message;
  }
  return null;
};

export const leadSearchApi = {
  search: async (requestBody: LeadSearchRequest): Promise<ApiResponsePageResponseLeadResponse> => {
    const accessToken = await SecureStorageService.getToken();
    if (!accessToken) {
      throw new LeadSearchApiError('Authentication token is unavailable.', 'UNAUTHENTICATED');
    }

    const page = requestBody.page ?? 0;
    const size = requestBody.size ?? 100;
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/v1/leads/search?page=${page}&size=${size}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch {
      throw new LeadSearchApiError(
        'Network unavailable. Please check your internet connection.',
        'NETWORK_ERROR',
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    const searchResponse = payload as ApiResponsePageResponseLeadResponse | null;
    if (!response.ok || searchResponse?.success !== true) {
      throw new LeadSearchApiError(
        getBackendMessage(payload) ?? `Lead search failed (${response.status}).`,
        String(response.status),
      );
    }
    if (!Array.isArray(searchResponse.data?.content)) {
      throw new LeadSearchApiError('Lead search response data is unavailable.', 'INVALID_RESPONSE');
    }
    return searchResponse;
  },
};
