export type TodayOverviewIconName =
  | 'calendar-today'
  | 'calendar-clock'
  | 'account-plus-outline'
  | 'file-document-outline'
  | 'headset'
  | 'star-four-points-outline';

export interface TodayOverviewCard {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  icon: TodayOverviewIconName;
  accentColor: string;
  iconBackgroundColor: string;
  cardBackgroundColor: string;
  featured?: boolean;
  scoreDetails?: {
    points: number;
    rank: number;
    previousWeekPoints: number;
  };
}

export interface SalesMetricPeriod {
  label:
    | 'Today'
    | 'This Week'
    | 'This Month'
    | 'Today Meeting'
    | 'This Week Meeting'
    | 'This Month Meeting';
  value: number;
}

export interface SalesSummaryCard {
  id: string;
  type: 'summary';
  title: string;
  icon: TodayOverviewIconName;
  accentColor: string;
  cardBackgroundColor: string;
  values: readonly SalesMetricPeriod[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: TodayOverviewIconName;
  disabled?: boolean;
}

export interface QuickActionsCard {
  id: string;
  type: 'quick-actions';
  title: string;
  accentColor: string;
  cardBackgroundColor: string;
  featured: true;
  actions: readonly QuickAction[];
}

export type SalesActivityCard = SalesSummaryCard | QuickActionsCard;

export type DashboardListPeriod = 'today' | 'thisWeek' | 'thisMonth';

export interface DashboardListItem {
  id: string;
  primaryText: string;
  secondaryText: string;
  dateLabel: string;
  period: DashboardListPeriod;
}

export interface DashboardListCard {
  id: 'lead-collected-list' | 'meeting-done-list' | 'client-created-list' | 'pending-document-list';
  title: string;
  icon: TodayOverviewIconName;
  accentColor: string;
  cardBackgroundColor: string;
  metricLabel: string;
  items: readonly DashboardListItem[];
}

export interface DailyConversionPerformance {
  id: string;
  dayLabel: string;
  fullDateLabel: string;
  meetings: number;
  clients: number;
}
