import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import {
  TaskStageFilter,
  TaskTypeFilter,
  taskTypeOptions,
} from './mock/taskFilterOptions';
import { SalesTaskCard } from './components/SalesTaskCard';
import type { SalesTask } from './types/tasks';
import { leadSearchService } from '../../../services/LeadSearchService';
import { leadService } from '../../../services/LeadService';
import type { LeadResponse, LeadSearchState } from '../../../types/lead';
import { meetingService } from '../../../services/MeetingService';
import type { MeetingQueueState, MeetingResponse } from '../../../types/meeting';

const parseBackendCalendarDate = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const LEAD_FILTER_OPTIONS = ['Active Leads', 'Removed Leads'] as const;
const isHiddenCompletedLead = (status?: LeadResponse['leadStatus'] | MeetingResponse['leadStatus']) => (
  status === 'ALREADY_CLIENT' || status === 'CONVERTED' || status === 'CONVERTED_CLIENT'
);

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

const getSchedule = (dateValue?: string): SalesTask['schedule'] => {
  if (!dateValue) return 'Pending';
  const backendDate = parseBackendCalendarDate(dateValue);
  if (!backendDate) return 'Pending';
  const taskDate = new Date(backendDate.year, backendDate.month - 1, backendDate.day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const differenceInDays = Math.round((taskDate.getTime() - today.getTime()) / 86_400_000);
  if (differenceInDays === 0) return 'Today';
  if (differenceInDays > 0 && differenceInDays <= 3) return 'Future 3 Days';
  return 'Pending';
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
    name: lead.clientName ?? 'Unnamed lead',
    phone: lead.mobileNumber ?? '',
    locationText: lead.location ?? 'Location unavailable',
    coordinates: { latitude: 0, longitude: 0 },
    hasLocationPin: false,
    taskLabel: 'LEADS',
    remarks: lead.remarks ?? 'No remarks available.',
    lastUpdated: formatTimestamp(lead.audit?.updatedAt ?? lead.audit?.createdAt),
    nextFollowUpDate: formatDate(lead.nextPlanDate),
    schedule: getSchedule(lead.nextPlanDate),
    email: lead.email,
    leadSource: lead.leadSource,
  };
};

const mapMeetingToSalesTask = (
  meeting: MeetingResponse,
  index: number,
  lead?: LeadResponse,
): SalesTask => ({
  id: meeting.meetingCode ?? String(meeting.id ?? `meeting-${index}`),
  taskKind: 'MEETING',
  leadCode: meeting.leadCode,
  meetingCode: meeting.meetingCode,
  meetingNumber: meeting.meetingNumber,
  meetingTitle: meeting.meetingTitle,
  meetingType: meeting.meetingType,
  meetingStatus: meeting.meetingStatus,
  uniqueLeadId: lead?.uniqueLeadId,
  leadId: meeting.leadId ?? lead?.leadId,
  name: meeting.clientName ?? 'Unnamed client',
  phone: meeting.mobileNumber ?? '',
  locationText: meeting.location ?? meeting.meetingLocation ?? meeting.address ?? 'Location unavailable',
  coordinates: { latitude: meeting.latitude ?? 0, longitude: meeting.longitude ?? 0 },
  hasLocationPin: meeting.latitude !== undefined && meeting.longitude !== undefined,
  taskLabel: meeting.meetingTitle ?? '',
  remarks: meeting.remarks ?? 'No remarks available.',
  lastUpdated: formatTimestamp(
    meeting.workflowUpdatedAt
      ?? meeting.updatedAt
      ?? meeting.lastModifiedDate
      ?? lead?.audit?.updatedAt
      ?? meeting.createdAt
      ?? meeting.createdDate
      ?? lead?.audit?.createdAt,
  ),
  nextFollowUpDate: formatDate(meeting.meetingDate),
  schedule: getSchedule(meeting.meetingDate),
});

type DropdownProps<T extends string> = {
  value: T;
  options: readonly T[];
  compactWidth?: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
};

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
        <Text numberOfLines={1} style={styles.dropdownValue}>{value}</Text>
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
                <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{option}</Text>
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
};

