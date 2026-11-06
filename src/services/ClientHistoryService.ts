import { subscribeClientMeetingChanges } from '../utils/clientMeetingChanges';
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
export type ClientHistoryReadCycle = { scope: number; boundary: number; claimed?: boolean };
export type ClientHistoryOptions = { concurrency?: number; retries?: number; retryBaseMs?: number; random?: () => number };
export type ClientHistoryLoadResult =
  | { code: string; history: ClientMeetingResponse[] }
  | { code: string; error: unknown };

type Entry = {
  snapshot: ClientHistorySnapshot;
  revision: number;
  flight?: Promise<ClientMeetingResponse[]>;
  queued?: Promise<ClientMeetingResponse[]>;
  readSerial?: number;
  completedSerial?: number;
  consumers?: Set<() => boolean>;
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
  private serial = 0;
  private activeRequests = 0;
  private waiting: Array<() => void> = [];
  private cooldownUntil = 0;
  readonly concurrency: number;
  private retries: number;
  private retryBaseMs: number;
  private random: () => number;
  private invalidationListeners = new Set<(code: string, history: ClientMeetingResponse[]) => void>();
  constructor(private fetchHistory: (code: string) => Promise<ClientMeetingResponse[]>, options: ClientHistoryOptions = {}) {
    this.random = options.random ?? Math.random;
    this.concurrency = Number.isFinite(options.concurrency) ? Math.max(1, Math.floor(options.concurrency!)) : 6;
    this.retries = Number.isFinite(options.retries) ? Math.max(0, Math.floor(options.retries!)) : 2;
    this.retryBaseMs = Number.isFinite(options.retryBaseMs) ? Math.max(0, options.retryBaseMs!) : 500;
  }

  createReadCycle(): ClientHistoryReadCycle { return { scope: this.captureScope(), boundary: ++this.serial }; }

  claimReadCycle(cycle?: ClientHistoryReadCycle): ClientHistoryReadCycle {
    if (cycle && !cycle.claimed && this.isCurrentScope(cycle.scope)) { cycle.claimed = true; return cycle; }
    return this.createReadCycle();
  }

  // Only a read started in/after this cycle may satisfy it. This is not a TTL cache.
  async refreshForCycle(code: string, cycle: ClientHistoryReadCycle, valid: () => boolean = () => true): Promise<ClientMeetingResponse[]> {
    const check = () => this.isCurrentScope(cycle.scope) && valid();
    if (!check()) throw new Error('Client history load was cancelled.');
    const entry = this.entry(code);
    if (entry.mutations) {
      await entry.mutationDone;
      return this.refreshForCycle(code, cycle, valid);
    }
    if (entry.flight) {
      if ((entry.readSerial ?? -1) >= cycle.boundary && entry.snapshot.loading) {
        entry.consumers?.add(check);
        return entry.flight;
      }
      await entry.flight.catch(() => undefined);
      return this.refreshForCycle(code, cycle, valid);
    }
    if (!entry.snapshot.stale && entry.snapshot.history !== undefined && (entry.completedSerial ?? -1) >= cycle.boundary) return entry.snapshot.history;
    return this.refresh(code, false, check);
  }

  // Bounded workers deduplicate requested codes, while callers retain all original records.
  async loadMany(codes: readonly string[], cycle: ClientHistoryReadCycle, valid: () => boolean = () => true) {
    const unique = [...new Set(codes.filter(Boolean))];
    const histories = new Map<string, ClientMeetingResponse[]>();
    let index = 0;
    let failure: unknown;
    let failed = false;
    const worker = async () => {
      while (!failed && index < unique.length) {
        if (!valid() || !this.isCurrentScope(cycle.scope)) { failed = true; failure = new Error('Client history load was cancelled.'); break; }
        const code = unique[index++];
        try { histories.set(code, await this.refreshForCycle(code, cycle, () => !failed && valid())); }
        catch (error) { failed = true; failure = error; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, unique.length) }, worker));
    if (failed) throw failure;
    return histories;
  }

  async loadManyProgressively(
    codes: readonly string[],
    cycle: ClientHistoryReadCycle,
    valid: () => boolean,
    onResult: (result: ClientHistoryLoadResult) => void,
  ) {
    const unique = [...new Set(codes.filter(Boolean))];
    let index = 0;
    const worker = async () => {
      while (index < unique.length && valid() && this.isCurrentScope(cycle.scope)) {
        const code = unique[index++];
        try {
          const history = await this.refreshForCycle(code, cycle, valid);
          if (valid() && this.isCurrentScope(cycle.scope)) onResult({ code, history });
        } catch (error) {
          if (!valid() || !this.isCurrentScope(cycle.scope)) return;
          onResult({ code, error });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, unique.length) }, worker));
  }

  private request<T>(operation: () => Promise<T>, valid: () => boolean): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        if (!valid()) { reject(new Error('Client history request was superseded.')); this.waiting.shift()?.(); return; }
        this.activeRequests++;
        void (async () => {
          for (let attempt = 0; ; attempt++) {
            while (this.cooldownUntil > Date.now()) {
              if (!valid()) throw new Error('Client history request was superseded.');
              await new Promise(resolve => setTimeout(resolve, Math.min(1000, this.cooldownUntil - Date.now())));
            }
            if (!valid()) throw new Error('Client history request was superseded.');
            try { return await operation(); }
            catch (error) {
              const cause = error as { status?: number; retryAfterMs?: number; transientNetwork?: boolean } | null;
              const retryable = cause?.status === 429 || cause?.transientNetwork === true || [502, 503, 504].includes(cause?.status ?? 0);
              if (!retryable || !valid()) throw error;
              const exponential = this.retryBaseMs * 2 ** attempt;
              const jitter = exponential * 0.25 * Math.max(0, Math.min(1, this.random()));
              const delay = Math.max(cause?.retryAfterMs ?? 0, exponential + jitter);
              this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delay);
              if (attempt >= this.retries) throw error;
            }
          }
        })().then(resolve, reject).finally(() => { this.activeRequests--; this.waiting.shift()?.(); });
      };
      if (this.activeRequests < this.concurrency) start(); else this.waiting.push(start);
    });
  }

  subscribeInvalidatedHistory(listener: (code: string, history: ClientMeetingResponse[]) => void) {
    this.invalidationListeners.add(listener);
    return () => { this.invalidationListeners.delete(listener); };
  }
  invalidateAndRefresh(code: string) {
    const entry = this.entries.get(code);
    // Never fetch an unrelated/unloaded client. Local submissions already own their mutation gate.
    if (!this.account || !entry || entry.mutations) return;
    const scope = this.epoch;
    entry.revision++;
    entry.snapshot = { ...entry.snapshot, loading: false, stale: true };
    this.emit();
    void this.refresh(code, true).then(history => {
      if (this.isCurrentScope(scope) && !entry.snapshot.stale && entry.snapshot.history === history) this.invalidationListeners.forEach(listener => listener(code, history));
    }).catch(() => undefined);
  }

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

  refresh(code: string, fresh = false, valid: () => boolean = () => true): Promise<ClientMeetingResponse[]> {
    if (!this.account) return Promise.reject(new Error('Client history account is unavailable.'));
    if (!valid()) return Promise.reject(new Error('Client history load was cancelled.'));
    const epoch = this.epoch;
    const entry = this.entry(code);
    if (entry.mutations) return entry.mutationDone!.then(() => {
      if (!this.isCurrentScope(epoch)) throw new Error('Client history account changed.');
      return this.refresh(code, fresh, valid);
    });
    if (entry.flight) {
      entry.consumers?.add(valid);
      if (!fresh && !entry.snapshot.stale) return entry.flight;
      // Normal background reads join a current read; an invalidated read must finish
      // before a new one starts. Explicit manual/initial reads queue a fresh request.
      if (!fresh && entry.snapshot.loading) return entry.flight;
      if (!entry.queued) {
        const queued = entry.flight.catch(() => undefined).then(() => {
          if (!this.isCurrentScope(epoch)) throw new Error('Client history account changed.');
          return this.refresh(code, false, valid);
        }).finally(() => { if (entry.queued === queued) entry.queued = undefined; });
        entry.queued = queued;
      }
      return entry.queued;
    }
    const revision = ++entry.revision;
    const readSerial = ++this.serial;
    entry.readSerial = readSerial;
    const consumers = new Set([valid]);
    entry.consumers = consumers;
    entry.snapshot = { ...entry.snapshot, loading: true, error: null, stale: true };
    const current = () => this.isCurrentScope(epoch) && entry.revision === revision;
    const flight = Promise.resolve().then(() => {
      if (!current()) throw new Error('Client history request was superseded.');
      return this.request(() => this.fetchHistory(code), () => current() && [...consumers].some(check => check()));
    }).then(history => {
      if (!current()) throw new Error('Client history request was superseded.');
      entry.snapshot = { history, loading: false, error: null, stale: false };
      entry.completedSerial = readSerial;
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

export const clientHistoryService = new ClientHistoryService(code => clientMeetingApi.getByClientCode(code), { concurrency: 50 });
// Account changes are observed synchronously; old responses cannot enter a new session.
authService.subscribe(state => {
  const user = state.user;
  const enabled = state.isAuthenticated && user &&
    (user.role === 'RELATIONSHIP_MANAGER' || user.role === 'SALES_COORDINATOR');
  clientHistoryService.setAccount(enabled ? `${user.role}:${user.id}:${user.employeeId ?? ''}` : null);
});

subscribeClientMeetingChanges(code => clientHistoryService.invalidateAndRefresh(code));
