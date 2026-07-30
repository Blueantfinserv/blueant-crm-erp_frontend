export type DashboardLeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
};

export type DashboardMetricValue = {
  target: number;
  achieved: number;
};

export type DashboardPerformanceRow = {
  employee: string;
  meetings: {
    yesterday: number;
    today: number;
  };
  clients: {
    yesterday: number;
    today: number;
  };
  leads: DashboardMetricValue;
  meetingsWeek: DashboardMetricValue;
  clientsWeek: DashboardMetricValue;
  documentsReceived: number;
  points: number;
};

export type DashboardDateRange = {
  from: string;
  to: string;
};

export type DashboardDateFilterState = {
  from: Date | null;
  to: Date | null;
};

export type DashboardDateFilterDisplayState = {
  from: string;
  to: string;
};

export type DashboardDatePickerState = {
  openField: 'from' | 'to' | null;
  viewedMonth: Date;
};

export type DashboardTableColumn = {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'center';
  valueType?: 'text' | 'number';
};

export type DashboardTableRow = {
  id: string;
  employee: string;
  values: Array<string | number>;
};

export type DashboardSummaryCard = {
  label: string;
  value: number;
  tone: 'blue' | 'orange' | 'purple';
};

export type DashboardTeamMetric = {
  achieved: number;
  target: number;
  pendingPercent: number;
};

export type DashboardTeamMemberPerformance = {
  rank: number;
  name: string;
  yesterdayMeetings: number;
  yesterdayClients: number;
  todayMeetings: number;
  todayClients: number;
  leads: DashboardTeamMetric;
  meetings: DashboardTeamMetric;
  clients: DashboardTeamMetric;
  documentsReceived: number;
  points: number;
  vacant?: boolean;
};

export type DashboardTeamPerformanceGroup = {
  teamName: string;
  tone: 'peach' | 'blue' | 'green';
  summary: {
    members: number;
    avgPoints: number;
    avgMeetings: number;
    rptClients: number;
  };
  members: DashboardTeamMemberPerformance[];
};

export type DashboardSecondaryPerformanceMember = {
  rank: number;
  name: string;
  meetingBreakupKey?: string;
  yesterdayMeetings: number;
  yesterdayClients: number;
  todayMeetings: number;
  todayClients: number;
  teamMeetings: number;
  selfMeetings: number;
  clients: {
    actual: number;
    documentsReceived: number;
  };
  sachinSir: number;
  points: number;
};

export type DashboardSecondaryPerformanceGroup = {
  tone: 'peach' | 'blue' | 'green' | 'purple';
  footerLabel: string;
  summary: {
    members: number;
    avgPoints: number;
  };
  members: DashboardSecondaryPerformanceMember[];
};
