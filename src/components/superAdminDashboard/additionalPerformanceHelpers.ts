import type { DashboardSecondaryPerformanceGroup, DashboardSecondaryPerformanceMember } from '../../screens/dashboard/dashboardTypes';

export type MeetingBreakupEntry = {
  name: string;
  meetings: number;
};

export type MeetingBreakupMap = Record<string, MeetingBreakupEntry[]>;

export const DEFAULT_SUMMARY_BOX_WIDTH = 172;
export const CARD_HORIZONTAL_PADDING = 32;
export const columnSpecs = {
  rank: { width: 44, align: 'center', marginRight: 5 },
  name: { width: 98, align: 'left' },
  yesterdayMeetings: { width: 76 },
  yesterdayClients: { width: 64 },
  todayMeetings: { width: 76 },
  todayClients: { width: 64 },
  teamMeetings: { width: 82 },
  selfMeetings: { width: 82 },
  clients: { width: 110 },
  sachinSir: { width: 88 },
  points: { width: 62 },
  total: { width: 70 },
} as const;

export const tableWidth =
  columnSpecs.rank.width +
  (columnSpecs.rank.marginRight ?? 0) +
  columnSpecs.name.width +
  columnSpecs.yesterdayMeetings.width +
  columnSpecs.yesterdayClients.width +
  columnSpecs.todayMeetings.width +
  columnSpecs.todayClients.width +
  columnSpecs.teamMeetings.width +
  columnSpecs.selfMeetings.width +
  columnSpecs.clients.width +
  columnSpecs.sachinSir.width +
  columnSpecs.points.width +
  columnSpecs.total.width -
  70;

export const MOCK_MEETING_BREAKUPS: MeetingBreakupMap = {
  ALOK: [
    { name: 'Abhay', meetings: 2 },
    { name: 'Tejprakash', meetings: 4 },
    { name: 'Amit', meetings: 0 },
    { name: 'Abhijeet', meetings: 0 },
    { name: 'Harsh.P', meetings: 0 },
  ],
  HARSH: [
    { name: 'Garv', meetings: 0 },
    { name: 'Rakesh', meetings: 0 },
    { name: 'Ameet', meetings: 0 },
    { name: 'Atul', meetings: 0 },
    { name: 'Rajat', meetings: 0 },
  ],
  ASHUTOSH: [
    { name: 'Sunny', meetings: 0 },
    { name: 'Saket', meetings: 0 },
    { name: 'Satyam', meetings: 0 },
    { name: 'Umakant', meetings: 0 },
  ],
};

function normalizeMemberName(memberName: string | undefined | null) {
  return (memberName ?? '').trim().toUpperCase();
}

export function getMeetingBreakup(
  memberName: string | undefined | null,
  breakups: MeetingBreakupMap,
): MeetingBreakupEntry[] | null {
  const key = normalizeMemberName(memberName);
  if (!key) return null;
  return breakups[key] ?? null;
}

export function buildAdditionalFooterSummary(groups: DashboardSecondaryPerformanceGroup[]) {
  const members = groups.flatMap((group) => group.members);
  const totals = members.reduce(
    (acc, member) => {
      acc.yesterdayMeetings += member.yesterdayMeetings;
      acc.yesterdayClients += member.yesterdayClients;
      acc.todayMeetings += member.todayMeetings;
      acc.todayClients += member.todayClients;
      acc.teamMeetings += member.teamMeetings;
      acc.selfMeetings += member.selfMeetings;
      acc.clientsActual += member.clients.actual;
      acc.clientsDocuments += member.clients.documentsReceived;
      acc.sachinSir += member.sachinSir;
      acc.points += member.points;
      return acc;
    },
    {
      yesterdayMeetings: 0,
      yesterdayClients: 0,
      todayMeetings: 0,
      todayClients: 0,
      teamMeetings: 0,
      selfMeetings: 0,
      clientsActual: 0,
      clientsDocuments: 0,
      sachinSir: 0,
      points: 0,
    },
  );

  const count = members.length || 1;

  return {
    label: 'WEEK TOTAL',
    yesterdayMeetings: totals.yesterdayMeetings,
    yesterdayClients: totals.yesterdayClients,
    todayMeetings: totals.todayMeetings,
    todayClients: totals.todayClients,
    teamMeetings: totals.teamMeetings,
    selfMeetings: totals.selfMeetings,
    clients: {
      actual: totals.clientsActual,
      documentsReceived: totals.clientsDocuments,
    },
    sachinSir: totals.sachinSir,
    points: Math.round(totals.points / count),
    total:
      totals.yesterdayMeetings +
      totals.yesterdayClients +
      totals.todayMeetings +
      totals.todayClients +
      totals.teamMeetings +
      totals.selfMeetings +
      totals.clientsActual +
      totals.clientsDocuments +
      totals.sachinSir +
      totals.points,
  };
}

export function getMemberTotal(member: DashboardSecondaryPerformanceMember) {
  return (
    member.yesterdayMeetings +
    member.yesterdayClients +
    member.todayMeetings +
    member.todayClients +
    member.teamMeetings +
    member.selfMeetings +
    member.clients.actual +
    member.clients.documentsReceived +
    member.sachinSir +
    member.points
  );
}
