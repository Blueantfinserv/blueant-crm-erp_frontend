import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import {
  TaskTypeFilter,
} from './mock/taskFilterOptions';
import { SalesTaskCard } from './components/SalesTaskCard';
import type { SalesTask } from './types/tasks';
import { leadSearchService } from '../../../services/LeadSearchService';
import { leadService } from '../../../services/LeadService';
import type { LeadResponse, LeadSearchState } from '../../../types/lead';
import { meetingService } from '../../../services/MeetingService';
import type { MeetingQueueState, MeetingResponse } from '../../../types/meeting';
import { getActionableTaskMeetings, getTaskSchedule, isHiddenCompletedLead, isRemovedLead } from './taskMeetingSelectors';

const parseBackendCalendarDate = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const SERVICE_REQUEST_FORM_URL = 'https://docs.google.com/forms/d/14H3qkLVigG18GVMhcIqGb0PrR2hk3C5L9EHHDKxbqD0/viewform?edit_requested=true';
const SHOW_NEW_LEAD_ACTION = false;
const FUTURE_DAY_OPTIONS = ['Tomorrow', 'Day After Tomorrow', 'In 3 Days'] as const;
type FutureDayFilter = typeof FUTURE_DAY_OPTIONS[number];

const formatDate = (dateValue?: string) => {
  if (!dateValue) return 'Not scheduled';
  const date = parseBackendCalendarDate(dateValue);
  if (!date) return dateValue;
  return `${date.day} ${MONTH_LABELS[date.month - 1]}`;
};

const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return 'Not available';
  const date = parseBackendCalendarDate(timestamp);
  if (!date) return timestamp;
  return `${date.day} ${MONTH_LABELS[date.month - 1]}`;
};

const todayCalendarDate = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

const calendarDateOffset = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

const calendarDateFromValue = (value?: string) => String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';

const assignedOnToday = (assignedAt?: string) => (
  String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] === todayCalendarDate()
);

const assignedInFutureThreeDays = (assignedAt?: string) => {
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  const today = todayCalendarDate();
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + 3);
  const endDate = [end.getFullYear(), String(end.getMonth() + 1).padStart(2, '0'), String(end.getDate()).padStart(2, '0')].join('-');
  return Boolean(date) && date > today && date <= endDate;
};

export const matchesAssignmentTaskFilter = (assignedAt: string | undefined, filter: TaskTypeFilter) => {
  if (filter === 'All Tasks') return true;
  if (filter === 'Today') return assignedOnToday(assignedAt);
  if (filter === 'Future 3 Days') return assignedInFutureThreeDays(assignedAt);
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  return !date || date < todayCalendarDate();
};

