import { SalesActivityCard } from '../types/dashboard';

export const salesActivityData: readonly SalesActivityCard[] = [
  {
    id: 'leads-collected',
    type: 'summary',
    title: 'Lead Collected',
    icon: 'account-plus-outline',
    accentColor: '#2563EB',
    cardBackgroundColor: '#F8FBFF',
    values: [
      { label: 'Today', value: 12 },
      { label: 'This Week', value: 48 },
      { label: 'This Month', value: 164 },
    ],
  },
  {
    id: 'clients-created',
    type: 'summary',
    title: 'Client Created',
    icon: 'star-four-points-outline',
    accentColor: '#8B5CF6',
    cardBackgroundColor: '#FAF8FF',
    values: [
      { label: 'Today', value: 4 },
      { label: 'This Week', value: 19 },
      { label: 'This Month', value: 71 },
    ],
  },
  {
    id: 'meetings-done',
    type: 'summary',
    title: 'Meeting Conducted',
    icon: 'calendar-today',
    accentColor: '#16A34A',
    cardBackgroundColor: '#F5FCF7',
    values: [
      { label: 'Today Meeting', value: 7 },
      { label: 'This Week Meeting', value: 29 },
      { label: 'This Month Meeting', value: 112 },
    ],
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    accentColor: '#F97316',
    cardBackgroundColor: '#FFFAF5',
    featured: true,
    actions: [
      { id: 'new-lead', label: 'New Lead', icon: 'account-plus-outline' },
      { id: 'service-request', label: 'Service Request', icon: 'headset' },
      { id: 'future-action-one', label: '', disabled: true },
      { id: 'future-action-two', label: '', disabled: true },
    ],
  },
];
