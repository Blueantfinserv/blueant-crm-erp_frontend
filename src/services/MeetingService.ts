import { meetingApi } from '../api/meeting';
import type { MeetingQueueState, MeetingResponse, MeetingVerificationRequest, MeetingWorkflowRequest } from '../types/meeting';

type Listener = (state: MeetingQueueState) => void;
const initialState: MeetingQueueState = { meetings: [], timestamp: null, isLoading: false, error: null };
const toMessage = (error: unknown) => error instanceof Error ? error.message : 'Meetings could not be loaded.';

export class MeetingService {
  private state = initialState;
  private listeners = new Set<Listener>();
  private submissions = new Set<string>();
  private hiddenTaskLeadKeys = new Set<string>();
  private workflowTimestamps = new Map<string, string>();
  private pendingVerificationMeetings: MeetingResponse[] = [];
  private verifiedMeetings: MeetingResponse[] = [];
  private conductedMeetingSource: MeetingResponse[] = [];
  private employeeCode: string | null = null;
  private requestGeneration = 0;
  private inFlight: { cycle: symbol; promise: Promise<void> } | null = null;
  private scopeGeneration = 0;

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
  getPendingVerificationMeetings() { return this.pendingVerificationMeetings; }
  getVerifiedMeetings() { return this.verifiedMeetings; }
  getConductedMeetingSource() { return this.conductedMeetingSource; }
  private setState(next: Partial<MeetingQueueState>) { this.state = { ...this.state, ...next }; this.listeners.forEach((listener) => listener(this.state)); }

  // Only callers explicitly belonging to the same refresh cycle may share a request.
  // No token means a fresh read (manual refresh, mutation follow-up or other callers).
  loadMeetings(cycle: symbol = Symbol('fresh read')): Promise<void> {
    if (this.inFlight?.cycle === cycle) return this.inFlight.promise;
    const promise = this.fetchForRefreshCycle().finally(() => {
      if (this.inFlight?.promise === promise) this.inFlight = null;
    });
    this.inFlight = { cycle, promise };
    return promise;
  }

  private async fetchForRefreshCycle() {
    const generation = ++this.requestGeneration;
    const employeeCode = this.employeeCode;
    const normalizeMeetings = (records: MeetingResponse[], pendingVerificationCodes?: Set<string>, verificationReady = true) => {
      const scopedMeetings = employeeCode === null
        ? records
        : records.filter((meeting) => meeting.employeeCode === employeeCode);
      const seenMeetingCodes = new Set<string>();
      return scopedMeetings.filter((meeting) => {
        const meetingCode = meeting.meetingCode?.trim();
        if (!meetingCode) return true;
        if (seenMeetingCodes.has(meetingCode)) return false;
        seenMeetingCodes.add(meetingCode);
        return true;
      }).map((meeting) => {
        const meetingCode = meeting.meetingCode?.trim();
        const pending = Boolean(meetingCode && pendingVerificationCodes?.has(meetingCode));
        const withVerificationStatus = pending
          ? { ...meeting, verificationStatus: 'PENDING' as const }
          : !verificationReady && !meeting.verificationStatus
            ? { ...meeting, verificationStatus: 'PENDING' as const }
            : meeting;
        const workflowUpdatedAt = meetingCode ? this.workflowTimestamps.get(meetingCode) : undefined;
        return workflowUpdatedAt ? { ...withVerificationStatus, workflowUpdatedAt } : withVerificationStatus;
      }).filter((meeting) => !this.isHiddenTaskLead(meeting));
    };
    this.setState({ isLoading: true, error: null });
    try {
      const responsePromise = meetingApi.getMeetings();
      const pendingVerification = meetingApi.getByVerificationStatus('PENDING').catch(() => null);
      const verified = meetingApi.getByVerificationStatus('VERIFIED').catch(() => null);
      const response = await responsePromise;
      if (generation !== this.requestGeneration) return;
      this.conductedMeetingSource = response.data ?? [];
      const baseMeetings = normalizeMeetings(response.data ?? [], undefined, false);
      this.setState({ meetings: baseMeetings, timestamp: response.timestamp ?? null, error: null });
      const [pendingVerificationResponse, verifiedResponse] = await Promise.all([pendingVerification, verified]);
      const pendingVerificationCodes = new Set(
        (pendingVerificationResponse?.data ?? [])
          .map((meeting) => meeting.meetingCode?.trim())
          .filter((meetingCode): meetingCode is string => Boolean(meetingCode)),
      );
      const meetings = normalizeMeetings(response.data ?? [], pendingVerificationCodes);
      if (generation !== this.requestGeneration) return;
      this.pendingVerificationMeetings = pendingVerificationResponse?.data ?? [];
      this.verifiedMeetings = (verifiedResponse?.data ?? []).filter((meeting) => (
        employeeCode === null || meeting.employeeCode === employeeCode
      ));
      this.setState({ meetings: meetings.filter((meeting) => !this.isHiddenTaskLead(meeting)), timestamp: response.timestamp ?? null, error: null });
    } catch (error) {
      if (generation === this.requestGeneration) this.setState({ error: toMessage(error) });
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

  async submitWorkflow(meetingCode: string, request: MeetingWorkflowRequest): Promise<MeetingResponse> {
    const code = meetingCode.trim();
    if (!code) throw new Error('No active meeting is available for this prospect.');
    if (this.submissions.has(code)) throw new Error('This meeting submission is already in progress.');
    this.submissions.add(code);
    const scopeGeneration = this.scopeGeneration;
    try {
      const response = await meetingApi.submitWorkflowUpdate(code, request);
      // A submission from a previous account must not populate or refresh this account.
      if (scopeGeneration !== this.scopeGeneration) return response.data
        ? { ...response.data, ...(response.timestamp ? { workflowUpdatedAt: response.timestamp } : {}) }
        : {};
      const nextMeetingCode = response.data?.meetingCode?.trim();
      if (nextMeetingCode && response.timestamp) {
        this.workflowTimestamps.set(nextMeetingCode, response.timestamp);
      }
      await this.loadMeetings();
      return response.data
        ? { ...response.data, ...(response.timestamp ? { workflowUpdatedAt: response.timestamp } : {}) }
        : {};
    } catch (error) { throw new Error(toMessage(error)); }
    finally { if (scopeGeneration === this.scopeGeneration) this.submissions.delete(code); }
  }

  hideLeadFromTasks(lead: { leadId?: number; leadCode?: string }) {
    this.getLeadKeys(lead).forEach((key) => this.hiddenTaskLeadKeys.add(key));
    this.setState({ meetings: this.state.meetings.filter((meeting) => !this.isHiddenTaskLead(meeting)) });
  }

  setEmployeeScope(employeeCode: string | null) {
    if (this.employeeCode === employeeCode) return;
    this.employeeCode = employeeCode;
    this.reset();
  }

  reset() {
    this.requestGeneration += 1;
    this.inFlight = null;
    this.scopeGeneration += 1;
    this.submissions.clear();
    this.hiddenTaskLeadKeys.clear();
    this.workflowTimestamps.clear();
    this.conductedMeetingSource = [];
    this.pendingVerificationMeetings = [];
    this.verifiedMeetings = [];
    this.setState(initialState);
  }
}

export const meetingService = new MeetingService();
