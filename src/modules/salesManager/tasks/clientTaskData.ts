import { latestClientMeeting } from '../../../utils/clientHistorySelectors';
import { clientWorkFollowApi } from '../../../api/clientWorkFollow';
import { clientHistoryService, type ClientHistoryLoadResult, type ClientHistoryReadCycle } from '../../../services/ClientHistoryService';
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
  onPage?: (tasks: SalesTask[], progress: ClientTaskQueueProgress) => void;
  onClients?: (clients: ClientWorkFollowResponse[], progress: ClientTaskQueueProgress, startIndex: number) => void;
  onTaskUpdate?: (task: SalesTask) => void;
  onHistory?: (client: ClientWorkFollowResponse, index: number, history: ClientMeetingResponse[]) => void;
  onHistoryError?: (clientCode: string, error: unknown) => void;
  onProgress?: (progress: ClientTaskQueueProgress) => void;
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
    void clientHistoryService.loadManyProgressively(codes, cycle, current, (result: ClientHistoryLoadResult) => {
      if (!current()) return;
      historyPending = Math.max(0, historyPending - 1);
      if ('history' in result) {
        historyCompleted += 1;
        const source = clientsByCode.get(result.code);
        if (source) {
          onTaskUpdate?.(mapClientTaskWithHistory(source.client, source.index, result.history));
          onHistory?.(source.client, source.index, result.history);
        }
      } else {
        historyFailed += 1;
        const source = clientsByCode.get(result.code);
        if (source) {
          const cached = clientHistoryService.getSnapshot(result.code).history;
          onTaskUpdate?.({ ...mapClientTaskWithHistory(source.client, source.index, cached ?? []),
            ...(cached === undefined ? { remarks: 'Meeting history could not be loaded.', lastUpdated: 'Unavailable', nextFollowUpDate: 'Unavailable' } : {}),
            historyLoadState: 'error', verificationPending: true });
        }
        onHistoryError?.(result.code, result.error);
      }
      completedSinceProgress += 1;
      if (completedSinceProgress >= 20 || historyPending === 0) {
        completedSinceProgress = 0;
        reportProgress();
      }
    });
  };

  if (!current()) throw new Error('Client history account changed or load cancelled.');
  const firstPage = await clientWorkFollowApi.getQueue({ page: 0, size: 100 });
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
      let page: Awaited<ReturnType<typeof clientWorkFollowApi.getQueue>>;
      try {
        page = await clientWorkFollowApi.getQueue({ page: pageNumber, size: 100 });
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
