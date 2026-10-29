import { useEffect, useMemo, useState } from 'react';
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

export function useSalesManagerTasks({ initialTaskType = 'Today', allTaskMode = false, taskToDoMode = false, todaysTaskMode = false, pendingTaskMode = false, future3DaysTaskMode = false, allLeadsMode = false }: SalesManagerTasksProps) {
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
  const tasks = useMemo(
    () => {
      const actionableMeetings = getActionableTaskMeetings(meetingState.meetings, leadState.leads);
      const meetingHistory = Array.from(
        new Map(
          [
            ...meetingState.meetings,
            ...meetingService.getPendingVerificationMeetings(),
            ...meetingService.getVerifiedMeetings(),
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
        const lead = leadState.leads.find((candidate) => (
          (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)
          || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)
        ));
        const locationMeeting = meetingState.meetings
          .filter((candidate) => (
            Number.isFinite(candidate.latitude)
            && Number.isFinite(candidate.longitude)
            && (
              (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)
              || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)
            )
          ))
          .sort((a, b) => (
            b.workflowUpdatedAt ?? b.updatedAt ?? b.lastModifiedDate ?? b.meetingDate ?? ''
          ).localeCompare(
            a.workflowUpdatedAt ?? a.updatedAt ?? a.lastModifiedDate ?? a.meetingDate ?? ''
          ))[0];
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
      const leadTasks = leadState.leads
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
      return [...leadTasks, ...meetingTasks];
    },
    [leadState.leads, meetingState.meetings],
  );
  const allLeadTasks = useMemo(
    () => leadState.leads
      .filter((lead) => !isHiddenCompletedLead(lead.leadStatus))
      .filter((lead) => !isRemovedLead(lead.leadStatus))
      .map((lead, index) => mapLeadToSalesTask(lead, index)),
    [leadState.leads],
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
    ...meetingFilterOptions.filter((option) => option !== 'All Meetings'),
  ], [meetingFilterOptions]);
  useEffect(() => {
    const unsubscribe = leadSearchService.subscribe(setLeadState);
    void leadSearchService.loadLeads();
    return unsubscribe;
  }, []);

  const refreshTasks = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([leadSearchService.loadLeads(), meetingService.loadMeetings()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = meetingService.subscribe(setMeetingState);
    void meetingService.loadMeetings();
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

  return { search, setSearch, taskType, setTaskType, taskStage, setTaskStage, leadFilter, setLeadFilter, meetingFilter, setMeetingFilter, allTaskFilter, setAllTaskFilter, futureDayFilter, setFutureDayFilter, openDropdown, setOpenDropdown, searchFocused, setSearchFocused, isRefreshing, leadState, meetingState, meetingFilterOptions, allTaskFilterOptions, refreshTasks, getLeadFilterCount, getMeetingFilterCount, filteredTasks };
}
