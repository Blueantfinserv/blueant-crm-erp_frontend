import { clientMeetingApi } from '../api/clientMeeting';
import { authService } from './AuthService';
import type { ClientMeetingResponse } from '../types/crm';

export const hasPendingClientVerification = (history: readonly ClientMeetingResponse[]) =>
  history.some(meeting => meeting.verificationStatus === 'PENDING' || meeting.verifiedByPc === false);

export type ClientHistorySnapshot = {
  history?: ClientMeetingResponse[];
  loading: boolean;
  error: string | null;
  stale: boolean;
};
const emptySnapshot: ClientHistorySnapshot = { loading: false, error: null, stale: true };
type Entry = {
  snapshot: ClientHistorySnapshot;
  revision: number;
  flight?: Promise<ClientMeetingResponse[]>;
  queued?: Promise<ClientMeetingResponse[]>;
  mutations: number;
  mutationDone?: Promise<void>;
  finishMutation?: () => void;
};

// Raw history only. Task mapping and classification remain owned by their callers.
export class ClientHistoryService {
  private account: string | null = null;
  private epoch = 0;
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  constructor(private fetchHistory: (code: string) => Promise<ClientMeetingResponse[]>) {}

  setAccount(account: string | null) {
    if (account === this.account) return;
    this.account = account;
    this.epoch += 1;
    this.entries.forEach(entry => entry.finishMutation?.());
    this.entries.clear();
    this.emit();
  }
  captureScope() {
    if (!this.account) throw new Error('Client history account is unavailable.');
    return this.epoch;
  }
  isCurrentScope(epoch: number) { return this.account !== null && epoch === this.epoch; }
  getSnapshot(code: string): ClientHistorySnapshot { return this.entries.get(code)?.snapshot ?? emptySnapshot; }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private emit() { this.listeners.forEach(listener => listener()); }
  private entry(code: string) {
    let entry = this.entries.get(code);
    if (!entry) {
      entry = { snapshot: emptySnapshot, revision: 0, mutations: 0 };
      this.entries.set(code, entry);
    }
    return entry;
  }

  refresh(code: string, fresh = false): Promise<ClientMeetingResponse[]> {
    if (!this.account) return Promise.reject(new Error('Client history account is unavailable.'));
    const epoch = this.epoch;
    const entry = this.entry(code);
    if (entry.mutations) return entry.mutationDone!.then(() => {
      if (!this.isCurrentScope(epoch)) throw new Error('Client history account changed.');
      return this.refresh(code, fresh);
    });
    if (entry.flight) {
      if (!fresh && !entry.snapshot.stale) return entry.flight;
      // Normal background reads join a current read; an invalidated read must finish
      // before a new one starts. Explicit manual/initial reads queue a fresh request.
      if (!fresh && entry.snapshot.loading) return entry.flight;
      if (!entry.queued) {
        const queued = entry.flight.catch(() => undefined).then(() => {
          if (!this.isCurrentScope(epoch)) throw new Error('Client history account changed.');
          return this.refresh(code);
        }).finally(() => { if (entry.queued === queued) entry.queued = undefined; });
        entry.queued = queued;
      }
      return entry.queued;
    }
    const revision = ++entry.revision;
    entry.snapshot = { ...entry.snapshot, loading: true, error: null, stale: true };
    const current = () => this.isCurrentScope(epoch) && entry.revision === revision;
    const flight = Promise.resolve().then(() => {
      if (!current()) throw new Error('Client history request was superseded.');
      return this.fetchHistory(code);
    }).then(history => {
      if (!current()) throw new Error('Client history request was superseded.');
      entry.snapshot = { history, loading: false, error: null, stale: false };
      return history;
    }).catch(error => {
      if (current()) entry.snapshot = { ...entry.snapshot, loading: false, stale: true,
        error: error instanceof Error ? error.message : 'Client history could not be refreshed.' };
      throw error;
    }).finally(() => {
      if (entry.flight === flight) entry.flight = undefined;
      if (this.isCurrentScope(epoch)) this.emit();
    });
    entry.flight = flight;
    this.emit();
    return flight;
  }

  // Invalidate pre-submission reads and pause new reads until the write completes.
  beginMutation(code: string) {
    const epoch = this.captureScope();
    const entry = this.entry(code);
    entry.revision += 1;
    entry.snapshot = { ...entry.snapshot, loading: false, stale: true };
    if (entry.mutations++ === 0) entry.mutationDone = new Promise(resolve => { entry.finishMutation = resolve; });
    this.emit();
    let finished = false;
    return () => {
      if (finished || !this.isCurrentScope(epoch)) return false;
      finished = true;
      if (--entry.mutations === 0) { entry.finishMutation?.(); entry.finishMutation = undefined; }
      this.emit();
      return true;
    };
  }
}

export const clientHistoryService = new ClientHistoryService(code => clientMeetingApi.getByClientCode(code));
// Account changes are observed synchronously; old responses cannot enter a new session.
authService.subscribe(state => {
  const user = state.user;
  const enabled = state.isAuthenticated && user &&
    (user.role === 'RELATIONSHIP_MANAGER' || user.role === 'SALES_COORDINATOR');
  clientHistoryService.setAccount(enabled ? `${user.role}:${user.id}:${user.employeeId ?? ''}` : null);
});
