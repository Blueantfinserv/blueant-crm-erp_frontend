import { meetingApi, MeetingApiError } from '../api/meeting';
import type { CreateMeetingRequest, MeetingQueueState, MeetingResponse, MeetingWorkflowRequest } from '../types/meeting';

type Listener = (state: MeetingQueueState) => void;
const initialState: MeetingQueueState = { meetings: [], timestamp: null, isLoading: false, error: null };
const toMessage = (error: unknown) => error instanceof MeetingApiError || error instanceof Error ? error.message : 'Meetings could not be loaded.';

export class MeetingService {
  private state = initialState;
  private listeners = new Set<Listener>();
  private submissions = new Set<string>();

  subscribe(listener: Listener) { this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); }; }
  getState() { return this.state; }
  private setState(next: Partial<MeetingQueueState>) { this.state = { ...this.state, ...next }; this.listeners.forEach((listener) => listener(this.state)); }

  async loadMeetings() {
    this.setState({ isLoading: true, error: null });
    try {
      const response = await meetingApi.getMeetings();
      const meetings = await Promise.all((response.data ?? []).map(async (meeting) => {
        const meetingCode = meeting.meetingCode?.trim();
        if (!meetingCode) return meeting;
        try {
          const details = (await meetingApi.getMeeting(meetingCode)).data;
          return details ? { ...meeting, ...details } : meeting;
        }
        catch { return meeting; }
      }));
      this.setState({ meetings, timestamp: response.timestamp ?? null, error: null });
    } catch (error) { this.setState({ meetings: [], timestamp: null, error: toMessage(error) }); }
    finally { this.setState({ isLoading: false }); }
  }

  async resolveActiveMeetingCode(leadId: string) {
    const response = await meetingApi.getActiveMeeting(leadId);
    return response.data?.meetingCode?.trim() || null;
  }

  async createMeeting(request: CreateMeetingRequest) {
    const response = await meetingApi.createMeeting(request);
    const meetingCode = response.data?.meetingCode?.trim();
    if (!meetingCode) throw new Error('Meeting creation did not return a meeting code.');
    return meetingCode;
  }

  async submitWorkflow(meetingCode: string, request: MeetingWorkflowRequest): Promise<MeetingResponse> {
    const code = meetingCode.trim();
    if (!code) throw new Error('No active meeting is available for this lead.');
    if (this.submissions.has(code)) throw new Error('This meeting submission is already in progress.');
    this.submissions.add(code);
    try {
      const response = await meetingApi.submitWorkflowUpdate(code, request);
      await this.loadMeetings();
      return response.data ?? {};
    } catch (error) { throw new Error(toMessage(error)); }
    finally { this.submissions.delete(code); }
  }
}

export const meetingService = new MeetingService();
