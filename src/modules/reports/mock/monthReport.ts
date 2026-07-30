import { ReportPreviewData } from '../reportPreview/types';

export const monthReport: ReportPreviewData = {
  variant: 'month',
  header: {
    title: 'Monthly Sales Performance',
    durationLabel: 'This Month',
    generatedLabel: 'Generated on 28 Jul 2026',
  },
  kpis: [
    { label: 'Top Performer', value: 'Abhijeet', hint: '3.8% ahead of the next manager', tone: 'peach' },
    { label: 'Total Points', value: '12,480', hint: 'Across all active sales teams', tone: 'blue' },
    { label: 'Average Points / Week', value: '3,120', hint: 'Monthly average over 4 weeks', tone: 'green' },
    { label: 'Highest Week', value: 'Week 3', hint: '3,540 points recorded', tone: 'pink' },
    { label: 'Active Employees', value: '14', hint: '13 sales managers + 1 leader', tone: 'mint' },
  ],
  trend: {
    title: 'Week Wise Points Chart',
    subtitle: 'Performance across the current month',
    points: [
      { label: 'Week 1', value: 2540, color: '#fb8e5d' },
      { label: 'Week 2', value: 2980, color: '#60a5fa' },
      { label: 'Week 3', value: 3540, color: '#4ade80' },
      { label: 'Week 4', value: 3420, color: '#a855f7' },
    ],
  },
  leaderboard: {
    title: 'Top 10 Employees',
    rows: [
      { rank: 1, name: 'Abhijeet', points: 1280 },
      { rank: 2, name: 'Rakesh', points: 1140 },
      { rank: 3, name: 'Umakant', points: 1020 },
      { rank: 4, name: 'Atul', points: 980 },
      { rank: 5, name: 'Rajat', points: 940 },
      { rank: 6, name: 'Sunny', points: 920 },
      { rank: 7, name: 'Satyam', points: 880 },
      { rank: 8, name: 'Ameet', points: 860 },
      { rank: 9, name: 'Garv', points: 810 },
      { rank: 10, name: 'Tejprakash', points: 790 },
    ],
  },
  improvements: {
    title: 'Top Improvements',
    rows: [
      { name: 'Harsh.P', before: 620, after: 890, gain: 270 },
      { name: 'Amit', before: 540, after: 760, gain: 220 },
      { name: 'Abhay', before: 510, after: 710, gain: 200 },
      { name: 'Saket', before: 490, after: 650, gain: 160 },
      { name: 'Ashutosh', before: 470, after: 610, gain: 140 },
    ],
  },
  insights: {
    title: 'AI Insights',
    bullets: [
      'Week 3 delivered the strongest points momentum, driven by higher client conversions.',
      'Abhijeet and Rakesh are maintaining the top performance band with stable weekly gains.',
      'Meeting efficiency improved in teams with the highest client-to-meeting conversion ratio.',
      'A focused follow-up cadence could unlock another 6 to 8 percent point uplift next month.',
    ],
  },
};
