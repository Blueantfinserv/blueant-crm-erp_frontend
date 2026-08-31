import { SecureStorageService } from '../services/SecureStorageService';
import type { ActiveMeetingResponse, ApiResponse, CancelMeetingRequest, CreateMeetingRequest, MeetingDetail, MeetingDropdown, MeetingResponse, MeetingSearchRequest, MeetingSummary, MeetingUpdate, PageResponse, RescheduleMeetingRequest, ScheduleMeetingRequest, MeetingWorkflowRequest, MeetingVerificationRequest } from '../types/meeting';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://blueant-crm-erp.up.railway.app/api';
export class MeetingApiError extends Error { constructor(message: string, public code: string) { super(message); this.name = 'MeetingApiError'; } }
const messageOf = (value: unknown) => typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string' ? value.message : null;

const call = async <T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new MeetingApiError('Authentication token is unavailable.', 'UNAUTHENTICATED');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...init.headers } });
  } catch { throw new MeetingApiError('Network unavailable. Please check your internet connection.', 'NETWORK_ERROR'); }
  const payload: unknown = response.status === 204 ? { success: true, status: 204 } : await response.json().catch(() => null);
  const result = payload as ApiResponse<T> | null;
  if (!response.ok || result?.success !== true) throw new MeetingApiError(messageOf(payload) ?? `Meeting request failed (${response.status}).`, String(response.status));
  return result;
};
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const codePath = (code: string) => encodeURIComponent(code);

const directCall = async <T>(path: string, init: RequestInit): Promise<T> => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new MeetingApiError('Authentication token is unavailable.', 'UNAUTHENTICATED');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    throw new MeetingApiError('Network unavailable. Please check your internet connection.', 'NETWORK_ERROR');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new MeetingApiError(messageOf(payload) ?? `Meeting request failed (${response.status}).`, String(response.status));
  const wrapped = payload as ApiResponse<T> | null;
  return (wrapped?.success === true ? wrapped.data : payload) as T;
};

export const meetingApi = {
  getMeetings: (query = '') => call<MeetingResponse[]>(`/v1/meetings${query}`),
  createMeeting: (body: CreateMeetingRequest) => call<MeetingResponse>('/v1/meetings', json(body)),
  getMeeting: (code: string) => call<MeetingDetail>(`/v1/meetings/${codePath(code)}`),
  submitWorkflowUpdate: (code: string, body: MeetingWorkflowRequest) => call<MeetingResponse>(`/v1/meetings/${codePath(code)}/workflow-update`, json(body)),
  getActiveMeeting: (leadId: string) => call<ActiveMeetingResponse>(`/v1/meetings/lead/${encodeURIComponent(leadId)}/active`),
  getJourney: (leadId: string) => call<MeetingSummary[]>(`/v1/meetings/lead/${encodeURIComponent(leadId)}/journey`),
  getHistory: (leadId: string) => call<MeetingSummary[]>(`/v1/meetings/lead/${encodeURIComponent(leadId)}/history`),
  getUpdateHistory: (code: string) => call<MeetingUpdate[]>(`/v1/meetings/${codePath(code)}/update-history`),
  search: (body: MeetingSearchRequest, page = 0, size = 100) => call<PageResponse<MeetingSummary>>(`/v1/meetings/search?page=${page}&size=${size}`, json(body)),
  schedule: (body: ScheduleMeetingRequest) => call<MeetingResponse>('/v1/meetings/schedule', json(body)),
  reschedule: (code: string, body: RescheduleMeetingRequest) => call<MeetingResponse>(`/v1/meetings/${codePath(code)}/reschedule`, json(body)),
  cancel: (code: string, body: CancelMeetingRequest) => call<void>(`/v1/meetings/${codePath(code)}/cancel`, json(body)),
  getToday: () => call<MeetingDetail[]>('/v1/meetings/today'),
  getUpcoming: () => call<MeetingDetail[]>('/v1/meetings/upcoming'),
  getByDate: (date: string) => call<MeetingDetail[]>(`/v1/meetings/by-date?meetingDate=${encodeURIComponent(date)}`),
  getDropdown: () => call<MeetingDropdown[]>('/v1/meetings/dropdown'),
  getByVerificationStatus: (status: 'PENDING' | 'VERIFIED') =>
    call<MeetingResponse[]>(`/v1/meetings?verificationStatus=${encodeURIComponent(status)}`),
  verify: (meetingCode: string, body: MeetingVerificationRequest) =>
    directCall<MeetingResponse>(`/v1/meetings/verification/${codePath(meetingCode)}/verify`, json(body)),
};
