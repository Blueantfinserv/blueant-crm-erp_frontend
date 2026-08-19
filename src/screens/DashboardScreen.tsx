import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../theme/theme';
import { AuthRole, AuthUser } from '../types/auth';
import { NavigationItem } from '../navigation/navigationConfig';
import { AnalyticsCard } from '../components/superAdminDashboard/AnalyticsCard';
import { DashboardSkeleton, EmptyState, ErrorState, LeaderboardSkeleton, PerformanceTableSkeleton, TeamPerformanceSkeleton } from '../components/superAdminDashboard/DashboardStates';
import { FilterBar } from '../components/superAdminDashboard/FilterBar';
import { InsightCard } from '../components/superAdminDashboard/InsightCard';
import { CurrentWeekPerformanceSection } from '../components/superAdminDashboard/CurrentWeekPerformanceSection';
import { AdditionalPerformanceSection } from '../components/superAdminDashboard/AdditionalPerformanceSection';
import { dashboardLeaderboardCards, dashboardPerformanceRows, dashboardSecondaryPerformanceGroups, dashboardTeamPerformanceGroups } from './dashboard/dashboardData';
import { useDashboardDatePicker } from './dashboard/useDashboardDatePicker';
import { TodayOverviewSection } from '../modules/salesManager/dashboard/components/TodayOverviewSection';
import { todayOverviewData } from '../modules/salesManager/dashboard/mock/todayOverviewData';
import { SalesActivitySection } from '../modules/salesManager/dashboard/components/SalesActivitySection';
import { salesActivityData } from '../modules/salesManager/dashboard/mock/salesActivityData';
import { DashboardListsSection } from '../modules/salesManager/dashboard/components/DashboardListsSection';
import { dashboardListsData } from '../modules/salesManager/dashboard/mock/dashboardListsData';
import { DashboardListCard } from '../modules/salesManager/dashboard/types/dashboard';
import { ConversionPerformanceSection } from '../modules/salesManager/dashboard/components/ConversionPerformanceSection';
import { conversionPerformanceData } from '../modules/salesManager/dashboard/mock/conversionPerformanceData';
import { FrontendExperience, isSalesWorkspaceExperience } from '../navigation/roleExperience';
const salesIcon = require('../../assets/perfomancecardlogo.png');
const meetingsIcon = require('../../assets/meetingcardlogo.png');
const convertedClientIcon = require('../../assets/convertedclientcardlogo.png');
const teamIcon = require('../../assets/teamcardlogo.png');

type Props = {
  onLogout: () => void;
  role: AuthRole | null;
  title: string;
  subtitle: string;
  menuItems: NavigationItem[];
  user: AuthUser | null;
  onMenuItemPress: (item: NavigationItem) => void;
  dashboardState?: 'loading' | 'success' | 'empty' | 'error';
  onRetryDashboard?: () => void;
  onOpenDashboardList?: (listId: DashboardListCard['id']) => void;
  onCreateNewLead?: () => void;
  experience: FrontendExperience;
};

const insightCards = [
  'Reserved for future revenue widgets, forecasting overlays, and executive alerts.',
  'Reserved for future funnel efficiency widgets and conversion variance breakdowns.',
  'Reserved for future branch-level engagement widgets and SLA compliance metrics.',
  'Reserved for future portfolio health widgets and exception monitoring panels.',
];

