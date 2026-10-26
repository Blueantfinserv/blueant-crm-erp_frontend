import { SecureStorageService } from '../services/SecureStorageService';
import { requestWithSessionRefresh } from './authenticatedRequest';
import type { ClientProfileResponse } from '../types/crm';

export type ClientDocument = NonNullable<ClientProfileResponse['documents']>[number] & { id?: number };

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api').replace(/\/$/, '');

const request = async (path: string) => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new Error('Authentication token is unavailable.');
  let response: Response;
  try {
    response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }));
  } catch {
    throw new Error('Document could not be downloaded. Please check your connection and try again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Document download failed (${response.status}).`);
  }
  return response;
};

export const fetchClientDocument = async (clientCode: string, document: ClientDocument): Promise<Response> => {
  if (!clientCode.trim()) throw new Error('Client code is unavailable. Refresh the client details and try again.');
  const clientPath = `/v1/clients/${encodeURIComponent(clientCode.trim())}/documents`;
  let id = document.id;
  // Older profile payloads can omit IDs; resolve the attachment by its exact reference.
  if (!Number.isSafeInteger(id) || Number(id) <= 0) {
    const response = await request(clientPath);
    const body = await response.json() as { success?: boolean; data?: ClientDocument[]; message?: string };
    if (body.success !== true || !Array.isArray(body.data)) {
      throw new Error(body.message ?? 'Client document details could not be loaded.');
    }
    id = document.documentReference
      ? body.data.find((item) => item.documentReference === document.documentReference)?.id
      : undefined;
  }
  if (!Number.isSafeInteger(id) || Number(id) <= 0) {
    throw new Error('This document has no downloadable attachment. Refresh the client details and try again.');
  }
  return request(`${clientPath}/${id}/download`);
};
