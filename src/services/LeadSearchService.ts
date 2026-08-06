import { leadSearchApi, LeadSearchApiError } from '../api/leadSearch';
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
    this.setState({ isLoading: true, error: null });
    try {
      const response = await leadSearchApi.search({ page: 0, size: 100 });
      this.setState({
        leads: response.data?.content ?? [],
        timestamp: response.timestamp ?? null,
        error: null,
      });
    } catch (error) {
      this.setState({ leads: [], timestamp: null, error: toMessage(error) });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  getState() {
    return this.state;
  }
}

export const leadSearchService = new LeadSearchService();
