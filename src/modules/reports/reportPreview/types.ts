export type ReportVariant = 'month' | 'sixMonth' | 'year';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportHeaderData {
  title: string;
  durationLabel: string;
  generatedLabel: string;
}

export interface KpiCardData {
  label: string;
  value: string;
  hint: string;
  tone: 'peach' | 'blue' | 'green' | 'pink' | 'mint' | 'sky';
}

export interface TrendPointData {
  label: string;
  value: number;
  color: string;
}

export interface LeaderboardRowData {
  rank: number;
  name: string;
  points: number;
}

export interface ImprovementRowData {
  name: string;
  before: number;
  after: number;
  gain: number;
}

export interface MonthTopPerformerRowData {
  period: string;
  name: string;
  points: number;
}

export interface QuarterSummaryRowData {
  quarter: string;
  points: number;
  meetings: number;
  clients: number;
  topPerformer: string;
}

export interface ReportPreviewData {
  variant: ReportVariant;
  header: ReportHeaderData;
  kpis: KpiCardData[];
  trend: {
    title: string;
    subtitle?: string;
    points: TrendPointData[];
  };
  leaderboard: {
    title: string;
    rows: LeaderboardRowData[];
  };
  improvements?: {
    title: string;
    rows: ImprovementRowData[];
  };
  monthTopPerformers?: {
    title: string;
    rows: MonthTopPerformerRowData[];
  };
  quarterSummary?: {
    title: string;
    rows: QuarterSummaryRowData[];
  };
  insights: {
    title: string;
    bullets: string[];
  };
}
