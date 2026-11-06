import type { ClientWorkFollowResponse } from '../../../../types/crm';
import { selectLocationMeeting } from '../locationMeetingSelector';
import type { SalesTask } from '../types/tasks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { leadSearchService } from '../../../../services/LeadSearchService';
import { leadService } from '../../../../services/LeadService';
import { meetingService } from '../../../../services/MeetingService';
import type { LeadSearchState } from '../../../../types/lead';
import type { MeetingQueueState, MeetingResponse } from '../../../../types/meeting';
import type { SalesManagerTasksProps } from '../types/screen';
import type { TaskTypeFilter, TaskStageFilter } from '../mock/taskFilterOptions';
import { LEAD_FILTER_OPTIONS, type FutureDayFilter } from '../taskConstants';
import { calendarDateFromValue, todayCalendarDate } from '../taskDateUtils';
import { meetingTitleOrder, mapLeadToSalesTask, mapMeetingToSalesTask } from '../taskMappers';
import { getActionableTaskMeetings, isHiddenCompletedLead, isRemovedLead } from '../taskMeetingSelectors';
import { filterSalesTasks, getTaskFilterCounts } from '../taskFilters';
import type { ClientTaskQueueProgress } from '../clientTaskData';

export function useSalesManagerTasks({ active = true, historyCycle, includeClientTasks = false, initialTaskType = 'Today', allTaskMode = false, taskToDoMode = false, todaysTaskMode = false, pendingTaskMode = false, future3DaysTaskMode = false, allLeadsMode = false }: SalesManagerTasksProps) {
  const [search, setSearch] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeFilter>(initialTaskType);
  const [taskStage, setTaskStage] = useState<TaskStageFilter>('Meetings');
  const [leadFilter, setLeadFilter] = useState<typeof LEAD_FILTER_OPTIONS[number]>('All Prospects');
  const [meetingFilter, setMeetingFilter] = useState('All Meetings');
  const [allTaskFilter, setAllTaskFilter] = useState('All Task');
  const [futureDayFilter, setFutureDayFilter] = useState<FutureDayFilter>('Tomorrow');
  const [openDropdown, setOpenDropdown] = useState<'task' | 'lead' | 'meeting' | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leadState, setLeadState] = useState<LeadSearchState>(() => leadSearchService.getState());
  const [meetingState, setMeetingState] = useState<MeetingQueueState>(() => meetingService.getState());
  const [clientTasks, setClientTasks] = useState<SalesTask[]>([]);
  const [clientLoading, setClientLoading] = useState(includeClientTasks);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientProgress, setClientProgress] = useState<ClientTaskQueueProgress>({
    loadedClients: 0, totalClients: null, loadedPages: 0, totalPages: 0,
    queueComplete: false, historyPending: 0, historyCompleted: 0, historyFailed: 0,
  });
  const clientLoadId = useRef(0);
  const clientRuntime = useRef<{ store: typeof import('../../../../services/ClientHistoryService').clientHistoryService; map: typeof import('../clientTaskData').mapClientTaskWithHistory } | null>(null);
  const rawClients = useRef(new Map<string, { client: ClientWorkFollowResponse; index: number }>());
  const pendingClientUpdates = useRef(new Map<string, { task: SalesTask; loadId: number }>());
  const clientUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consumedHistoryCycle = useRef<typeof historyCycle>(undefined);
  const refreshSequence = useRef(0);
  const refreshRunning = useRef(false);
  const mountRefreshCycle = useRef(Symbol('task mount')).current;
  const flushClientUpdates = () => {
    if (clientUpdateTimer.current) clearTimeout(clientUpdateTimer.current);
    clientUpdateTimer.current = null;
    const updates = [...pendingClientUpdates.current.values()];
    pendingClientUpdates.current.clear();
    if (!updates.length) return;
    setClientTasks(current => {
      let next = current;
      updates.forEach(({ task, loadId }) => {
        if (loadId !== clientLoadId.current) return;
        const index = next.findIndex(existing => existing.id === task.id);
        if (index < 0) return;
        if (next === current) next = current.slice();
        next[index] = task;
      });
      return next;
    });
  };
  const queueClientUpdate = (task: SalesTask, loadId: number) => {
    pendingClientUpdates.current.set(task.id, { task, loadId });
    if (!clientUpdateTimer.current) clientUpdateTimer.current = setTimeout(flushClientUpdates, 40);
  };
  const loadClients = async () => {
    if (!includeClientTasks) return;
    const id = ++clientLoadId.current;
    pendingClientUpdates.current.clear();
    if (clientUpdateTimer.current) clearTimeout(clientUpdateTimer.current);
    clientUpdateTimer.current = null;
    rawClients.current.clear();
    setClientLoading(true);
    setClientError(null);
    setClientProgress({
      loadedClients: 0, totalClients: null, loadedPages: 0, totalPages: 0,
      queueComplete: false, historyPending: 0, historyCompleted: 0, historyFailed: 0,
    });
    try {
      const { loadClientTaskQueue, mapClientTaskWithHistory } = await import('../clientTaskData');
      const { clientHistoryService } = await import('../../../../services/ClientHistoryService');
      clientRuntime.current = { store: clientHistoryService, map: mapClientTaskWithHistory };
      if (id !== clientLoadId.current) return;
      const cycle = historyCycle && consumedHistoryCycle.current !== historyCycle ? historyCycle : undefined;
      consumedHistoryCycle.current = historyCycle;
      await loadClientTaskQueue({
        valid: () => id === clientLoadId.current,
        cycle,
        onPage: (records, progress) => {
          if (id !== clientLoadId.current) return;
          if (progress.loadedPages === 1) setClientTasks(records);
          else setClientTasks(current => {
            const identities = new Set(current.map(task => task.id));
            const additions = records.filter(task => !identities.has(task.id));
            return additions.length ? [...current, ...additions] : current;
          });
        },
        onClients: (clients, _progress, start) => { clients.forEach((client, index) => { if (client.clientCode) rawClients.current.set(client.clientCode, { client, index: start + index }); }); },
        onTaskUpdate: task => { if (id === clientLoadId.current) queueClientUpdate(task, id); },
        onProgress: progress => {
          if (id !== clientLoadId.current) return;
          setClientProgress(progress);
          if (progress.queueComplete) setClientLoading(false);
        },
      });
    } catch (error) {
      if (id === clientLoadId.current) setClientError(error instanceof Error ? error.message : 'Client tasks could not be loaded.');
    } finally {
      if (id === clientLoadId.current) {
        setClientLoading(false);
        flushClientUpdates();
      }
    }
  };
  useEffect(() => {
    if (includeClientTasks) void loadClients();
    else {
      setClientTasks([]);
      setClientLoading(false);
      setClientError(null);
      setClientProgress({
        loadedClients: 0, totalClients: null, loadedPages: 0, totalPages: 0,
        queueComplete: false, historyPending: 0, historyCompleted: 0, historyFailed: 0,
      });
    }
    return () => {
      clientLoadId.current += 1;
      if (clientUpdateTimer.current) clearTimeout(clientUpdateTimer.current);
      clientUpdateTimer.current = null;
      pendingClientUpdates.current.clear();
    };
  }, [includeClientTasks, historyCycle]);
  // Retain one complete calculation input while a visible RM/SC list refreshes.
  // Partial service/page completions must never publish partial counts or results.
  const complete = useRef<{
    leads: LeadSearchState['leads']; meetings: MeetingQueueState['meetings'];
    pending: MeetingResponse[]; verified: MeetingResponse[]; clients: SalesTask[];
  } | null>(null);
  const loading = clientTasks.some(task => task.historyLoadState === 'loading') || leadState.isLoading || meetingState.isLoading || clientLoading || clientProgress.historyPending > 0;
  const failed = Boolean(leadState.error || meetingState.error || clientError || clientProgress.historyFailed);
  if (includeClientTasks && clientProgress.queueComplete && !loading && !failed) complete.current = {
    leads: leadState.leads, meetings: meetingState.meetings,
    pending: meetingService.getPendingVerificationMeetings(), verified: meetingService.getVerifiedMeetings(), clients: clientTasks,
  };
  const source = includeClientTasks && complete.current ? complete.current : {
    leads: leadState.leads, meetings: meetingState.meetings,
    pending: meetingService.getPendingVerificationMeetings(), verified: meetingService.getVerifiedMeetings(), clients: clientTasks.filter(task => !task.historyLoadState),
  };
  useEffect(() => {
    if (!includeClientTasks) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void import('../../../../services/ClientHistoryService').then(({ clientHistoryService }) => {
      if (disposed) return;
      unsubscribe = clientHistoryService.subscribeInvalidatedHistory((code, history) => {
        const source = rawClients.current.get(code);
        const runtime = clientRuntime.current;
        if (!source || !runtime) return;
        const task = runtime.map(source.client, source.index, history);
        if (complete.current) complete.current = { ...complete.current, clients: complete.current.clients.map(old => old.id === task.id ? task : old) };
        queueClientUpdate(task, clientLoadId.current);
      });
    });
    return () => { disposed = true; unsubscribe?.(); };
  }, [includeClientTasks]);
  const tasks = useMemo(
    () => {
      const actionableMeetings = getActionableTaskMeetings(source.meetings, source.leads);
      const meetingHistory = Array.from(
        new Map(
          [
            ...source.meetings,
            ...source.pending,
            ...source.verified,
          ]
            .map((meeting) => [meeting.meetingCode ?? String(meeting.id ?? ''), meeting] as const)
            .filter(([meetingCode]) => Boolean(meetingCode)),
        ).values(),
      );
      const pendingVerificationLeadKeys = new Set(
        meetingHistory
          .filter((meeting) => meeting.verificationStatus === 'PENDING')
          .flatMap((meeting) => [
            meeting.leadId !== undefined ? `id:${meeting.leadId}` : '',
            meeting.leadCode ? `code:${meeting.leadCode}` : '',
          ])
          .filter(Boolean),
      );
      const pendingVerificationPhones = new Set(
        meetingHistory
          .filter((meeting) => meeting.verificationStatus === 'PENDING')
          .map((meeting) => meeting.mobileNumber?.replace(/\D/g, ''))
          .filter((phone): phone is string => Boolean(phone)),
      );
      const isSameMeetingLead = (left: MeetingResponse, right: MeetingResponse) => (
        (right.leadId !== undefined && left.leadId === right.leadId)
        || (Boolean(right.leadCode) && left.leadCode === right.leadCode)
        || Boolean(
          right.mobileNumber
          && left.mobileNumber
          && right.mobileNumber.replace(/\D/g, '') === left.mobileNumber.replace(/\D/g, ''),
        )
      );
      const hasPendingVerification = (leadId?: number, leadCode?: string, phone?: string) => (
        (leadId !== undefined && pendingVerificationLeadKeys.has(`id:${leadId}`))
        || Boolean(leadCode && pendingVerificationLeadKeys.has(`code:${leadCode}`))
        || Boolean(phone && pendingVerificationPhones.has(phone.replace(/\D/g, '')))
      );
      const meetingTasks = actionableMeetings.flatMap((meeting, index) => {
        const lead = source.leads.find((candidate) => (
          (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)
          || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)
        ));
        const locationMeeting = selectLocationMeeting(meeting, source.meetings);
        const lastMeetingDate = meetingHistory
          .filter((candidate) => (
            candidate.meetingCode !== meeting.meetingCode
            && calendarDateFromValue(candidate.meetingDate) <= todayCalendarDate()
            && isSameMeetingLead(candidate, meeting)
          ))
          .filter((candidate) => candidate.verificationStatus === 'VERIFIED' || Boolean(candidate.verifiedBy))
          .filter((candidate) => (
            meeting.meetingNumber === undefined
            || candidate.meetingNumber === undefined
            || candidate.meetingNumber < meeting.meetingNumber
          ))
          .sort((a, b) => String(b.meetingDate ?? '').localeCompare(String(a.meetingDate ?? '')))[0]
          ?.meetingDate;
        const task = mapMeetingToSalesTask(meeting, index, lead, locationMeeting, lastMeetingDate);
        return [{
          ...task,
          verificationPending: hasPendingVerification(task.leadId, task.leadCode, task.phone),
        }];
      });
      const meetingLeadKeys = new Set(meetingTasks.flatMap((task) => [
        task.leadCode ? `code:${task.leadCode}` : '',
        task.leadId !== undefined ? `id:${task.leadId}` : '',
      ]).filter(Boolean));
      const leadTasks = source.leads
        .filter((lead) => !isHiddenCompletedLead(lead.leadStatus))
        .filter((lead) => !isRemovedLead(lead.leadStatus))
        .filter((lead) => {
          const keys = [lead.leadCode ? `code:${lead.leadCode}` : '', lead.leadId !== undefined ? `id:${lead.leadId}` : ''].filter(Boolean);
          return keys.every((key) => !meetingLeadKeys.has(key));
        })
        .map((lead, index) => {
          const latestMeetingWithNextPlan = meetingHistory
            .filter((meeting) => Boolean(meeting.nextMeetingDate) && (
              (lead.leadId !== undefined && meeting.leadId === lead.leadId)
              || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
              || Boolean(lead.mobileNumber && meeting.mobileNumber && lead.mobileNumber.replace(/\D/g, '') === meeting.mobileNumber.replace(/\D/g, ''))
            ))
            .sort((left, right) => String(right.workflowUpdatedAt ?? right.updatedAt ?? right.lastModifiedDate ?? right.meetingDate ?? '').localeCompare(String(left.workflowUpdatedAt ?? left.updatedAt ?? left.lastModifiedDate ?? left.meetingDate ?? '')))[0];
          return {
            ...mapLeadToSalesTask(lead, index, latestMeetingWithNextPlan?.nextMeetingDate),
            verificationPending: hasPendingVerification(lead.leadId, lead.leadCode, lead.mobileNumber),
          };
        });
      return [...leadTasks, ...meetingTasks, ...(includeClientTasks ? source.clients : [])];
    },
    [source.leads, source.meetings, source.pending, source.verified, source.clients, includeClientTasks],
  );
  const allLeadTasks = useMemo(
    () => source.leads
      .filter((lead) => !isHiddenCompletedLead(lead.leadStatus))
      .filter((lead) => !isRemovedLead(lead.leadStatus))
      .map((lead, index) => mapLeadToSalesTask(lead, index)),
    [source.leads],
  );
  const meetingFilterOptions = useMemo(() => [
    'All Meetings',
    ...Array.from(new Set(
      tasks
        .filter((task) => task.taskKind === 'MEETING' && Boolean(task.meetingTitle))
        .map((task) => task.meetingTitle as string),
    )).sort((left, right) => {
      const numberDifference = meetingTitleOrder(left) - meetingTitleOrder(right);
      return Number.isNaN(numberDifference) || numberDifference === 0
        ? left.localeCompare(right)
        : numberDifference;
    }),
  ], [tasks]);
  const allTaskFilterOptions = useMemo(() => [
    'All Task',
    'Leads',
    ...(includeClientTasks ? ['Clients'] : []),
    ...meetingFilterOptions.filter((option) => option !== 'All Meetings'),
  ], [meetingFilterOptions, includeClientTasks]);
  useEffect(() => {
    const unsubscribe = leadSearchService.subscribe(setLeadState);
    void leadSearchService.loadLeads(mountRefreshCycle);
    return unsubscribe;
  }, []);

  const refreshTasks = async (newNavigation = false) => {
    if ((includeClientTasks ? refreshRunning.current && !newNavigation : isRefreshing)) return;
    refreshRunning.current = true;
    const sequence = ++refreshSequence.current;
    setIsRefreshing(true);
    try {
      await Promise.all([leadSearchService.loadLeads(), meetingService.loadMeetings(), loadClients()]);
    } finally {
      if (sequence === refreshSequence.current) { refreshRunning.current = false; setIsRefreshing(false); }
    }
  };

  const wasActive = useRef(active);
  useEffect(() => {
    if (includeClientTasks && active && !wasActive.current) void refreshTasks(true);
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    const unsubscribe = meetingService.subscribe(setMeetingState);
    void meetingService.loadMeetings(mountRefreshCycle);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let createdLead = leadService.getState().createdLead;
    return leadService.subscribe((state) => {
      if (state.createdLead && state.createdLead !== createdLead) {
        createdLead = state.createdLead;
        void leadSearchService.loadLeads();
      }
    });
  }, []);

  useEffect(() => {
    if (!meetingFilterOptions.includes(meetingFilter)) {
      setMeetingFilter('All Meetings');
    }
  }, [meetingFilter, meetingFilterOptions]);

  useEffect(() => {
    if (!allTaskFilterOptions.includes(allTaskFilter)) {
      setAllTaskFilter('All Task');
    }
  }, [allTaskFilter, allTaskFilterOptions]);

  const filterCounts = useMemo(() => getTaskFilterCounts(tasks, search, taskType), [search, taskType, tasks]);

  const getLeadFilterCount = (option: typeof LEAD_FILTER_OPTIONS[number]) => (
    option === 'All Prospects' ? filterCounts.activeLeads : filterCounts.removedLeads
  );
  const getMeetingFilterCount = (option: string) => (
    option === 'All Meetings' ? filterCounts.meetings : (filterCounts.meetingsByTitle[option] ?? 0)
  );

  const filteredTasks = useMemo(() => filterSalesTasks({ allLeadTasks, allLeadsMode, allTaskFilter, allTaskMode, future3DaysTaskMode, futureDayFilter, leadFilter, meetingFilter, pendingTaskMode, search, taskStage, taskToDoMode, taskType, tasks, todaysTaskMode }), [allLeadTasks, allLeadsMode, allTaskFilter, allTaskMode, future3DaysTaskMode, futureDayFilter, leadFilter, meetingFilter, pendingTaskMode, search, taskStage, taskToDoMode, taskType, tasks, todaysTaskMode]);

  const hasCompleteData = includeClientTasks && complete.current !== null;
  const taskDataComplete = hasCompleteData && !loading && !failed && clientProgress.queueComplete;
  return { hasCompleteData, taskDataComplete, clientLoading, clientError, clientProgress, search, setSearch, taskType, setTaskType, taskStage, setTaskStage, leadFilter, setLeadFilter, meetingFilter, setMeetingFilter, allTaskFilter, setAllTaskFilter, futureDayFilter, setFutureDayFilter, openDropdown, setOpenDropdown, searchFocused, setSearchFocused, isRefreshing, leadState, meetingState, meetingFilterOptions, allTaskFilterOptions, refreshTasks, getLeadFilterCount, getMeetingFilterCount, filteredTasks };
}
