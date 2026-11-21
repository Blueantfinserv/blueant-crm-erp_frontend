import { latestClientMeeting } from '../../../utils/clientHistorySelectors';
import { clientWorkFollowApi } from '../../../api/clientWorkFollow';
import { clientHistoryService, type ClientHistoryReadCycle } from '../../../services/ClientHistoryService';
import type { ClientMeetingResponse, ClientWorkFollowResponse } from '../../../types/crm';
import type { SalesTask } from './types/tasks';
import { mapClientToSalesTask } from './taskMappers';
import { formatDate, formatTimestamp } from './taskDateUtils';
import { getTaskSchedule } from './taskMeetingSelectors';

export type ClientTaskQueueProgress = {
  loadedClients: number;
  totalClients: number | null;
  loadedPages: number;
  totalPages: number;
  queueComplete: boolean;
  historyPending: number;
  historyCompleted: number;
  historyFailed: number;
};

type ClientTaskQueueOptions = {
  valid?: () => boolean;
  cycle?: ClientHistoryReadCycle;
  forceRefresh?: boolean;
  onPage?: (tasks: SalesTask[], progress: ClientTaskQueueProgress) => void;
  onClients?: (clients: ClientWorkFollowResponse[], progress: ClientTaskQueueProgress, startIndex: number) => void;
  onTaskUpdate?: (task: SalesTask) => void;
  onHistory?: (client: ClientWorkFollowResponse, index: number, history: ClientMeetingResponse[]) => void;
  onHistoryError?: (clientCode: string, error: unknown) => void;
  onProgress?: (progress: ClientTaskQueueProgress) => void;
};

type ClientWorkFollowPage = Awaited<ReturnType<typeof clientWorkFollowApi.getQueue>>;
type QueuePageFlight = { promise: Promise<ClientWorkFollowPage>; forced: boolean };
let queueCacheScope: number | null = null;
let queuePageCache = new Map<number, ClientWorkFollowPage>();
let queuePageFlights = new Map<number, QueuePageFlight>();

const clearClientTaskQueueCache = () => {
  queueCacheScope = null;
  queuePageCache = new Map();
  queuePageFlights = new Map();
};

clientHistoryService.subscribeAccountChange(clearClientTaskQueueCache);

const fetchQueuePage = (page: number, scope: number): Promise<ClientWorkFollowPage> =>
  clientWorkFollowApi.getQueue({ page, size: 100 }).then(response => {
    if (!clientHistoryService.isCurrentScope(scope)) throw new Error('Client history account changed or load cancelled.');
    queuePageCache.set(page, response);
    return response;
  });

const getQueuePage = (page: number, scope: number, force: boolean): Promise<ClientWorkFollowPage> => {
  if (queueCacheScope !== scope) {
    queueCacheScope = scope;
    queuePageCache = new Map();
    queuePageFlights = new Map();
  }
  if (!force) {
    const cached = queuePageCache.get(page);
    if (cached) return Promise.resolve(cached);
  }
  const existing = queuePageFlights.get(page);
  if (existing) {
    if (!force || existing.forced) return existing.promise;
    const promise = existing.promise.catch(() => undefined).then(() => fetchQueuePage(page, scope));
    const flight = { promise, forced: true };
    queuePageFlights.set(page, flight);
    void promise.finally(() => {
      if (queuePageFlights.get(page) === flight) queuePageFlights.delete(page);
    }).catch(() => undefined);
    return promise;
  }
  const promise = fetchQueuePage(page, scope);
  const flight = { promise, forced: force };
  queuePageFlights.set(page, flight);
  void promise.finally(() => {
    if (queuePageFlights.get(page) === flight) queuePageFlights.delete(page);
  }).catch(() => undefined);
  return promise;
};

const clientIdentity = (client: ClientWorkFollowResponse) => {
  const code = client.clientCode?.trim();
  return code ? `code:${code}` : client.clientId !== undefined ? `id:${client.clientId}` : null;
};

