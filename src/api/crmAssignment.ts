import { SecureStorageService } from '../services/SecureStorageService';
import { requestWithSessionRefresh } from './authenticatedRequest';
import type { ClientMeetingResponse, ClientProfileResponse, ClientRegistrationRequest, ClientRegistrationResponse, CrmAssignmentResponse, CrmAssignmentTarget, CrmLeadQueueItem, CrmPhysicalLeadRequest, CrmPhysicalLeadResponse, EligibleFamilyHeadResponse, EligibleLeadPage, FamilyDetailResponse, FamilyHeadHistoryResponse, FamilyRelationship } from '../types/crm';

// Existing CRM requests retain the configured production host.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api';
// Backend-provided host, scoped to the CRM Assigned Clients list only.
const CRM_CLIENT_LIST_BASE_URL = 'https://blueant-crm-erp.up.railway.app/api';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T; details?: Record<string, unknown> };
export type CrmClientPage = {
  content: ClientProfileResponse[];
  totalPages: number;
  number?: number;
  size?: number;
  totalElements?: number;
  numberOfElements?: number;
};
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

const roleCode = (value?: string) => {
  const code = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/^ROLE_/, '');
  return code === 'RM' ? 'RELATIONSHIP_MANAGER' : code === 'SC' ? 'SALES_COORDINATOR' : code;
};

const parseCrmClientPage = (payload: unknown): CrmClientPage | undefined => {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const page = isRecord(payload) && payload.success === true
    ? payload.data
    : payload;
  if (!isRecord(page)
    || !Array.isArray(page.content)
    || !Number.isInteger(page.totalPages)
    || (page.totalPages as number) < 0
    || (page.number !== undefined && (!Number.isInteger(page.number) || (page.number as number) < 0))
    || page.content.some(client => !isRecord(client))) return undefined;
  return page as unknown as CrmClientPage;
};

