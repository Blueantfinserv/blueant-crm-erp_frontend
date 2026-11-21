import { leadSearchApi } from '../api/leadSearch';
import type { LeadSearchState } from '../types/lead';

type Listener = (state: LeadSearchState) => void;

const initialState: LeadSearchState = {
  leads: [],
  timestamp: null,
  isLoading: false,
  error: null,
};

const toMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Prospects could not be loaded.';
};

export class LeadSearchService {
  private state = initialState;
  private listeners = new Set<Listener>();
  private hiddenTaskLeadKeys = new Set<string>();
  private assignedUserId: number | null = null;
  private assignedEmployeeCode: string | null = null;
  private requestGeneration = 0;
  private inFlight: { cycle: symbol; promise: Promise<void> } | null = null;

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

  private getDeduplicationKey(lead: { uniqueLeadId?: string; leadId?: number; leadCode?: string }) {
    if (lead.uniqueLeadId) return `unique:${lead.uniqueLeadId}`;
    if (lead.leadId !== undefined) return `id:${lead.leadId}`;
    if (lead.leadCode) return `code:${lead.leadCode}`;
    return null;
  }

  // Only callers explicitly belonging to the same refresh cycle may share a request.
  // No token means a fresh read (manual refresh, mutation follow-up or other callers).
  loadLeads(cycle: symbol = Symbol('fresh read')): Promise<void> {
    if (this.inFlight?.cycle === cycle) return this.inFlight.promise;
    const promise = this.fetchForRefreshCycle().finally(() => {
      if (this.inFlight?.promise === promise) this.inFlight = null;
    });
    this.inFlight = { cycle, promise };
    return promise;
  }

  private async fetchForRefreshCycle() {
    const generation = ++this.requestGeneration;
    const assignedUserId = this.assignedUserId;
    const assignedEmployeeCode = this.assignedEmployeeCode;
    const previousLeads = this.state.leads;
    this.setState({ isLoading: true, error: null });
    try {
      const request = {
        ...(assignedUserId !== null ? { filter: { assignedUserId } } : {}),
        size: 100,
      };
      const response = await leadSearchApi.search({ ...request, page: 0 });
      type Lead = LeadSearchState['leads'][number];
      const totalPages = Math.max(1, response.data?.totalPages ?? 1);
      const pages = new Map<number, Lead[]>([[0, response.data?.content ?? []]]);
      const collectLeads = (includePrevious: boolean) => {
        const byKey = new Map<string, Lead>();
        const refreshedKeys = new Set<string>();
        if (includePrevious) previousLeads.forEach((lead) => {
          const key = this.getDeduplicationKey(lead);
          if (key) byKey.set(key, lead);
        });
        const unkeyed: Lead[] = [];
        [...pages.keys()].sort((left, right) => left - right).forEach((pageNumber) => {
          pages.get(pageNumber)?.forEach((lead) => {
            const key = this.getDeduplicationKey(lead);
            if (!key) unkeyed.push(lead);
            else if (!refreshedKeys.has(key)) {
              byKey.set(key, lead);
              refreshedKeys.add(key);
            }
          });
        });
        const leads = [...byKey.values(), ...unkeyed].map((lead) => ({
          ...lead,
          assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt,
        }));
        return (assignedUserId === null && assignedEmployeeCode === null
          ? leads
          : leads.filter((lead) => (
            (assignedUserId !== null && lead.assignedUserId === assignedUserId)
            || (assignedEmployeeCode !== null && lead.assignedEmployeeCode === assignedEmployeeCode)
          ))).filter((lead) => !this.isHiddenTaskLead(lead));
      };
      if (generation !== this.requestGeneration) return;
      this.setState({
        leads: collectLeads(true),
        timestamp: response.timestamp ?? null,
        error: null,
      });
      let nextPage = 1;
      let failed = false;
      let failure: unknown;
      const loadPage = async () => {
        while (!failed && nextPage < totalPages) {
          const pageNumber = nextPage++;
          try {
            const page = await leadSearchApi.search({ ...request, page: pageNumber });
            if (generation !== this.requestGeneration) return;
            pages.set(pageNumber, page.data?.content ?? []);
            this.setState({ leads: collectLeads(true), error: null });
          } catch (error) {
            failed = true;
            failure = error;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, totalPages - 1) }, loadPage));
      if (failure) throw failure;
      if (generation !== this.requestGeneration) return;
      this.setState({
        leads: collectLeads(false),
        timestamp: response.timestamp ?? null,
        error: null,
      });
    } catch (error) {
      if (generation !== this.requestGeneration) return;
      this.setState({ error: toMessage(error) });
    } finally {
      if (generation === this.requestGeneration) this.setState({ isLoading: false });
    }
  }

  getState() {
    return this.state;
  }

  setAssignedUserScope(assignedUserId: number | null, assignedEmployeeCode: string | null = null) {
    if (this.assignedUserId === assignedUserId && this.assignedEmployeeCode === assignedEmployeeCode) return;
    this.assignedUserId = assignedUserId;
    this.assignedEmployeeCode = assignedEmployeeCode;
    this.reset();
  }

  reset() {
    this.requestGeneration += 1;
    this.inFlight = null;
    this.hiddenTaskLeadKeys.clear();
    this.setState(initialState);
  }

  hideLeadFromTasks(lead: { leadId?: number; leadCode?: string; uniqueLeadId?: string }) {
    this.getLeadKeys(lead).forEach((key) => this.hiddenTaskLeadKeys.add(key));
    this.setState({ leads: this.state.leads.filter((candidate) => !this.isHiddenTaskLead(candidate)) });
  }
}

export const leadSearchService = new LeadSearchService();
