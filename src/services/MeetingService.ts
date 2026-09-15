import { meetingApi, MeetingApiError } from '../api/meeting';
import type { CreateMeetingRequest, MeetingQueueState, MeetingResponse, MeetingVerificationRequest, MeetingWorkflowRequest } from '../types/meeting';

type Listener = (state: MeetingQueueState) => void;
const initialState: MeetingQueueState = { meetings: [], timestamp: null, isLoading: false, error: null };
const toMessage = (error: unknown) => error instanceof MeetingApiError || error instanceof Error ? error.message : 'Meetings could not be loaded.';

export class MeetingService {
  private state = initialState;
  private listeners = new Set<Listener>();
  private submissions = new Set<string>();
  private hiddenTaskLeadKeys = new Set<string>();
  private workflowTimestamps = new Map<string, string>();
  private employeeCode: string | null = null;
  private requestGeneration = 0;

  private getLeadKeys(lead: { leadId?: number; leadCode?: string }) {
    return [
      lead.leadId !== undefined ? `id:${lead.leadId}` : '',
      lead.leadCode ? `code:${lead.leadCode}` : '',
    ].filter(Boolean);
  }

  private isHiddenTaskLead(lead: { leadId?: number; leadCode?: string }) {
    return this.getLeadKeys(lead).some((key) => this.hiddenTaskLeadKeys.has(key));
  }

  subscribe(listener: Listener) { this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); }; }
  getState() { return this.state; }
  private setState(next: Partial<MeetingQueueState>) { this.state = { ...this.state, ...next }; this.listeners.forEach((listener) => listener(this.state)); }

  async loadMeetings() {
    const generation = this.requestGeneration;
    const employeeCode = this.employeeCode;
    this.setState({ isLoading: true, error: null });
    try {
      const response = await meetingApi.getMeetings();
      const scopedMeetings = employeeCode === null
        ? response.data ?? []
        : (response.data ?? []).filter((meeting) => meeting.employeeCode === employeeCode);
      const meetings = await Promise.all(scopedMeetings.map(async (meeting) => {
        const meetingCode = meeting.meetingCode?.trim();
        if (!meetingCode) return meeting;
        try {
          const details = (await meetingApi.getMeeting(meetingCode)).data;
          const merged = details ? { ...meeting, ...details } : meeting;
          const workflowUpdatedAt = this.workflowTimestamps.get(meetingCode);
          return workflowUpdatedAt ? { ...merged, workflowUpdatedAt } : merged;
        }
        catch {
          const workflowUpdatedAt = this.workflowTimestamps.get(meetingCode);
          return workflowUpdatedAt ? { ...meeting, workflowUpdatedAt } : meeting;
        }
      }));
      if (generation !== this.requestGeneration) return;
      this.setState({ meetings: meetings.filter((meeting) => !this.isHiddenTaskLead(meeting)), timestamp: response.timestamp ?? null, error: null });
    } catch (error) {
      if (generation === this.requestGeneration) this.setState({ meetings: [], timestamp: null, error: toMessage(error) });
    }
    finally {
      if (generation === this.requestGeneration) this.setState({ isLoading: false });
    }
  }

  async resolveActiveMeetingCode(leadId: string) {
    const response = await meetingApi.getActiveMeeting(leadId);
    return response.data?.meetingCode?.trim() || null;
  }

  async getVerificationMeetings(status: 'PENDING' | 'VERIFIED') {
    return (await meetingApi.getByVerificationStatus(status)).data ?? [];
  }

  async getAllMeetingRecords() {
    return (await meetingApi.getMeetings()).data ?? [];
  }

  async verifyMeeting(meetingCode: string, request: MeetingVerificationRequest) {
    const code = meetingCode.trim();
    if (!code) throw new Error('Meeting code is unavailable.');
    return meetingApi.verify(code, request);
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
      const nextMeetingCode = response.data?.meetingCode?.trim();
      if (nextMeetingCode && response.timestamp) {
        this.workflowTimestamps.set(nextMeetingCode, response.timestamp);
      }
      await this.loadMeetings();
      return response.data
        ? { ...response.data, ...(response.timestamp ? { workflowUpdatedAt: response.timestamp } : {}) }
        : {};
    } catch (error) { throw new Error(toMessage(error)); }
    finally { this.submissions.delete(code); }
  }

  hideLeadFromTasks(lead: { leadId?: number; leadCode?: string }) {
    this.getLeadKeys(lead).forEach((key) => this.hiddenTaskLeadKeys.add(key));
    this.setState({ meetings: this.state.meetings.filter((meeting) => !this.isHiddenTaskLead(meeting)) });
  }

  setEmployeeScope(employeeCode: string | null) {
    this.employeeCode = employeeCode;
  }

  reset() {
    this.requestGeneration += 1;
    this.submissions.clear();
    this.hiddenTaskLeadKeys.clear();
    this.workflowTimestamps.clear();
    this.setState(initialState);
  }
}

export const meetingService = new MeetingService();
