import type { DashboardLeaderboardEntry, DashboardSummaryCard } from './dashboardTypes';

export const dashboardLeaderboardCards = {
  performers: [
    { rank: 1, name: 'Abhijeet', score: 100 },
    { rank: 2, name: 'Rakesh', score: 90 },
    { rank: 3, name: 'Umakant', score: 80 },
  ],
  meetings: [
    { rank: 1, name: 'Atul', score: 48 },
    { rank: 2, name: 'Rajat', score: 43 },
    { rank: 3, name: 'Amit', score: 39 },
  ],
  convertedClients: [
    { rank: 1, name: 'Ameet', score: 31 },
    { rank: 2, name: 'Saket', score: 28 },
    { rank: 3, name: 'Garv', score: 26 },
  ],
  teamPerformance: [
    { rank: 1, name: 'Alok Team', score: 100 },
    { rank: 2, name: 'Ashutosh Team', score: 80 },
    { rank: 3, name: 'Harsh Team', score: 70 },
  ],
} satisfies Record<string, DashboardLeaderboardEntry[]>;

export const dashboardSummaryCardsByPeriod: Record<string, DashboardSummaryCard[]> = {
  'Current Week': [
    { label: 'Today', value: 26, tone: 'blue' },
    { label: 'Yesterday', value: 31, tone: 'orange' },
    { label: 'Current Week', value: 1275, tone: 'purple' },
    { label: 'Total SMs', value: 8, tone: 'blue' },
  ],
  Today: [
    { label: 'Today', value: 14, tone: 'blue' },
    { label: 'Yesterday', value: 19, tone: 'orange' },
    { label: 'Current Week', value: 185, tone: 'purple' },
    { label: 'Total SMs', value: 4, tone: 'blue' },
  ],
  Yesterday: [
    { label: 'Today', value: 11, tone: 'blue' },
    { label: 'Yesterday', value: 29, tone: 'orange' },
    { label: 'Current Week', value: 218, tone: 'purple' },
    { label: 'Total SMs', value: 4, tone: 'blue' },
  ],
};
