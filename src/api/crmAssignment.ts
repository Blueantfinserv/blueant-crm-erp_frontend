import { SecureStorageService } from '../services/SecureStorageService';
import { requestWithSessionRefresh } from './authenticatedRequest';
import type { ClientRegistrationRequest, ClientRegistrationResponse, CrmAssignmentResponse, CrmAssignmentTarget, CrmLeadQueueItem, CrmPhysicalLeadRequest, CrmPhysicalLeadResponse, EligibleFamilyHeadResponse, EligibleLeadPage, FamilyDetailResponse, FamilyHeadHistoryResponse, FamilyRelationship } from '../types/crm';

// CRM endpoints are served by the same production API that issues and refreshes
// the authenticated user token. Keeping one base URL prevents cross-deployment
// authorization mismatches.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T; details?: Record<string, unknown> };
type RoleSummary = { id?: number; roleCode?: string; roleName?: string; status?: string };
type UserSummary = { id?: number; employeeCode?: string; fullName?: string; roleName?: string; status?: string };
type UserPage = { content?: UserSummary[]; totalPages?: number };
type ClientLookup = { id?: number; clientCode?: string; clientName?: string; mobileNumber?: string };
type ClientPage = { content?: ClientLookup[]; totalPages?: number };
export type ClientDocumentUploadResponse = { documentReference?: string; fileName?: string; fileType?: string; fileSize?: number; documentType?: string; uploadStatus?: string };
export type ClientDocumentType = 'PAN_CARD' | 'AADHAAR_CARD' | 'PASSPORT' | 'CHEQUE' | 'SIGNATURE' | 'OTHER';
type UploadableDocument = { uri: string; name: string; mimeType?: string | null; file?: File };

export class CrmAssignmentApiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CrmAssignmentApiError';
  }
}

