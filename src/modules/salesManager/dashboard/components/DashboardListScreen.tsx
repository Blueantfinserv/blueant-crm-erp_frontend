import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { DashboardListCard, DashboardListPeriod } from '../types/dashboard';
import type { LeadResponse } from '../../../../types/lead';
import type { MeetingResponse } from '../../../../types/meeting';
import { leadSearchService } from '../../../../services/LeadSearchService';
import { meetingService } from '../../../../services/MeetingService';

type Props = {
  list: DashboardListCard;
  userName: string;
  userId?: number;
  employeeCode?: string;
  onBack: () => void;
};

const toCalendarDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const getPeriod = (dateValue?: string): DashboardListPeriod | null => {
  const date = toCalendarDate(dateValue);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime()) return 'today';
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (date >= weekStart && date <= today) return 'thisWeek';
  if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()) return 'thisMonth';
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  if (date >= lastMonthStart && date <= lastMonthEnd) return 'lastMonth';
  return null;
};

const toLeadListItem = (lead: LeadResponse, eventDate = lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt) => {
  const period = getPeriod(eventDate);
  const resolvedPeriod = period ?? 'lastMonth';
  const assignmentDate = toCalendarDate(eventDate);
  return {
    id: lead.uniqueLeadId ?? lead.leadCode ?? String(lead.leadId),
    primaryText: lead.clientName ?? 'Unnamed lead',
    secondaryText: [lead.leadStatus, lead.leadStage].filter(Boolean).join(' · ') || 'Lead',
    dateLabel: assignmentDate
      ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(assignmentDate)
      : 'Date unavailable',
    period: resolvedPeriod,
    dateValue: eventDate,
  };
};

const toMeetingListItem = (meeting: MeetingResponse) => {
  const conductedAt = meeting.workflowUpdatedAt
    ?? meeting.updatedAt
    ?? meeting.lastModifiedDate
    ?? meeting.meetingDate;
  const period = getPeriod(conductedAt);
  if (!period) return null;
  const meetingDate = toCalendarDate(conductedAt);
  return {
    id: meeting.meetingCode ?? String(meeting.id),
    primaryText: meeting.clientName ?? 'Unnamed client',
    secondaryText: [meeting.meetingTitle, meeting.meetingMode].filter(Boolean).join(' · ') || 'Meeting',
    dateLabel: meetingDate
      ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(meetingDate)
      : 'Date unavailable',
    period,
    dateValue: conductedAt,
  };
};

const meetingPeriods: readonly { key: DashboardListPeriod; label: string; color: string }[] = [
  { key: 'today', label: 'Today', color: '#2563EB' },
  { key: 'thisWeek', label: 'This Week', color: '#8B5CF6' },
  { key: 'lastMonth', label: 'Last Month', color: '#F97316' },
];

const clientPeriods: readonly { key: DashboardListPeriod; label: string; color: string }[] = [
  { key: 'today', label: 'Today', color: '#2563EB' },
  { key: 'thisWeek', label: 'This Week', color: '#8B5CF6' },
  { key: 'thisMonth', label: 'This Month', color: '#F97316' },
];

const rowColors = [
  { accent: '#2563EB', background: '#F5F9FF', border: '#DBEAFE', soft: '#E8F0FF' },
  { accent: '#8B5CF6', background: '#FAF7FF', border: '#EDE9FE', soft: '#F1EAFF' },
  { accent: '#F97316', background: '#FFF9F4', border: '#FFEDD5', soft: '#FFF0E3' },
  { accent: '#16A34A', background: '#F5FCF7', border: '#DCFCE7', soft: '#E7F8EC' },
] as const;
const PAGE_SIZE = 50;