const meetingTitleOrder = (title: string) => {
  const match = title.match(/^(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

const mapLeadToSalesTask = (lead: LeadResponse, index: number): SalesTask => {
  return {
    id: lead.uniqueLeadId ?? lead.leadCode ?? String(lead.leadId ?? `lead-${index}`),
    taskKind: 'LEAD',
    leadCode: lead.leadCode,
    uniqueLeadId: lead.uniqueLeadId,
    meetingCode: lead.currentActiveMeeting?.meetingCode,
    leadId: lead.leadId,
    leadStatus: lead.leadStatus,
    assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt,
    scheduledAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt,
    name: lead.clientName ?? 'Unnamed lead',
    phone: lead.mobileNumber ?? '',
    locationText: lead.location ?? 'Location unavailable',
    clinicAddress: lead.clinicAddress,
    coordinates: { latitude: 0, longitude: 0 },
    hasLocationPin: false,
    taskLabel: 'PROSPECT',
    remarks: lead.remarks ?? 'No remarks available.',
    lastUpdated: formatTimestamp(lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt),
    nextFollowUpDate: formatDate(lead.nextPlanDate),
    schedule: getTaskSchedule(lead.nextPlanDate),
    email: lead.email,
    leadSource: lead.leadSource,
  };
};

const mapMeetingToSalesTask = (
  meeting: MeetingResponse,
  index: number,
  lead?: LeadResponse,
  locationMeeting?: MeetingResponse,
  lastMeetingDate?: string,
): SalesTask => {
  const taskDate = meeting.meetingStatus === 'NOT_CONDUCTED'
    ? meeting.nextMeetingDate ?? meeting.meetingDate
    : meeting.meetingDate;
  return {
  id: meeting.meetingCode ?? String(meeting.id ?? `meeting-${index}`),
  taskKind: 'MEETING',
  leadCode: meeting.leadCode,
  meetingCode: meeting.meetingCode,
  meetingNumber: meeting.meetingNumber,
  meetingTitle: meeting.meetingTitle,
  meetingType: meeting.meetingType,
  meetingStatus: meeting.meetingStatus,
  verificationStatus: meeting.verificationStatus,
  scheduledAt: taskDate,
  uniqueLeadId: lead?.uniqueLeadId,
  leadId: meeting.leadId ?? lead?.leadId,
  name: meeting.clientName ?? 'Unnamed client',
  phone: meeting.mobileNumber ?? '',
  locationText: meeting.address ?? locationMeeting?.address ?? meeting.location ?? meeting.meetingLocation ?? locationMeeting?.meetingLocation ?? 'Location unavailable',
  clinicAddress: lead?.clinicAddress,
  coordinates: {
    latitude: meeting.latitude ?? locationMeeting?.latitude ?? 0,
    longitude: meeting.longitude ?? locationMeeting?.longitude ?? 0,
  },
  hasLocationPin: (
    Number.isFinite(meeting.latitude) && Number.isFinite(meeting.longitude)
  ) || (
    Number.isFinite(locationMeeting?.latitude) && Number.isFinite(locationMeeting?.longitude)
  ),
  taskLabel: meeting.meetingTitle ?? '',
  remarks: meeting.remarks ?? 'No remarks available.',
  lastUpdated: formatTimestamp(lastMeetingDate ?? lead?.assignmentDate ?? lead?.assignedDate ?? lead?.assignedAt),
  nextFollowUpDate: formatDate(taskDate),
  schedule: getTaskSchedule(taskDate),
  };
};

type DropdownProps<T extends string> = {
  value: T;
  options: readonly T[];
  compactWidth?: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
};

const taskFilterLabel = (value: string) => value === 'Today' ? "Today's Task" : value;

function FilterDropdown<T extends string>({
  value,
  options,
  compactWidth,
  open,
  onToggle,
  onSelect,
  accessibilityLabel,
}: DropdownProps<T>) {
  return (
    <View style={[styles.dropdownRoot, compactWidth && styles.dropdownRootCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.dropdownButton, open && styles.dropdownButtonOpen, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.dropdownValue}>{taskFilterLabel(value)}</Text>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={19} color={theme.colors.muted} />
      </Pressable>

      {open ? (
        <ScrollView
          style={styles.dropdownMenu}
          contentContainerStyle={styles.dropdownMenuContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{taskFilterLabel(option)}</Text>
                {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

type Props = {
  onCreateNewLead?: () => void;
  onUpdateMeeting?: (lead: SalesTask) => void;
  onOpenLeadDetails?: (lead: SalesTask) => void;
  allTaskMode?: boolean;
  taskToDoMode?: boolean;
  todaysTaskMode?: boolean;
  pendingTaskMode?: boolean;
  future3DaysTaskMode?: boolean;
  allLeadsMode?: boolean;
};

export function SalesManagerTasksScreen({ onCreateNewLead, onUpdateMeeting, onOpenLeadDetails, allTaskMode = false, taskToDoMode = false, todaysTaskMode = false, pendingTaskMode = false, future3DaysTaskMode = false, allLeadsMode = false }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const [search, setSearch] = useState('');
  const [allTaskFilter, setAllTaskFilter] = useState('All Task');
  const [futureDayFilter, setFutureDayFilter] = useState<FutureDayFilter>('Tomorrow');
  const [openDropdown, setOpenDropdown] = useState<'task' | 'lead' | 'meeting' | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leadState, setLeadState] = useState<LeadSearchState>(() => leadSearchService.getState());
  const [meetingState, setMeetingState] = useState<MeetingQueueState>(() => meetingService.getState());
  const cardWidth: `${number}%` = width >= 1200 ? '31%' : width >= 700 ? '48%' : '100%';
  const tasks = useMemo(
    () => {
      const actionableMeetings = getActionableTaskMeetings(meetingState.meetings, leadState.leads);
      const meetingHistory = Array.from(
        new Map(
          [...meetingState.meetings, ...meetingService.getPendingVerificationMeetings()]
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
        .map((lead, index) => ({
          ...mapLeadToSalesTask(lead, index),
          verificationPending: hasPendingVerification(lead.leadId, lead.leadCode, lead.mobileNumber),
        }));
      return [...leadTasks, ...meetingTasks];
    },
    [leadState.leads, meetingState.meetings],
  );
  const allLeadTasks = useMemo(
    () => leadState.leads
      .filter((lead) => !isHiddenCompletedLead(lead.leadStatus))
      .filter((lead) => !isRemovedLead(lead.leadStatus))
      .map(mapLeadToSalesTask),
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
    'Prospects',
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
    if (!allTaskFilterOptions.includes(allTaskFilter)) {
      setAllTaskFilter('All Task');
    }
  }, [allTaskFilter, allTaskFilterOptions]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedPhoneSearch = search.replace(/\D/g, '');

    const sourceTasks = allLeadsMode ? allLeadTasks : tasks;
    return sourceTasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.name.toLowerCase().includes(normalizedSearch) ||
        (normalizedPhoneSearch.length > 0 && task.phone.replace(/\D/g, '').includes(normalizedPhoneSearch)) ||
        ((allTaskMode || taskToDoMode || todaysTaskMode || pendingTaskMode || future3DaysTaskMode || allLeadsMode) && [task.leadCode, task.meetingCode, task.uniqueLeadId]
          .filter(Boolean)
          .some((identifier) => identifier?.toLowerCase().includes(normalizedSearch)));
      if (allTaskMode) {
        const matchesAllTaskFilter = allTaskFilter === 'All Task'
          || (allTaskFilter === 'Prospects'
            ? task.taskKind === 'LEAD'
            : task.taskKind === 'MEETING' && task.meetingTitle === allTaskFilter);
        return matchesSearch && matchesAllTaskFilter;
      }
      if (allLeadsMode) return matchesSearch;
      if (taskToDoMode) {
        const matchesTaskToDo = task.taskKind === 'LEAD'
          ? !isRemovedLead(task.leadStatus) && (
            matchesAssignmentTaskFilter(task.assignedAt, 'Today') || matchesAssignmentTaskFilter(task.assignedAt, 'Pending')
          )
          : task.schedule === 'Today' || task.schedule === 'Pending';
        return matchesSearch && matchesTaskToDo;
      }
      if (todaysTaskMode) {
        const matchesTodaysTask = task.taskKind === 'LEAD'
          ? matchesAssignmentTaskFilter(task.assignedAt, 'Today')
          : task.schedule === 'Today';
        return matchesSearch && matchesTodaysTask;
      }
      if (pendingTaskMode) {
        const matchesPendingTask = task.taskKind === 'LEAD'
          ? matchesAssignmentTaskFilter(task.assignedAt, 'Pending')
          : task.schedule === 'Pending';
        return matchesSearch && matchesPendingTask;
      }
      if (future3DaysTaskMode) {
        const offset = futureDayFilter === 'Tomorrow' ? 1 : futureDayFilter === 'Day After Tomorrow' ? 2 : 3;
        return matchesSearch && calendarDateFromValue(task.scheduledAt) === calendarDateOffset(offset);
      }
      return matchesSearch;
    });
  }, [allLeadTasks, allLeadsMode, allTaskFilter, allTaskMode, future3DaysTaskMode, futureDayFilter, pendingTaskMode, search, taskToDoMode, tasks, todaysTaskMode]);

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.headerCard}>
            <View style={[styles.heading, isMobile && styles.mobileHeading]}>
              <View style={[styles.headingCopy, isMobile && styles.mobileHeadingCopy]}>
                <Text style={styles.title}>{allTaskMode ? 'All Task' : allLeadsMode ? 'All Leads' : taskToDoMode ? 'Task To Do' : todaysTaskMode ? "Today's Task" : pendingTaskMode ? 'Pending Task' : future3DaysTaskMode ? 'Future 3 Days' : 'Your Tasks'}</Text>
              </View>
              <View style={[styles.headingActions, isMobile && styles.mobileHeadingActions]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh tasks"
                  accessibilityState={{ disabled: isRefreshing }}
                  disabled={isRefreshing}
                  onPress={() => void refreshTasks()}
                  style={({ pressed }) => [styles.refreshAction, isRefreshing && styles.refreshActionDisabled, pressed && styles.pressed]}
                >
                  {isRefreshing ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Icon source="refresh" size={16} color={theme.colors.primary} />}
                  <Text style={styles.refreshActionText}>{isRefreshing ? 'Refreshing' : 'Refresh'}</Text>
                </Pressable>
                {SHOW_NEW_LEAD_ACTION ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create new lead"
                    onPress={onCreateNewLead}
                    style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                  >
                    <Text style={styles.secondaryActionText}>New Lead</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create service request"
                  onPress={() => void Linking.openURL(SERVICE_REQUEST_FORM_URL)}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryActionText}>Service Request</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.filters, isMobile && !allTaskMode && !future3DaysTaskMode && !allLeadsMode && styles.mobileFilters]}>
              <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused, isMobile && !allTaskMode && !future3DaysTaskMode && !allLeadsMode && styles.mobileSearch, (allTaskMode || future3DaysTaskMode || allLeadsMode) && styles.allTaskSearch]}>
                <View style={styles.searchIcon}>
                  <Icon source="magnify" size={18} color={theme.colors.primary} />
                </View>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={allTaskMode || taskToDoMode || todaysTaskMode || pendingTaskMode || future3DaysTaskMode || allLeadsMode ? 'Search by name, mobile or code' : 'Search by name or mobile number'}
                  placeholderTextColor={theme.colors.subtle}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {search ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}>
                    <Icon source="close-circle" size={18} color={theme.colors.subtle} />
                  </Pressable>
                ) : null}
              </View>

              {allTaskMode ? (
                <View style={[styles.dropdowns, isMobile && styles.allTaskMobileDropdowns]}>
                  <FilterDropdown
                    value={allTaskFilter}
                    options={allTaskFilterOptions}
                    compactWidth
                    open={openDropdown === 'task'}
                    onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                    onSelect={(value) => {
                      setAllTaskFilter(value);
                      setOpenDropdown(null);
                    }}
                    accessibilityLabel="Filter all tasks by lead or meeting label"
                  />
                </View>
              ) : allLeadsMode ? null : future3DaysTaskMode ? (
                <View style={[styles.dropdowns, isMobile && styles.allTaskMobileDropdowns]}>
                  <FilterDropdown
                    value={futureDayFilter}
                    options={FUTURE_DAY_OPTIONS}
                    compactWidth
                    open={openDropdown === 'task'}
                    onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                    onSelect={(value) => {
                      setFutureDayFilter(value);
                      setOpenDropdown(null);
                    }}
                    accessibilityLabel="Filter future tasks by scheduled day"
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyHeader}>
            <Text style={styles.bodyTitle}>Task Pipeline</Text>
            <Text style={styles.bodyCount}>
              {filteredTasks.length ? `${filteredTasks.length} tasks` : '0 tasks'}
            </Text>
          </View>
          {leadState.isLoading || meetingState.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>Loading tasks</Text>
            </View>
          ) : leadState.error || meetingState.error ? (
            <View style={styles.emptyState}>
              <Icon source="alert-circle-outline" size={30} color="#DC2626" />
              <Text style={styles.emptyTitle}>Tasks could not be loaded</Text>
              <Text style={styles.emptyText}>{leadState.error ?? meetingState.error}</Text>
            </View>
          ) : filteredTasks.length ? (
            <>
              <View style={styles.taskGrid}>
                {filteredTasks.map((task, index) => (
                  <SalesTaskCard
                    key={task.id}
                    task={task}
                    width={cardWidth}
                    index={index}
                  highlightTaskLabel={allTaskMode || taskToDoMode || todaysTaskMode || pendingTaskMode || future3DaysTaskMode || allLeadsMode}
                    onUpdateMeeting={onUpdateMeeting}
                    onOpenDetails={onOpenLeadDetails}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Icon source="clipboard-search-outline" size={30} color={theme.colors.subtle} />
              <Text style={styles.emptyTitle}>{allLeadsMode && !search ? 'No leads assigned' : allLeadsMode ? 'No matching leads found' : pendingTaskMode && !search ? 'No pending tasks' : future3DaysTaskMode && !search ? 'No tasks scheduled' : 'No matching tasks found'}</Text>
              <Text style={styles.emptyText}>{pendingTaskMode && !search ? 'There are no pending tasks.' : future3DaysTaskMode && !search ? `There are no tasks scheduled for ${futureDayFilter.toLowerCase()}.` : 'Try changing the search.'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  stickyHeader: {
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    zIndex: 50,
    elevation: 4,
  },
  body: {
    width: '100%',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bodyTitle: { color: theme.colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  bodyCount: { color: theme.colors.muted, fontSize: 10, fontWeight: '800' },
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  emptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '900' },
  emptyText: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  headerCard: {
    width: '100%',
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: theme.spacing.sm,
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F1',
    backgroundColor: 'transparent',
  },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  mobileHeading: {
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 8,
  },
  headingCopy: {
    minWidth: 190,
    flex: 1,
    zIndex: 1,
  },
  mobileHeadingCopy: {
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  headingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    zIndex: 1,
  },
  mobileHeadingActions: {
    flexWrap: 'nowrap',
    flexShrink: 0,
    gap: 6,
  },
  secondaryAction: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#CBD9EE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  primaryAction: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    shadowColor: '#2563EB',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  refreshAction: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#CBD9EE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  refreshActionDisabled: { opacity: 0.62 },
  refreshActionText: { color: theme.colors.primary, fontSize: 9, fontWeight: '900' },
  filters: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 0,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  mobileFilters: {
    flexDirection: 'column',
    gap: 8,
  },
  searchContainer: {
    minWidth: 220,
    minHeight: 36,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchContainerFocused: {
    borderColor: theme.colors.primary,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4FF',
  },
  mobileSearch: {
    width: '100%',
  },
  allTaskSearch: {
    minWidth: 0,
    maxWidth: 460,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  dropdowns: {
    flexDirection: 'row',
    gap: 6,
  },
  mobileDropdowns: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
  },
  allTaskMobileDropdowns: {
    width: 'auto',
    flexShrink: 0,
  },
  stageTabs: {
    minHeight: 36,
    flexDirection: 'row',
    padding: 2,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  mobileStageTabs: {
    flex: 1,
  },
  stageTab: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 6,
  },
  stageTabSelected: {
    backgroundColor: theme.colors.primary,
  },
  stageTabText: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  stageTabTextSelected: {
    color: '#FFFFFF',
  },
  meetingStageRoot: {
    position: 'relative',
    zIndex: 12,
  },
  mobileStageRoot: {
    flex: 1,
  },
  mobileStageButton: {
    width: '100%',
  },
  leadStageButton: {
    minWidth: 84,
    minHeight: 32,
    flexDirection: 'row',
    gap: 4,
  },
  leadStageMenu: {
    position: 'absolute',
    top: 38,
    left: 0,
    width: 150,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  meetingStageButton: {
    minWidth: 96,
    minHeight: 32,
    flexDirection: 'row',
    gap: 4,
  },
  meetingStageMenu: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 180,
    maxHeight: 190,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  dropdownRoot: {
    position: 'relative',
    width: 180,
    minWidth: 0,
    flexShrink: 1,
    zIndex: 10,
  },
  dropdownRootCompact: {
    width: 104,
    flexShrink: 0,
  },
  dropdownButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownButtonOpen: {
    borderColor: theme.colors.primary,
  },
  dropdownValue: {
    minWidth: 0,
    flex: 1,
    color: theme.colors.text,
    fontSize: 9,
    fontWeight: '800',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    maxHeight: 190,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  dropdownMenuContent: {
    padding: 3,
  },
  dropdownOption: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 7,
  },
  selectedOption: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  selectedOptionText: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
