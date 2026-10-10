import { SecureStorageService } from '../services/SecureStorageService';
import { requestWithSessionRefresh } from './authenticatedRequest';
import type { CrmAssignmentResponse, CrmAssignmentTarget, CrmLeadQueueItem, CrmPhysicalLeadRequest, CrmPhysicalLeadResponse, EligibleLeadPage } from '../types/crm';

// CRM endpoints are served by the same production API that issues and refreshes
// the authenticated user token. Keeping one base URL prevents cross-deployment
// authorization mismatches.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T };
type RoleSummary = { id?: number; roleCode?: string; roleName?: string; status?: string };
type UserSummary = { id?: number; employeeCode?: string; fullName?: string; roleName?: string; status?: string };
type UserPage = { content?: UserSummary[]; totalPages?: number };

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
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    }));
  } catch {
    throw new CrmAssignmentApiError('Network unavailable. Please check your internet connection.', 'NETWORK_ERROR');
  }
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || payload?.success !== true || payload.data === undefined) {
    throw new CrmAssignmentApiError(payload?.message ?? `CRM request failed (${response.status}).`, String(response.status));
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
  createPhysicalLead: (payload: CrmPhysicalLeadRequest) => request<CrmPhysicalLeadResponse>('/v1/Leads_assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getQueue: async (): Promise<CrmLeadQueueItem[]> => {
    const page = await request<EligibleLeadPage>('/v1/Leads_assign/eligible?page=0&size=100');
    return page.content ?? [];
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
};
