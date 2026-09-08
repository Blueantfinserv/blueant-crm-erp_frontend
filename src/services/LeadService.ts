import { leadApi, LeadApiError } from '../api/lead';
import { AssignLeadRequest, CreateLeadRequest, LeadResponse, LeadState } from '../types/lead';

type Listener = (state: LeadState) => void;

const initialState: LeadState = {
  createdLead: null,
  isLoading: false,
  error: null,
  success: null,
};

const toMessage = (error: unknown, fallback: string) => {
  if (error instanceof LeadApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

export class LeadService {
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

  private setState(next: Partial<LeadState>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  async createLead(request: CreateLeadRequest): Promise<LeadResponse> {
    this.setState({ isLoading: true, error: null, success: null });
    try {
      const response = await leadApi.createLead(request);
      const createdLead = response.data as LeadResponse;
      this.setState({
        createdLead,
        error: null,
        success: response.message ?? 'Lead created successfully.',
      });
      return createdLead;
    } catch (error) {
      this.setState({
        error: toMessage(error, 'Lead creation failed.'),
      });
      throw error;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async assignLead(request: AssignLeadRequest): Promise<LeadResponse> {
    const response = await leadApi.assignLead(request);
    return response.data as LeadResponse;
  }

  getState() {
    return this.state;
  }

  reset() {
    this.setState(initialState);
  }
}

export const leadService = new LeadService();

export type LeadServiceApi = {
  createLead: (request: CreateLeadRequest) => Promise<LeadResponse>;
  assignLead: (request: AssignLeadRequest) => Promise<LeadResponse>;
};

export type { CreateLeadRequest, LeadResponse };
