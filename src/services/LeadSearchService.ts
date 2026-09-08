import { leadSearchApi, LeadSearchApiError } from '../api/leadSearch';
import { leadApi } from '../api/lead';
import type { LeadSearchState } from '../types/lead';

type Listener = (state: LeadSearchState) => void;

const initialState: LeadSearchState = {
  leads: [],
  timestamp: null,
  isLoading: false,
  error: null,
};

const toMessage = (error: unknown) => {
  if (error instanceof LeadSearchApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Leads could not be loaded.';
};

export class LeadSearchService {
  private state = initialState;
  private listeners = new Set<Listener>();
  private hiddenTaskLeadKeys = new Set<string>();
  private assignedUserId: number | null = null;
  private requestGeneration = 0;

  private getLeadKeys(lead: { leadId?: number; leadCode?: string; uniqueLeadId?: string }) {
    return [
      lead.leadId !== undefined ? `id:${lead.leadId}` : '',
      lead.leadCode ? `code:${lead.leadCode}` : '',
      lead.uniqueLeadId ? `unique:${lead.uniqueLeadId}` : '',
    ].filter(Boolean);
  }

  private isHiddenTaskLead(lead: { leadId?: number; leadCode?: string; uniqueLeadId?: string }) {
    return this.getLeadKeys(lead).some((key) => this.hiddenTaskLeadKeys.has(key));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private setState(next: Partial<LeadSearchState>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  async loadLeads() {
    const generation = this.requestGeneration;
    const assignedUserId = this.assignedUserId;
    this.setState({ isLoading: true, error: null });
    try {
      const response = await leadSearchApi.search({
        ...(assignedUserId !== null ? { filter: { assignedUserId } } : {}),
        page: 0,
        size: 100,
      });
      const leads = await Promise.all((response.data?.content ?? []).map(async (lead) => {
        const uniqueLeadId = lead.uniqueLeadId?.trim();
        if (!uniqueLeadId) return lead;
        try {
          const details = (await leadApi.getLeadDetails(uniqueLeadId)).data;
          return details ? { ...lead, ...details } : lead;
        } catch {
          return lead;
        }
      }));
      if (generation !== this.requestGeneration) return;
      const scopedLeads = assignedUserId === null
        ? leads
        : leads.filter((lead) => lead.assignedUserId === assignedUserId);
      this.setState({
        leads: scopedLeads.filter((lead) => !this.isHiddenTaskLead(lead)),
        timestamp: response.timestamp ?? null,
        error: null,
      });
    } catch (error) {
      if (generation !== this.requestGeneration) return;
      this.setState({ leads: [], timestamp: null, error: toMessage(error) });
    } finally {
      if (generation === this.requestGeneration) this.setState({ isLoading: false });
    }
  }

  getState() {
    return this.state;
  }

  setAssignedUserScope(assignedUserId: number | null) {
    this.assignedUserId = assignedUserId;
  }

  reset() {
    this.requestGeneration += 1;
    this.hiddenTaskLeadKeys.clear();
    this.setState(initialState);
  }

  hideLeadFromTasks(lead: { leadId?: number; leadCode?: string; uniqueLeadId?: string }) {
    this.getLeadKeys(lead).forEach((key) => this.hiddenTaskLeadKeys.add(key));
    this.setState({ leads: this.state.leads.filter((candidate) => !this.isHiddenTaskLead(candidate)) });
  }
}

export const leadSearchService = new LeadSearchService();