const roleCode = (value?: string) => String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/^ROLE_/, '');

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new CrmAssignmentApiError('Authentication token is unavailable.', '401');
  let response: Response;
  try {
    response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body && !(typeof FormData !== 'undefined' && init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    }));
  } catch {
    throw new CrmAssignmentApiError('Network unavailable. Please check your internet connection.', 'NETWORK_ERROR');
  }
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || payload?.success !== true || payload.data === undefined) {
    const details = payload?.details && typeof payload.details === 'object'
      ? Object.entries(payload.details).map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(', ') : String(message)}`).join(' · ')
      : '';
    throw new CrmAssignmentApiError(details || payload?.message || `CRM request failed (${response.status}).`, String(response.status));
  }
  return payload.data;
};

const loadRoleTargets = async (role: 'RELATIONSHIP_MANAGER' | 'SALES_COORDINATOR', roleId: number) => {
  const body = { keyword: '', departmentId: null, designationId: null, teamId: null, roleId, reportingManagerId: null, status: 'ACTIVE', page: 0, size: 100, sortBy: 'fullName', sortDirection: 'ASC' };
  const firstPage = await request<UserPage>('/v1/users/search', { method: 'POST', body: JSON.stringify(body) });
  const rest = await Promise.all(Array.from({ length: Math.max(0, (firstPage.totalPages ?? 1) - 1) }, (_, index) => (
    request<UserPage>('/v1/users/search', { method: 'POST', body: JSON.stringify({ ...body, page: index + 1 }) })
  )));
  return [firstPage, ...rest].flatMap((page) => page.content ?? [])
    .filter((user): user is Required<Pick<UserSummary, 'id' | 'employeeCode' | 'fullName'>> & UserSummary => Boolean(user.id && user.employeeCode && user.fullName))
    .map((user) => ({ id: user.id, employeeCode: user.employeeCode, fullName: user.fullName, role }));
};

export const crmAssignmentApi = {
  registerClient: (payload: ClientRegistrationRequest) => request<ClientRegistrationResponse>('/v1/clients/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  createPhysicalLead: (payload: CrmPhysicalLeadRequest) => request<CrmPhysicalLeadResponse>('/v1/Leads_assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getQueue: async (): Promise<CrmLeadQueueItem[]> => {
    const page = await request<EligibleLeadPage>('/v1/Leads_assign/eligible?page=0&size=100');
    return page.content ?? [];
  },
  findClientByMobile: async (mobileNumber: string): Promise<ClientLookup | null> => {
    const digits = mobileNumber.replace(/\D/g, '');
    if (!digits) return null;
    const first = await request<ClientPage>('/v1/clients?page=0&size=100');
    const pages = [first, ...await Promise.all(Array.from({ length: Math.max(0, Math.min((first.totalPages ?? 1) - 1, 19)) }, (_, index) => request<ClientPage>(`/v1/clients?page=${index + 1}&size=100`)))];
    return pages.flatMap((page) => page.content ?? []).find((client) => client.mobileNumber?.replace(/\D/g, '') === digits) ?? null;
  },
  getTargets: async (): Promise<CrmAssignmentTarget[]> => {
    const roles = await request<RoleSummary[]>('/v1/roles');
    const targetRoles = roles
      .filter((role): role is RoleSummary & { id: number } => Boolean(role.id) && ['RELATIONSHIP_MANAGER', 'SALES_COORDINATOR'].includes(roleCode(role.roleCode ?? role.roleName)))
      .map((role) => ({ id: role.id, code: roleCode(role.roleCode ?? role.roleName) as CrmAssignmentTarget['role'] }));
    const groups = await Promise.all(targetRoles.map(({ id, code }) => loadRoleTargets(code, id)));
    return groups.flat();
  },
  assign: (leadCode: string, salesPersonEmployeeCode: string) => request<CrmAssignmentResponse>(`/v1/Leads_assign/${encodeURIComponent(leadCode)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ salesPersonEmployeeCode }),
  }),
  uploadClientDocument: async (document: UploadableDocument, documentType: ClientDocumentType) => {
    const body = new FormData();
    // On web Expo returns the actual File object. Sending only its URI serializes
    // as text in browsers and the backend never receives a multipart binary.
    if (document.file) body.append('file', document.file, document.name);
    else body.append('file', { uri: document.uri, name: document.name, type: document.mimeType || 'application/octet-stream' } as never);
    return request<ClientDocumentUploadResponse>(`/v1/clients/documents/upload?documentType=${encodeURIComponent(documentType)}`, { method: 'POST', body });
  },
  getFamily: (familyCode: string) => request<FamilyDetailResponse>(`/v1/client-families/${encodeURIComponent(familyCode)}`),
  createFamily: (familyName: string, initialHeadClientId?: number, initialHeadRelationship: FamilyRelationship = 'SELF') => request<FamilyDetailResponse>('/v1/client-families', { method: 'POST', body: JSON.stringify({ familyName, ...(initialHeadClientId ? { initialHeadClientId, initialHeadRelationship } : {}) }) }),
  addFamilyMember: (familyCode: string, clientId: number, relationshipToHead: FamilyRelationship, designateAsHead = false) => request<unknown>(`/v1/client-families/${encodeURIComponent(familyCode)}/members`, { method: 'POST', body: JSON.stringify({ clientId, relationshipToHead, designateAsHead }) }),
  getEligibleFamilyHeads: (familyCode: string) => request<EligibleFamilyHeadResponse[]>(`/v1/client-families/${encodeURIComponent(familyCode)}/eligible-heads`),
  changeFamilyHead: (familyCode: string, newHeadClientId: number, reason?: string) => request<FamilyDetailResponse>(`/v1/client-families/${encodeURIComponent(familyCode)}/head`, { method: 'PUT', body: JSON.stringify({ newHeadClientId, ...(reason?.trim() ? { reason: reason.trim() } : {}) }) }),
  getFamilyHeadHistory: (familyCode: string) => request<FamilyHeadHistoryResponse[]>(`/v1/client-families/${encodeURIComponent(familyCode)}/head-history`),
};