export const mapClientTaskWithHistory = (
  client: ClientWorkFollowResponse,
  index: number,
  meetings: readonly ClientMeetingResponse[],
): SalesTask => {
  const task = mapClientToSalesTask(client, index);
  const latest = latestClientMeeting(meetings);
  const nextPlanDate = latest?.nextPlanDate ?? task.nextPlanDate;
  const scheduledAt = nextPlanDate ?? task.scheduledAt;
  return {
    ...task,
    meetingNumber: latest?.meetingNumber ?? task.meetingNumber,
    remarks: latest?.remarks?.trim() || task.remarks,
    lastUpdated: formatTimestamp(latest?.meetingDate ?? task.assignedAt),
    nextPlanDate,
    nextFollowUpDate: formatDate(nextPlanDate),
    scheduledAt,
    schedule: getTaskSchedule(scheduledAt),
    verificationPending: meetings.some(meeting => meeting.verificationStatus === 'PENDING' || meeting.verifiedByPc === false),
  };
};

// Basic client cards are published page-by-page; bounded history reads enrich each card independently.
export async function loadClientTaskQueue({
  valid = () => true,
  cycle: requestedCycle,
  forceRefresh = false,
  onPage,
  onClients,
  onTaskUpdate,
  onHistory,
  onHistoryError,
  onProgress,
}: ClientTaskQueueOptions = {}) {
  const cycle = clientHistoryService.claimReadCycle(requestedCycle);
  const scope = clientHistoryService.captureScope();
  const current = () => valid() && clientHistoryService.isCurrentScope(scope);
  if (!current()) throw new Error('Client history account changed or load cancelled.');

  const loaded: SalesTask[] = [];
  const seenClients = new Set<string>();
  const historyRequests = new Set<string>();
  const historyQueue: Array<{ code: string; client: ClientWorkFollowResponse; index: number }> = [];
  let historyWorkers = 0;
  let loadedClients = 0;
  let historyPending = 0;
  let historyCompleted = 0;
  let historyFailed = 0;
  let completedSinceProgress = 0;
  let totalClients: number | null = null;
  let totalPages = 1;
  const progress = (): ClientTaskQueueProgress => ({
    loadedClients, totalClients, loadedPages: Math.min(totalPages, loadedPages), totalPages,
    queueComplete: loadedPages >= totalPages, historyPending, historyCompleted, historyFailed,
  });
  let loadedPages = 0;
  const reportProgress = () => onProgress?.(progress());
  const runHistoryWorkers = async () => {
    historyWorkers += 1;
    try {
      while (historyQueue.length && current()) {
        const job = historyQueue.shift()!;
        try {
          const cachedHistory = clientHistoryService.getSnapshot(job.code);
          const history = !forceRefresh && !cachedHistory.stale && cachedHistory.history !== undefined
            ? cachedHistory.history
            : forceRefresh
              ? await clientHistoryService.refreshForCycle(job.code, cycle, current)
              : await clientHistoryService.refresh(job.code, false, current);
          if (!current()) continue;
          historyPending = Math.max(0, historyPending - 1);
          historyCompleted += 1;
          onTaskUpdate?.(mapClientTaskWithHistory(job.client, job.index, history));
          onHistory?.(job.client, job.index, history);
        } catch (error) {
          if (!current()) continue;
          historyPending = Math.max(0, historyPending - 1);
          historyFailed += 1;
          const cached = clientHistoryService.getSnapshot(job.code).history;
          onTaskUpdate?.({ ...mapClientTaskWithHistory(job.client, job.index, cached ?? []),
            ...(cached === undefined ? { remarks: 'Meeting history could not be loaded.', lastUpdated: 'Unavailable', nextFollowUpDate: 'Unavailable' } : {}),
            historyLoadState: 'error', verificationPending: true });
          onHistoryError?.(job.code, error);
        }
        completedSinceProgress += 1;
        if (completedSinceProgress >= 20 || historyPending === 0) {
          completedSinceProgress = 0;
          reportProgress();
        }
      }
    } finally {
      historyWorkers -= 1;
      while (historyWorkers < 6 && historyQueue.length && current()) void runHistoryWorkers();
    }
  };
  const scheduleHistoryWorkers = () => {
    while (historyWorkers < 6 && historyQueue.length && current()) void runHistoryWorkers();
  };
  const publishPage = (pageNumber: number, page: Awaited<ReturnType<typeof clientWorkFollowApi.getQueue>>) => {
    const pageClients = (page.content ?? []).filter(client => {
      const identity = clientIdentity(client);
      if (!identity) return true;
      if (seenClients.has(identity)) return false;
      seenClients.add(identity);
      return true;
    });
    const tasks = pageClients.map((client, offset): SalesTask => ({
      ...mapClientToSalesTask(client, loaded.length + offset),
      historyLoadState: client.clientCode?.trim() ? 'loading' : 'error', verificationPending: true,
      remarks: 'Loading meeting history...', lastUpdated: 'Loading...', nextFollowUpDate: 'Loading...',
    }));
    loaded.push(...tasks);
    loadedClients += tasks.length;
    historyFailed += tasks.filter(task => task.historyLoadState === 'error').length;
    loadedPages += 1;
    const clientsByCode = new Map<string, { client: ClientWorkFollowResponse; index: number }>();
    pageClients.forEach((client, offset) => {
      const code = client.clientCode?.trim();
      if (code && !historyRequests.has(code)) {
        historyRequests.add(code);
        clientsByCode.set(code, { client, index: loaded.length - tasks.length + offset });
      }
    });
    const codes = [...clientsByCode.keys()];
    historyPending += codes.length;
    const pageProgress = progress();
    onPage?.(tasks, pageProgress);
    onClients?.(pageClients, pageProgress, loaded.length - tasks.length);
    reportProgress();
    codes.forEach(code => {
      const source = clientsByCode.get(code);
      if (source) historyQueue.push({ code, ...source });
    });
    scheduleHistoryWorkers();
  };

  if (!current()) throw new Error('Client history account changed or load cancelled.');
  const firstPage = await getQueuePage(0, scope, forceRefresh);
  if (!current()) throw new Error('Client history account changed or load cancelled.');
  totalPages = Math.max(1, firstPage.totalPages ?? 1);
  totalClients = firstPage.totalElements ?? null;
  publishPage(0, firstPage);

  let nextPage = 1;
  let pageFailed = false;
  let firstPageError: unknown;
  const pendingPages = new Map<number, Awaited<ReturnType<typeof clientWorkFollowApi.getQueue>>>();
  const publishReadyPages = () => {
    while (pendingPages.has(loadedPages)) {
      const page = pendingPages.get(loadedPages)!;
      pendingPages.delete(loadedPages);
      publishPage(loadedPages, page);
    }
  };
  const worker = async () => {
    while (!pageFailed && nextPage < totalPages) {
      if (!current()) {
        pageFailed = true;
        firstPageError = new Error('Client history account changed or load cancelled.');
        return;
      }
      const pageNumber = nextPage++;
      let page: ClientWorkFollowPage;
      try {
        page = await getQueuePage(pageNumber, scope, forceRefresh);
      } catch (error) {
        pageFailed = true;
        firstPageError = error;
        return;
      }
      if (!current()) {
        pageFailed = true;
        firstPageError = new Error('Client history account changed or load cancelled.');
        return;
      }
      pendingPages.set(pageNumber, page);
      publishReadyPages();
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, Math.max(0, totalPages - 1)) }, worker));
  if (pageFailed) throw firstPageError;
  if (!current()) throw new Error('Client history account changed or load cancelled.');
  reportProgress();
  return loaded;
}
