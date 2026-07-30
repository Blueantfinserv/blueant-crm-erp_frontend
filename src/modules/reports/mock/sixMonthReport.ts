import { ReportPreviewData } from '../reportPreview/types';

export const sixMonthReport: ReportPreviewData = {
  variant: 'sixMonth',
  header: {
    title: 'Half-Year Sales Performance',
    durationLabel: 'Last 6 Months',
    generatedLabel: 'Generated on 28 Jul 2026',
  },
  kpis: [
    { label: 'Top Performer', value: 'Atul', hint: 'Highest sustained 6-month average', tone: 'blue' },
    { label: 'Total Points', value: '72,960', hint: 'All active leaders and sales managers', tone: 'peach' },
    { label: 'Average Points / Month', value: '12,160', hint: 'Monthly mean across 6 months', tone: 'green' },
    { label: 'Highest Month', value: 'May', hint: '13,840 points recorded', tone: 'pink' },
    { label: 'Active Employees', value: '14', hint: 'Fully active team set', tone: 'mint' },
  ],
  trend: {
    title: 'Month Wise Points',
    subtitle: 'Performance from January to June',
    points: [
      { label: 'Jan', value: 11440, color: '#fb8e5d' },
      { label: 'Feb', value: 11840, color: '#60a5fa' },
      { label: 'Mar', value: 12360, color: '#4ade80' },
      { label: 'Apr', value: 12120, color: '#f472b6' },
      { label: 'May', value: 13840, color: '#a855f7' },
      { label: 'Jun', value: 13360, color: '#14b8a6' },
    ],
  },
  monthTopPerformers: {
    title: 'Month Wise Top Performer',
    rows: [
      { period: 'Jan', name: 'Abhijeet', points: 1840 },
      { period: 'Feb', name: 'Atul', points: 1920 },
      { period: 'Mar', name: 'Rajat', points: 2010 },
      { period: 'Apr', name: 'Ameet', points: 2140 },
      { period: 'May', name: 'Sunny', points: 2330 },
      { period: 'Jun', name: 'Rakesh', points: 2280 },
    ],
  },
  leaderboard: {
    title: 'Leaderboard',
    rows: [
      { rank: 1, name: 'Atul', points: 4320 },
      { rank: 2, name: 'Abhijeet', points: 4210 },
      { rank: 3, name: 'Rajat', points: 4080 },
      { rank: 4, name: 'Rakesh', points: 3980 },
      { rank: 5, name: 'Sunny', points: 3860 },
      { rank: 6, name: 'Ameet', points: 3750 },
      { rank: 7, name: 'Satyam', points: 3620 },
      { rank: 8, name: 'Tejprakash', points: 3500 },
      { rank: 9, name: 'Abhay', points: 3430 },
      { rank: 10, name: 'Garv', points: 3360 },
    ],
  },
  insights: {
    title: 'AI Insights',
    bullets: [
      'The team has remained within a narrow, healthy performance band for six straight months.',
      'May posted the steepest increase, suggesting a stronger pipeline conversion ratio.',
      'Atul and Abhijeet are emerging as the most consistent performers in the half-year window.',
      'Replicating May’s meeting follow-up rhythm could improve the next quarter baseline.',
    ],
  },
};