export function DashboardScreen({ onLogout, role, user, onMenuItemPress, menuItems, experience, dashboardState = 'success', onRetryDashboard = () => {}, onOpenDashboardList = () => {}, onCreateNewLead = () => {} }: Props) {
  const { width } = useWindowDimensions();
  const isCompactAnalyticsLayout = width < 768;
  const period = 'Current Week';
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const { calendarDays, datePicker, openDatePicker, closeDatePicker, shiftViewedMonth, selectCalendarDay, displayedDateFilter } =
    useDashboardDatePicker();

  const displayName = user?.fullName ?? 'Executive';
  const isSuperAdmin = experience === 'SUPER_ADMIN';
  const isSalesWorkspace = isSalesWorkspaceExperience(experience);
  const rows = dashboardPerformanceRows[period];
  const isLoading = dashboardState === 'loading';
  const isEmpty = dashboardState === 'empty';
  const isError = dashboardState === 'error';

  if (!isSuperAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.shell}>
          {isSalesWorkspace ? (
            <>
              <TodayOverviewSection cards={todayOverviewData} />
              <SalesActivitySection cards={salesActivityData} onActionPress={(actionId) => {
                if (actionId === 'new-lead') onCreateNewLead();
              }} />
              <DashboardListsSection cards={dashboardListsData} onOpenList={onOpenDashboardList} />
              <ConversionPerformanceSection data={conversionPerformanceData} />
            </>
          ) : (
            <>
              <Text style={styles.legacyTitle}>{displayName}</Text>
              <Text style={styles.legacySubtitle}>{currentDate}</Text>
              <Text style={styles.legacyText}>
                This dashboard view is currently optimized for SUPER_ADMIN. Other role dashboards will be expanded later.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        {isLoading ? (
          <View style={styles.loadingStack}>
            <DashboardSkeleton tone="dashboard" />
            <View style={styles.loadingRow}>
              <LeaderboardSkeleton />
              <LeaderboardSkeleton />
              <LeaderboardSkeleton />
              <LeaderboardSkeleton />
            </View>
            <PerformanceTableSkeleton />
            <TeamPerformanceSkeleton />
          </View>
        ) : isError ? (
          <ErrorState title="Dashboard failed to load" description="We couldn't load the latest dashboard data." onRetry={onRetryDashboard} />
        ) : null}

        {!isLoading && !isError ? (
          <>
            <FilterBar
              period="Past Week"
              dateFilter={displayedDateFilter}
              onPeriodChange={() => {}}
              onOpenDatePicker={openDatePicker}
              onApply={() => {}}
            />

            <View style={[styles.analyticsRow, isCompactAnalyticsLayout && styles.analyticsRowCompact]}>
              {dashboardLeaderboardCards.performers.length ? (
                <AnalyticsCard
                  title="Top 3 Performers"
                  metricLabel="Based on points"
                  items={dashboardLeaderboardCards.performers}
                  backgroundColor="rgba(255, 243, 238, 0.95)"
                  accentColor="rgba(244, 114, 71, 0.55)"
                  iconSource={salesIcon}
                  fullWidth={isCompactAnalyticsLayout}
                />
              ) : (
                <EmptyState title="No leaderboard data" description="This section will populate once the backend returns leaderboard records." />
              )}
              {dashboardLeaderboardCards.meetings.length ? (
                <AnalyticsCard
                  title="Top 3 by Meetings"
                  metricLabel="Meeting volume"
                  items={dashboardLeaderboardCards.meetings}
                  backgroundColor="rgba(239, 248, 255, 0.96)"
                  accentColor="rgba(14, 165, 233, 0.55)"
                  iconSource={meetingsIcon}
                  fullWidth={isCompactAnalyticsLayout}
                />
              ) : null}
              {dashboardLeaderboardCards.convertedClients.length ? (
                <AnalyticsCard
                  title="Top 3 Converted Clients"
                  metricLabel="Conversion count"
                  items={dashboardLeaderboardCards.convertedClients}
                  backgroundColor="rgba(238, 252, 242, 0.96)"
                  accentColor="rgba(34, 197, 94, 0.55)"
                  iconSource={convertedClientIcon}
                  fullWidth={isCompactAnalyticsLayout}
                />
              ) : null}
              {dashboardLeaderboardCards.teamPerformance.length ? (
                <AnalyticsCard
                  title="Team Performance"
                  metricLabel="Top 3 teams"
                  items={dashboardLeaderboardCards.teamPerformance}
                  backgroundColor="rgba(245, 240, 255, 0.96)"
                  accentColor="rgba(124, 58, 237, 0.55)"
                  iconSource={teamIcon}
                  fullWidth={isCompactAnalyticsLayout}
                />
              ) : null}
            </View>

            <View style={styles.section}>
              {isEmpty ? (
                <EmptyState title="No performance data" description="Performance records will appear here once available from the backend." />
              ) : (
                <CurrentWeekPerformanceSection
                  title="Sales Manager Dashboard"
                  period={period}
                  onPeriodChange={() => {}}
                  groups={dashboardTeamPerformanceGroups}
                />
              )}
            </View>

            <View style={styles.section}>
              {isEmpty ? (
                <TeamPerformanceSkeleton />
              ) : (
                <View style={styles.insightGrid}>
                  {insightCards.map((text, index) => (
                    <InsightCard key={index} title={`Insight ${index + 1}`} description={text} />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <AdditionalPerformanceSection title="Sales Leader Chart" groups={dashboardSecondaryPerformanceGroups} />
            </View>

          </>
        ) : null}
      </View>

      <Modal visible={datePicker.openField !== null} transparent animationType="fade" onRequestClose={closeDatePicker}>
        <Pressable style={styles.modalBackdrop} onPress={closeDatePicker}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select {datePicker.openField === 'from' ? 'Start' : 'End'} Date</Text>
                <Text style={styles.modalSubtitle}>
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'long',
                    year: 'numeric',
                  }).format(datePicker.viewedMonth)}
                </Text>
              </View>
              <View style={styles.monthControls}>
                <Pressable onPress={() => shiftViewedMonth(-1)} style={styles.monthButton}>
                  <Text style={styles.monthButtonText}>�</Text>
                </Pressable>
                <Pressable onPress={() => shiftViewedMonth(1)} style={styles.monthButton}>
                  <Text style={styles.monthButtonText}>�</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.weekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                <Text key={day} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const isEmpty = !day;
                return (
                  <Pressable
                    key={day ? day : `empty-${Math.random()}`}
                    disabled={isEmpty}
                    onPress={() => selectCalendarDay(day)}
                    style={[styles.dayCell, isEmpty && styles.dayEmpty]}
                  >
                    {day ? <Text style={styles.dayText}>{day}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={closeDatePicker} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 0,
  },
  shell: {
    gap: 10,
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
  },
  loadingStack: {
    gap: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  analyticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  analyticsRowCompact: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  sectionHeader: {
    gap: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '600',
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  section: {
    gap: 4,
    alignSelf: 'stretch',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 14,
    ...theme.shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  monthControls: {
    flexDirection: 'row',
    gap: 8,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  monthButtonText: {
    color: theme.colors.primary,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekLabel: {
    width: 40,
    textAlign: 'center',
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: '12.2%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEmpty: {
    backgroundColor: 'transparent',
  },
  dayText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  legacyTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  legacySubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  legacyText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
});
