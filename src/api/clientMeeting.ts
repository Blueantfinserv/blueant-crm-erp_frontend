import { SecureStorageService } from '../services/SecureStorageService';
import { requestWithSessionRefresh } from './authenticatedRequest';
import type { ClientMeetingResponse, ClientMeetingUpdateRequest, ClientMeetingVerificationPage, ClientMeetingVerificationRequest, ClientProfileResponse } from '../types/crm';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api';
type ApiResponse<T> = { success?: boolean; message?: string; data?: T };

const get = async <T>(path: string): Promise<T> => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new Error('Authentication token is unavailable.');
  let response: Response;
  try {
    response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    }));
  } catch {
    throw new Error('Network unavailable. Please check your internet connection.');
  }
  const body = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(body?.message ?? `Client meeting request failed (${response.status}).`);
  }
  return body.data;
};

const post = async <T>(path: string, payload: unknown): Promise<T> => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new Error('Authentication token is unavailable.');
  let response: Response;
  try {
    response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    }));
  } catch {
    throw new Error('Network unavailable. Please check your internet connection.');
  }
  const body = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(body?.message ?? `Client meeting request failed (${response.status}).`);
  }
  return body.data;
};

export const clientMeetingApi = {
  getPendingVerification(page = 0, size = 100): Promise<ClientMeetingVerificationPage> {
    return get<ClientMeetingVerificationPage>(`/v1/client-meetings/verification/pending?page=${page}&size=${size}`);
  },
  getMeeting(meetingCode: string): Promise<ClientMeetingResponse> {
    return get<ClientMeetingResponse>(`/v1/client-meetings/${encodeURIComponent(meetingCode)}`);
  },
  getByClientCode(clientCode: string): Promise<ClientMeetingResponse[]> {
    return get<ClientMeetingResponse[]>(`/v1/client-meetings/client/${encodeURIComponent(clientCode)}`);
  },
  getProfile(clientCode: string): Promise<ClientProfileResponse> {
    return get<ClientProfileResponse>(`/v1/clients/${encodeURIComponent(clientCode)}/profile`);
  },
  verify(meetingCode: string, payload: ClientMeetingVerificationRequest): Promise<ClientMeetingResponse> {
    return post<ClientMeetingResponse>(`/v1/client-meetings/verification/${encodeURIComponent(meetingCode)}/verify`, payload);
  },
  async update(clientCode: string, payload: ClientMeetingUpdateRequest): Promise<ClientMeetingResponse> {
    const token = await SecureStorageService.getToken(); if (!token) throw new Error('Authentication token is unavailable.');
    let response: Response; try { response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${API_BASE_URL}/v1/clients/${encodeURIComponent(clientCode)}/meetings/update`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) })); } catch { throw new Error('Network unavailable. Please check your internet connection.'); }
    const body = await response.json().catch(() => null) as ApiResponse<ClientMeetingResponse> | null; if (!response.ok || body?.success !== true || !body.data) throw new Error(body?.message ?? `Client meeting update failed (${response.status}).`); return body.data;
  },
};
