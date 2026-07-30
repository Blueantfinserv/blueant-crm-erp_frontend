import type { DashboardTeamPerformanceGroup } from '../../screens/dashboard/dashboardTypes';

export function getCurrentWeekTableLayout(containerWidth: number) {
  const base = {
    rank: 46,
    rankGap: 5,
    name: 80,
    yestMeet: 75,
    yestCl: 66,
    todayMeet: 78,
    todayCl: 66,
    leads: 80,
    meetings: 102,
    tgtRpt: 102,
    doc: 58,
    points: 64,
    summary: 188,
  };

  const totalBase =
    base.rank +
    base.rankGap +
    base.name +
    base.yestMeet +
    base.yestCl +
    base.todayMeet +
    base.todayCl +
    base.leads +
    base.meetings +
    base.tgtRpt +
    base.doc +
    base.points +
    base.summary;

  const available = Math.max(containerWidth - 40, 0);
  const scale = Math.max(0.82, Math.min(1.18, available / totalBase));
  const shrink = (value: number) => Math.max(Math.round(value * scale), Math.max(20, Math.round(value * 0.72)));

  return {
    rank: shrink(base.rank),
    rankGap: Math.max(3, Math.round(base.rankGap * scale)),
    name: shrink(base.name),
    yestMeet: shrink(base.yestMeet),
    yestCl: shrink(base.yestCl),
    todayMeet: shrink(base.todayMeet),
    todayCl: shrink(base.todayCl),
    leads: shrink(base.leads),
    meetings: shrink(base.meetings),
    tgtRpt: shrink(base.tgtRpt),
    doc: shrink(base.doc),
    points: shrink(base.points),
    summary: shrink(base.summary),
    body: shrink(totalBase - base.summary),
    total: shrink(totalBase),
  };
}

export function buildCurrentWeekFooterSummary(groups: DashboardTeamPerformanceGroup[]) {
  const members = groups.flatMap((group) => group.members.filter((member) => !member.vacant));
  const totals = members.reduce(
    (acc, member) => {
      acc.yesterdayMeetings += member.yesterdayMeetings;
      acc.yesterdayClients += member.yesterdayClients;
      acc.todayMeetings += member.todayMeetings;
      acc.todayClients += member.todayClients;
      acc.leadsAchieved += member.leads.achieved;
      acc.leadsTarget += member.leads.target;
      acc.meetingsAchieved += member.meetings.achieved;
      acc.meetingsTarget += member.meetings.target;
      acc.clientsAchieved += member.clients.achieved;
      acc.clientsTarget += member.clients.target;
      acc.documentsReceived += member.documentsReceived;
      acc.points += member.points;
      return acc;
    },
    {
      yesterdayMeetings: 0,
      yesterdayClients: 0,
      todayMeetings: 0,
      todayClients: 0,
      leadsAchieved: 0,
      leadsTarget: 0,
      meetingsAchieved: 0,
      meetingsTarget: 0,
      clientsAchieved: 0,
      clientsTarget: 0,
      documentsReceived: 0,
      points: 0,
    },
  );

  const count = members.length || 1;

  return {
    yesterdayMeetings: totals.yesterdayMeetings,
    yesterdayClients: totals.yesterdayClients,
    todayMeetings: totals.todayMeetings,
    todayClients: totals.todayClients,
    leads: {
      achieved: totals.leadsAchieved,
      target: totals.leadsTarget,
      pendingPercent: Math.max(0, Math.round(100 - (totals.leadsAchieved / Math.max(totals.leadsTarget, 1)) * 100)),
    },
    meetings: {
      achieved: totals.meetingsAchieved,
      target: totals.meetingsTarget,
      pendingPercent: Math.max(0, Math.round(100 - (totals.meetingsAchieved / Math.max(totals.meetingsTarget, 1)) * 100)),
    },
    clients: {
      achieved: totals.clientsAchieved,
      target: totals.clientsTarget,
      pendingPercent: Math.max(0, Math.round(100 - (totals.clientsAchieved / Math.max(totals.clientsTarget, 1)) * 100)),
    },
    documentsReceived: totals.documentsReceived,
    points: Math.round(totals.points / count),
  };
}
