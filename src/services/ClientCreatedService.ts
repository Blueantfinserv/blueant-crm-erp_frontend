import { leadSearchApi, LeadSearchApiError } from '../api/leadSearch';
import type { LeadResponse } from '../types/lead';

type ClientCreatedState = {
  leads: LeadResponse[];
  isLoading: boolean;
  error: string | null;
};

type Listener = (state: ClientCreatedState) => void;

const initialState: ClientCreatedState = { leads: [], isLoading: false, error: null };
const clientStatuses = ['CONVERTED', 'ALREADY_CLIENT'] as const;

const isAssignedToUser = (lead: LeadResponse, userId?: number, employeeCode?: string) => (
  (userId !== undefined && lead.assignedUserId === userId)
  || (Boolean(employeeCode) && lead.assignedEmployeeCode === employeeCode)
);

export class ClientCreatedService {
  private state = initialState;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(next: Partial<ClientCreatedState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState() {
    return this.state;
  }

  async loadClients(userId?: number, employeeCode?: string) {
    this.setState({ isLoading: true, error: null });
    try {
      const loadStatus = async (leadStatus: (typeof clientStatuses)[number]) => {
        const request = { leadStatus, ...(userId !== undefined ? { assignedUserId: userId } : {}), page: 0, size: 100 };
        const firstPage = await leadSearchApi.search(request);
        const remainingPages = await Promise.all(Array.from({ length: Math.max(0, (firstPage.data?.totalPages ?? 1) - 1) }, (_, index) => (
          leadSearchApi.search({ ...request, page: index + 1 })
        )));
        return [...(firstPage.data?.content ?? []), ...remainingPages.flatMap((page) => page.data?.content ?? [])];
      };

      const results = await Promise.all(clientStatuses.map(loadStatus));
      const seen = new Set<string>();
      const leads = results.flat()
        .filter((lead) => isAssignedToUser(lead, userId, employeeCode))
        .filter((lead) => {
          const key = lead.uniqueLeadId ?? lead.leadCode ?? String(lead.leadId ?? '');
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      this.setState({ leads, error: null });
    } catch (error) {
      this.setState({
        leads: [],
        error: error instanceof LeadSearchApiError || error instanceof Error ? error.message : 'Created clients could not be loaded.',
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }
}

export const clientCreatedService = new ClientCreatedService();