const request = async <T>(
  path: string,
  init: RequestInit = {},
  baseUrl = API_BASE_URL,
  parseResponse?: (payload: unknown) => T | undefined,
): Promise<T> => {
  const token = await SecureStorageService.getToken();
  if (!token) throw new CrmAssignmentApiError('Authentication token is unavailable.', '401');
  let response: Response;
  try {
    response = await requestWithSessionRefresh(token, (accessToken) => fetch(`${baseUrl}${path}`, {
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
  if (!response.ok) {
    const details = payload?.details && typeof payload.details === 'object'
      ? Object.entries(payload.details).map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(', ') : String(message)}`).join(' · ')
      : '';
    throw new CrmAssignmentApiError(details || payload?.message || `CRM request failed (${response.status}).`, String(response.status));
  }
  if (parseResponse) {
    const parsed = parseResponse(payload);
    if (parsed !== undefined) return parsed;
    throw new CrmAssignmentApiError('CRM response format is invalid.', String(response.status));
  }
  if (payload?.success !== true || payload.data === undefined) {
    const details = payload?.details && typeof payload.details === 'object'
      ? Object.entries(payload.details).map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(', ') : String(message)}`).join(' · ')
      : '';
    throw new CrmAssignmentApiError(details || payload?.message || `CRM request failed (${response.status}).`, String(response.status));
  }
  return payload.data;
};

const loadRoleTargets = async (role: 'RELATIONSHIP_MANAGER' | 'SALES_COORDINATOR', roleId: number, baseUrl: string) => {
  const body = { keyword: '', departmentId: null, designationId: null, teamId: null, roleId, reportingManagerId: null, status: 'ACTIVE', page: 0, size: 100 };
  const firstPage = await request<UserPage>('/v1/users/search', { method: 'POST', body: JSON.stringify(body) }, baseUrl);
  const rest = await Promise.all(Array.from({ length: Math.max(0, (firstPage.totalPages ?? 1) - 1) }, (_, index) => (
    request<UserPage>('/v1/users/search', { method: 'POST', body: JSON.stringify({ ...body, page: index + 1 }) }, baseUrl)
  )));
  return [firstPage, ...rest].flatMap((page) => page.content ?? [])
    .filter((user): user is Required<Pick<UserSummary, 'id' | 'employeeCode' | 'fullName'>> & UserSummary => Boolean(user.id && user.employeeCode && user.fullName))
    .map((user) => ({ id: user.id, employeeCode: user.employeeCode, fullName: user.fullName, role }));
};

export const crmAssignmentApi = {
  getAssignedClientProfile: (clientCode: string) => request<ClientProfileResponse>(
    `/v1/clients/${encodeURIComponent(clientCode)}/profile`, {}, CRM_CLIENT_LIST_BASE_URL,
  ),
  updateClientProfile: (clientId: number, payload: Record<string, unknown>) => request<ClientProfileResponse>(
    `/v1/clients/${encodeURIComponent(String(clientId))}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    CRM_CLIENT_LIST_BASE_URL,
    (response: unknown) => {
      if (typeof response !== 'object' || response === null || Array.isArray(response)) return undefined;
      const record = response as Record<string, unknown>;
      const data = record.data !== undefined && typeof record.data === 'object' && record.data !== null
        ? record.data as Record<string, unknown>
        : record;
      if (typeof data.id !== 'number' && typeof data.clientCode !== 'string') return undefined;
      return data as unknown as ClientProfileResponse;
    },
  ),
  getAssignedClientHistory: (clientCode: string) => request<ClientMeetingResponse[]>(
    `/v1/client-meetings/client/${encodeURIComponent(clientCode)}`, {}, CRM_CLIENT_LIST_BASE_URL,
  ),
  getAssignedClientsPage: async (page = 0): Promise<CrmClientPage> => {
    const result = await request<CrmClientPage>(`/v1/clients?page=${page}&size=100`, {}, CRM_CLIENT_LIST_BASE_URL, parseCrmClientPage);
    if (result.number !== undefined && result.number !== page) {
      throw new CrmAssignmentApiError(`CRM clients page ${page} returned page ${result.number}.`, 'INVALID_PAGE');
    }
    return result;
  },
  // CRM assignment history must survive browser/device storage changes.
  getAssignedClients: async ({ onPage, valid = () => true }: {
    onPage?: (clients: ClientProfileResponse[]) => void;
    valid?: () => boolean;
  } = {}): Promise<ClientProfileResponse[]> => {
    const loadPage = (pageNumber: number) => request<CrmClientPage>(
      `/v1/clients?page=${pageNumber}&size=100`,
      {},
      CRM_CLIENT_LIST_BASE_URL,
      parseCrmClientPage,
    ).then(page => {
      if (page.number !== undefined && page.number !== pageNumber) {
        throw new CrmAssignmentApiError(`CRM clients page ${pageNumber} returned page ${page.number}.`, 'INVALID_PAGE');
      }
      return page;
    });
    if (!valid()) return [];
    const first = await loadPage(0);
    if (!valid()) return [];
    const pages = new Map<number, CrmClientPage>([[0, first]]);
    const snapshot = () => {
      const seen = new Set<string>();
      return [...pages.entries()].sort(([left], [right]) => left - right)
        .flatMap(([, page]) => page.content)
        .filter(client => Boolean((client.salesPersonCode ?? client.assignedSalesPersonCode)?.trim()))
        .filter(client => {
          const key = client.clientCode || (client.id !== undefined ? `id:${client.id}` : '');
          if (!key) return true;
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
    };
    onPage?.(snapshot());
    let nextPage = 1;
    let failure: unknown;
    const worker = async () => {
      while (valid() && !failure && nextPage < first.totalPages) {
        const pageNumber = nextPage++;
        try {
          const page = await loadPage(pageNumber);
          if (!valid()) return;
          pages.set(pageNumber, page);
          onPage?.(snapshot());
        } catch (error) { failure ??= error; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, Math.max(0, first.totalPages - 1)) }, worker));
    if (!valid()) return [];
    if (failure) throw failure;
    return snapshot();
  },
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
    const roles = await request<RoleSummary[]>('/v1/roles', {}, CRM_CLIENT_LIST_BASE_URL);
    const targetRoles = roles
      .filter((role): role is RoleSummary & { id: number } => Boolean(role.id) && ['RELATIONSHIP_MANAGER', 'SALES_COORDINATOR'].includes(roleCode(role.roleCode ?? role.roleName)))
      .map((role) => ({ id: role.id, code: roleCode(role.roleCode ?? role.roleName) as CrmAssignmentTarget['role'] }));
    const groups = await Promise.all(targetRoles.map(({ id, code }) => loadRoleTargets(code, id, CRM_CLIENT_LIST_BASE_URL)));
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
