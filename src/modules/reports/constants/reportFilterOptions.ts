import { DateRange } from '../reportPreview/types';

export type PeriodKey = 'points' | 'meeting' | 'clients' | 'teamPoints' | 'teamMeeting' | 'teamClients';
export type DropdownKey = PeriodKey | 'smName' | 'reportType' | 'team';
export type ToneKey = 'peach' | 'blue' | 'green' | 'pink' | 'mint' | 'sky';

export interface PeriodCardConfig {
  key: PeriodKey;
  title: string;
  icon: string;
  tone: ToneKey;
}

export const periodOptions = ['This Month', 'Past 3 Months', 'Past 6 Months', 'Custom'];

export const smNameOptions = [
  'Abhijeet',
  'Atul',
  'Sunny',
  'Umakant',
  'Rajat',
  'Satyam',
  'Tejprakash',
  'Saket',
  'Abhay',
  'Harsh .P',
  'Amit',
  'Ameet',
  'Garv',
  'Rakesh',
];

export const reportTypeOptions = ['Points based', 'Client based', 'Meeting based'];

export const teamOptions = ['Alok Team', 'Ashutosh Team', 'Harsh Team'];

export const filterPlaceholder = 'Select a filter';

export const periodCards: PeriodCardConfig[] = [
  { key: 'points', title: 'Points Gained', icon: '📅', tone: 'peach' },
  { key: 'meeting', title: 'Meeting Done', icon: '📅', tone: 'blue' },
  { key: 'clients', title: 'Clients Converted', icon: '📅', tone: 'green' },
  { key: 'teamPoints', title: 'Team Points', icon: '📅', tone: 'pink' },
  { key: 'teamMeeting', title: 'Team Meetings', icon: '📅', tone: 'mint' },
  { key: 'teamClients', title: 'Team Clients', icon: '📅', tone: 'sky' },
];

export function createDefaultRange(): DateRange {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 7);
  return { from, to };
}

export function createDefaultPeriods(): Record<PeriodKey, string> {
  return {
    points: filterPlaceholder,
    meeting: filterPlaceholder,
    clients: filterPlaceholder,
    teamPoints: filterPlaceholder,
    teamMeeting: filterPlaceholder,
    teamClients: filterPlaceholder,
  };
}

export function createDefaultRanges(): Record<PeriodKey, DateRange> {
  const range = createDefaultRange();
  return {
    points: range,
    meeting: createDefaultRange(),
    clients: createDefaultRange(),
    teamPoints: createDefaultRange(),
    teamMeeting: createDefaultRange(),
    teamClients: createDefaultRange(),
  };
}