export function SalesManagerTasksScreen({ onCreateNewLead, onUpdateMeeting, onOpenLeadDetails }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const [search, setSearch] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeFilter>('All Tasks');
  const [taskStage, setTaskStage] = useState<TaskStageFilter>('Leads');
  const [leadFilter, setLeadFilter] = useState<'Active Leads' | 'Removed Leads'>('Active Leads');
  const [meetingFilter, setMeetingFilter] = useState('All Meetings');
  const [openDropdown, setOpenDropdown] = useState<'task' | 'lead' | 'meeting' | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [leadState, setLeadState] = useState<LeadSearchState>(() => leadSearchService.getState());
  const [meetingState, setMeetingState] = useState<MeetingQueueState>(() => meetingService.getState());
  const cardWidth: `${number}%` = width >= 1200 ? '31%' : width >= 700 ? '48%' : '100%';
  const tasks = useMemo(
    () => {
      const actionableMeetings = meetingState.meetings.filter((meeting) => (
        meeting.meetingStatus === 'SCHEDULED' && meeting.meetingType !== 'INTRO'
      ));
      const meetingTasks = actionableMeetings.flatMap((meeting, index) => {
        const lead = leadState.leads.find((candidate) => (
          (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)
          || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)
        ));
        if (isHiddenCompletedLead(lead?.leadStatus) || isHiddenCompletedLead(meeting.leadStatus)) return [];
        return [mapMeetingToSalesTask(meeting, index, lead)];
      });
      const meetingLeadKeys = new Set(meetingTasks.flatMap((task) => [
        task.leadCode ? `code:${task.leadCode}` : '',
        task.leadId !== undefined ? `id:${task.leadId}` : '',
      ]).filter(Boolean));
      const leadTasks = leadState.leads
        .filter((lead) => {
          if (isHiddenCompletedLead(lead.leadStatus)) return false;
          const keys = [lead.leadCode ? `code:${lead.leadCode}` : '', lead.leadId !== undefined ? `id:${lead.leadId}` : ''].filter(Boolean);
          return keys.every((key) => !meetingLeadKeys.has(key));
        })
        .map(mapLeadToSalesTask);
      return [...leadTasks, ...meetingTasks];
    },
    [leadState.leads, meetingState.meetings],
  );
  const meetingFilterOptions = useMemo(() => [
    'All Meetings',
    ...Array.from(new Set(
      tasks
        .filter((task) => task.taskKind === 'MEETING' && Boolean(task.meetingTitle))
        .map((task) => task.meetingTitle as string),
    )),
  ], [tasks]);
  useEffect(() => {
    const unsubscribe = leadSearchService.subscribe(setLeadState);
    void leadSearchService.loadLeads();
    return unsubscribe;
  }, []);

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

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedPhoneSearch = search.replace(/\D/g, '');

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.name.toLowerCase().includes(normalizedSearch) ||
        (normalizedPhoneSearch.length > 0 && task.phone.replace(/\D/g, '').includes(normalizedPhoneSearch));
      const matchesTaskType = taskType === 'All Tasks' || task.schedule === taskType;
      const matchesStage = (taskStage === 'Leads' && task.taskKind === 'LEAD')
        || (taskStage === 'Meetings' && task.taskKind === 'MEETING');
      const matchesLead = taskStage !== 'Leads'
        || (leadFilter === 'Removed Leads'
          ? task.leadStatus === 'REMOVED' || task.leadStatus === 'NOT_INTERESTED'
          : task.leadStatus !== 'REMOVED' && task.leadStatus !== 'NOT_INTERESTED');
      const matchesMeeting = taskStage !== 'Meetings'
        || meetingFilter === 'All Meetings'
        || task.meetingTitle === meetingFilter;
      return matchesSearch && matchesTaskType && matchesStage && matchesLead && matchesMeeting;
    });
  }, [leadFilter, meetingFilter, search, taskStage, taskType, tasks]);

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
                <Text style={styles.title}>Your Tasks</Text>
              </View>
              <View style={[styles.headingActions, isMobile && styles.mobileHeadingActions]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create new lead"
                  onPress={onCreateNewLead}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryActionText}>New Lead</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create service request"
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryActionText}>Service Request</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.filters, isMobile && styles.mobileFilters]}>
              <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused, isMobile && styles.mobileSearch]}>
                <View style={styles.searchIcon}>
                  <Icon source="magnify" size={18} color={theme.colors.primary} />
                </View>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search by name or mobile number"
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

              <View style={[styles.dropdowns, isMobile && styles.mobileDropdowns]}>
                <FilterDropdown
                  value={taskType}
                  options={taskTypeOptions}
                  compactWidth={isMobile}
                  open={openDropdown === 'task'}
                  onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                  onSelect={(value) => {
                    setTaskType(value);
                    setOpenDropdown(null);
                  }}
                  accessibilityLabel="Filter by task type"
                />
                <View style={[styles.stageTabs, isMobile && styles.mobileStageTabs]}>
                  <View style={[styles.meetingStageRoot, isMobile && styles.mobileStageRoot]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Filter leads by status"
                      accessibilityState={{
                        expanded: openDropdown === 'lead',
                        selected: taskStage === 'Leads',
                      }}
                      onPress={() => {
                        setTaskStage('Leads');
                        setOpenDropdown((current) => (current === 'lead' ? null : 'lead'));
                      }}
                      style={({ pressed }) => [
                        styles.stageTab,
                        styles.leadStageButton,
                        isMobile && styles.mobileStageButton,
                        taskStage === 'Leads' && styles.stageTabSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.stageTabText, taskStage === 'Leads' && styles.stageTabTextSelected]}
                      >
                        {leadFilter === 'Active Leads' ? 'Leads' : leadFilter}
                      </Text>
                      <Icon
                        source={openDropdown === 'lead' ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={taskStage === 'Leads' ? '#FFFFFF' : theme.colors.muted}
                      />
                    </Pressable>

                    {openDropdown === 'lead' ? (
                      <View style={styles.leadStageMenu}>
                        {LEAD_FILTER_OPTIONS.map((option) => {
                          const selected = leadFilter === option;
                          return (
                            <Pressable
                              key={option}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setLeadFilter(option);
                                setTaskStage('Leads');
                                setOpenDropdown(null);
                              }}
                              style={({ pressed }) => [
                                styles.dropdownOption,
                                selected && styles.selectedOption,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{option}</Text>
                              {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.meetingStageRoot, isMobile && styles.mobileStageRoot]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Filter meetings by backend title"
                      accessibilityState={{
                        expanded: openDropdown === 'meeting',
                        selected: taskStage === 'Meetings',
                      }}
                      onPress={() => {
                        setTaskStage('Meetings');
                        setOpenDropdown((current) => (current === 'meeting' ? null : 'meeting'));
                      }}
                      style={({ pressed }) => [
                        styles.stageTab,
                        styles.meetingStageButton,
                        isMobile && styles.mobileStageButton,
                        taskStage === 'Meetings' && styles.stageTabSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.stageTabText, taskStage === 'Meetings' && styles.stageTabTextSelected]}
                      >
                        {meetingFilter === 'All Meetings' ? 'Meetings' : meetingFilter}
                      </Text>
                      <Icon
                        source={openDropdown === 'meeting' ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={taskStage === 'Meetings' ? '#FFFFFF' : theme.colors.muted}
                      />
                    </Pressable>

                    {openDropdown === 'meeting' ? (
                      <ScrollView
                        style={styles.meetingStageMenu}
                        contentContainerStyle={styles.dropdownMenuContent}
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                      >
                        {meetingFilterOptions.map((option) => {
                          const selected = meetingFilter === option;
                          return (
                            <Pressable
                              key={option}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setMeetingFilter(option);
                                setTaskStage('Meetings');
                                setOpenDropdown(null);
                              }}
                              style={({ pressed }) => [
                                styles.dropdownOption,
                                selected && styles.selectedOption,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{option}</Text>
                              {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyHeader}>
            <Text style={styles.bodyTitle}>Task Pipeline</Text>
            <Text style={styles.bodyCount}>{filteredTasks.length} tasks</Text>
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
            <View style={styles.taskGrid}>
              {filteredTasks.map((task, index) => (
                <SalesTaskCard
                  key={task.id}
                  task={task}
                  width={cardWidth}
                  index={index}
                  onUpdateMeeting={onUpdateMeeting}
                  onOpenDetails={onOpenLeadDetails}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon source="clipboard-search-outline" size={30} color={theme.colors.subtle} />
              <Text style={styles.emptyTitle}>No matching tasks</Text>
              <Text style={styles.emptyText}>Try changing the search or filter selection.</Text>
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
    minHeight: 26,
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
    minHeight: 30,
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
  stageTabs: {
    minHeight: 30,
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
    minHeight: 26,
    flexDirection: 'row',
    gap: 4,
  },
  leadStageMenu: {
    position: 'absolute',
    top: 32,
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
    minHeight: 26,
    flexDirection: 'row',
    gap: 4,
  },
  meetingStageMenu: {
    position: 'absolute',
    top: 32,
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
    width: 112,
    flexShrink: 0,
  },
  dropdownButton: {
    minHeight: 30,
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
    top: 34,
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
    minHeight: 24,
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