export function DashboardListScreen({ list, userName, userId, employeeCode, onBack }: Props) {
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<DashboardListPeriod>('today');
  const [page, setPage] = useState(0);
  const [liveLeadItems, setLiveLeadItems] = useState(list.items);
  const isLiveList = ['lead-collected-list', 'meeting-done-list', 'client-created-list'].includes(list.id);
  const [loading, setLoading] = useState(isLiveList);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMobile = width < 600;
  const isCompactHeader = width < 980;
  const showPeriodSelector = list.id === 'meeting-done-list' || list.id === 'client-created-list';
  const periods = list.id === 'client-created-list' ? clientPeriods : meetingPeriods;

  useEffect(() => {
    if (!isLiveList) return;
    const refresh = () => {
      const leads = leadSearchService.getState().leads;
      const meetings = meetingService.getState().meetings;
      if (list.id === 'lead-collected-list') {
        setLiveLeadItems(leads.map((lead) => toLeadListItem(lead)));
      } else if (list.id === 'client-created-list') {
        setLiveLeadItems(leads
          .filter((lead) => ['CONVERTED', 'ALREADY_CLIENT'].includes(String(lead.leadStatus ?? '').toUpperCase()))
          .map((lead) => toLeadListItem(lead, lead.audit?.updatedAt ?? lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt)));
      } else {
        setLiveLeadItems(meetings
          .filter((meeting) => meeting.meetingConducted === 'CONDUCTED' || meeting.meetingStatus === 'COMPLETED')
          .map(toMeetingListItem)
          .filter((item) => item !== null));
      }
      const stateError = list.id === 'meeting-done-list' ? meetingService.getState().error : leadSearchService.getState().error;
      const stateLoading = list.id === 'meeting-done-list' ? meetingService.getState().isLoading : leadSearchService.getState().isLoading;
      setLoadError(stateError);
      setLoading(stateLoading);
    };
    const unsubscribeLeads = leadSearchService.subscribe(refresh);
    const unsubscribeMeetings = meetingService.subscribe(refresh);
    refresh();
    if (list.id === 'meeting-done-list') {
      if (!meetingService.getState().timestamp) void meetingService.loadMeetings();
    } else if (!leadSearchService.getState().timestamp) {
      void leadSearchService.loadLeads();
    }
    return () => { unsubscribeLeads(); unsubscribeMeetings(); };
  }, [isLiveList, list.id]);
  const visibleItems = useMemo(() => {
    if (!showPeriodSelector) return liveLeadItems;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return liveLeadItems.filter((item) => {
      const date = toCalendarDate(item.dateValue);
      if (!date) return false;
      if (period === 'today') return date.getTime() === today.getTime();
      if (period === 'thisWeek') return date >= weekStart && date <= today;
      if (period === 'thisMonth') return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
      return date >= lastMonthStart && date <= lastMonthEnd;
    });
  }, [liveLeadItems, period, showPeriodSelector]);
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedItems = useMemo(
    () => visibleItems.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [currentPage, visibleItems],
  );

  useEffect(() => { setPage(0); }, [list.id, period]);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stickyHeader}>
          <View style={[styles.hero, { backgroundColor: list.cardBackgroundColor, borderColor: `${list.accentColor}2E` }]}>
            <View style={[styles.heroCircleLarge, { backgroundColor: `${list.accentColor}0D` }]} />
            <View style={[styles.heroCircleSmall, { backgroundColor: `${list.accentColor}14` }]} />

            <View style={[styles.pageHeader, isCompactHeader && styles.compactPageHeader]}>
              <View style={styles.headerIdentity}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={onBack} style={styles.backButton}>
                  <Icon source="arrow-left" size={20} color={theme.colors.text} />
                </Pressable>
                <View style={[styles.pageIcon, { backgroundColor: `${list.accentColor}18` }]}>
                  <Icon source={list.icon} size={22} color={list.accentColor} />
                </View>
                <View style={styles.headingCopy}>
                  <View style={styles.eyebrowRow}>
                    <View style={[styles.eyebrowDot, { backgroundColor: list.accentColor }]} />
                    <Text style={[styles.eyebrowText, { color: list.accentColor }]}>PERSONAL ACTIVITY</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.title}>{list.title}</Text>
                  <Text numberOfLines={1} style={styles.subtitle}>Activity assigned to {userName}</Text>
                </View>
              </View>

              {showPeriodSelector ? <View style={[styles.periodSelector, isCompactHeader && styles.compactPeriodSelector, isMobile && styles.mobilePeriodSelector]}>
                {periods.map((option) => {
                  const isActive = option.key === period;
                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => { setPeriod(option.key); setPage(0); }}
                      style={[
                        styles.periodButton,
                        isMobile && styles.mobilePeriodButton,
                        {
                          backgroundColor: isActive ? option.color : `${option.color}0D`,
                          borderColor: isActive ? option.color : `${option.color}24`,
                        },
                      ]}
                    >
                      <View style={[styles.periodDot, { backgroundColor: isActive ? '#FFFFFF' : option.color }]} />
                      <Text style={[styles.periodText, { color: isActive ? '#FFFFFF' : option.color }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View> : null}
            </View>
          </View>
        </View>

        <View style={[styles.listPanel, { borderColor: `${list.accentColor}30` }]}>
        <View style={[styles.listAccentBand, { backgroundColor: list.accentColor }]} />
        <View style={[styles.listHeader, { backgroundColor: `${list.accentColor}0D` }]}>
          <View style={styles.listHeadingGroup}>
            <View style={[styles.headingMarker, { backgroundColor: list.accentColor }]} />
            <Text style={styles.listHeading}>{list.metricLabel}</Text>
          </View>
          <View style={[styles.recordCountBadge, { backgroundColor: `${list.accentColor}14` }]}>
            <Text style={[styles.listPeriod, { color: list.accentColor }]}>{visibleItems.length} records</Text>
          </View>
        </View>

        <View style={styles.rows}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={list.accentColor} />
              <Text style={styles.emptyDescription}>Loading records...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyState}>
              <Icon source="alert-circle-outline" size={30} color="#DC2626" />
              <Text style={styles.emptyTitle}>Records could not be loaded</Text>
              <Text style={styles.emptyDescription}>{loadError}</Text>
            </View>
          ) : visibleItems.length ? (
            paginatedItems.map((item, index) => {
              const rowColor = rowColors[index % rowColors.length];

              return (
              <View
                key={item.id}
                style={[
                  styles.row,
                  isMobile && styles.mobileRow,
                  { backgroundColor: rowColor.background, borderColor: rowColor.border },
                ]}
              >
                <View style={[styles.recordNumber, { backgroundColor: rowColor.soft }]}>
                  <Text style={[styles.recordNumberText, { color: rowColor.accent }]}>{currentPage * PAGE_SIZE + index + 1}</Text>
                </View>
                <View style={[styles.recordCopy, isMobile && styles.mobileRecordCopy]}>
                  <Text style={styles.primaryText}>{item.primaryText}</Text>
                  <Text style={styles.secondaryText}>{item.secondaryText}</Text>
                </View>
                <View style={[styles.dateBadge, isMobile && styles.mobileDateBadge, { backgroundColor: rowColor.soft }]}>
                  <Icon source="clock-outline" size={14} color={rowColor.accent} />
                  <Text style={[styles.dateText, { color: rowColor.accent }]}>{item.dateLabel}</Text>
                </View>
              </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Icon source="clipboard-text-outline" size={30} color={theme.colors.subtle} />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyDescription}>No activity was recorded for this period.</Text>
            </View>
          )}
          {!loading && !loadError && visibleItems.length > PAGE_SIZE ? <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visibleItems.length)} of {visibleItems.length}</Text>
            <View style={styles.paginationActions}>
              <Pressable disabled={currentPage === 0} onPress={() => setPage((value) => Math.max(0, value - 1))} style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}><Text style={styles.paginationButtonText}>Previous</Text></Pressable>
              <Text style={styles.pageNumber}>{currentPage + 1} / {totalPages}</Text>
              <Pressable disabled={currentPage >= totalPages - 1} onPress={() => setPage((value) => Math.min(totalPages - 1, value + 1))} style={[styles.paginationButton, currentPage >= totalPages - 1 && styles.paginationButtonDisabled]}><Text style={styles.paginationButtonText}>Next</Text></Pressable>
            </View>
          </View> : null}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: theme.radius.lg,
    backgroundColor: '#F7F9FD',
  },
  scrollContent: {
    gap: theme.spacing.lg,
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  stickyHeader: {
    paddingBottom: theme.spacing.sm,
    backgroundColor: '#F7F9FD',
    zIndex: 10,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    ...theme.shadow.card,
  },
  heroCircleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -52,
    top: -96,
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    right: 132,
    bottom: -34,
  },
  pageHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    zIndex: 1,
  },
  compactPageHeader: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.md },
  headerIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
  },
  pageIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { minWidth: 0, flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrowDot: { width: 5, height: 5, borderRadius: 3 },
  eyebrowText: { fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: theme.colors.text, fontSize: 20, lineHeight: 26, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  periodSelector: {
    flexShrink: 0, marginLeft: 'auto', flexDirection: 'row', padding: 4, gap: 4, borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)',
    zIndex: 1,
  },
  compactPeriodSelector: { marginLeft: 0, alignSelf: 'flex-end' },
  mobilePeriodSelector: { width: '100%', marginLeft: 0 },
  periodButton: {
    minWidth: 82, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: 'transparent', borderRadius: theme.radius.sm,
  },
  mobilePeriodButton: { minWidth: 0, flex: 1, paddingHorizontal: theme.spacing.xs },
  periodDot: { width: 6, height: 6, borderRadius: 3 },
  periodText: { color: theme.colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  listPanel: {
    position: 'relative',
    overflow: 'hidden', borderWidth: 1, borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface, ...theme.shadow.card,
  },
  listAccentBand: { height: 4, width: '100%' },
  listHeader: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  listHeadingGroup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headingMarker: { width: 4, height: 20, borderRadius: 2 },
  listHeading: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  recordCountBadge: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: 999 },
  listPeriod: { color: theme.colors.muted, fontSize: 10, fontWeight: '800' },
  rows: { gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: '#FBFCFE' },
  row: {
    minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderWidth: 1, borderRadius: theme.radius.md,
  },
  mobileRow: {
    minHeight: 88,
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  recordNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  recordNumberText: { fontSize: 11, fontWeight: '900' },
  recordCopy: { minWidth: 0, flex: 1 },
  mobileRecordCopy: { minWidth: 150 },
  primaryText: { color: theme.colors.text, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  secondaryText: { color: theme.colors.muted, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  dateBadge: {
    maxWidth: 160, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 6, borderRadius: theme.radius.sm,
  },
  mobileDateBadge: {
    maxWidth: '80%',
    marginLeft: 46,
  },
  dateText: { flexShrink: 1, color: theme.colors.muted, fontSize: 9, lineHeight: 12, fontWeight: '700' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingTop: theme.spacing.sm },
  paginationInfo: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  paginationActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  paginationButton: { minWidth: 72, alignItems: 'center', paddingHorizontal: theme.spacing.sm, paddingVertical: 8, borderRadius: theme.radius.sm, backgroundColor: '#E8EEFF' },
  paginationButtonDisabled: { opacity: 0.45 },
  paginationButtonText: { color: '#3156C8', fontSize: 10, fontWeight: '900' },
  pageNumber: { color: theme.colors.text, fontSize: 10, fontWeight: '800' },
  emptyState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs },
  emptyTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  emptyDescription: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
});
