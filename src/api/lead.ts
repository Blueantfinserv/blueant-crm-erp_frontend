import { SecureStorageService } from '../services/SecureStorageService';
import { ApiResponseLeadResponse, CreateLeadRequest } from '../types/lead';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://blueant-crm-erp.up.railway.app/api';

export class LeadApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'LeadApiError';
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

const request = async (path: string, init: RequestInit): Promise<ApiResponseLeadResponse> => {
  const accessToken = await SecureStorageService.getToken();
  if (!accessToken) {
    throw new LeadApiError('Authentication token is unavailable.', 'UNAUTHENTICATED');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new LeadApiError(
      'Network unavailable. Please check your internet connection.',
      'NETWORK_ERROR',
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  const leadResponse = payload as ApiResponseLeadResponse | null;
  if (!response.ok || leadResponse?.success !== true) {
    throw new LeadApiError(
      getBackendMessage(payload) ?? `Lead request failed (${response.status}).`,
      String(response.status),
    );
  }
  if (!leadResponse.data) {
    throw new LeadApiError('Lead response data is unavailable.', 'INVALID_RESPONSE');
  }
  return leadResponse;
};

export const leadApi = {
  createLead: async (requestBody: CreateLeadRequest): Promise<ApiResponseLeadResponse> => {
    return request('/v1/leads', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },
};
