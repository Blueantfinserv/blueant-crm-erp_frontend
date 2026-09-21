import { SalesActivityCard } from '../types/dashboard';

export const salesActivityData: readonly SalesActivityCard[] = [
  {
    id: 'clients-created',
    type: 'summary',
    title: 'Client Created',
    icon: 'star-four-points-outline',
    accentColor: '#8B5CF6',
    cardBackgroundColor: '#FAF8FF',
    values: [
      { label: 'Today', value: '-' },
      { label: 'This Week', value: '-' },
      { label: 'Last Month', value: '-' },
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
      { label: 'Today Meeting', value: '-' },
      { label: 'This Week Meeting', value: '-' },
      { label: 'Last Month Meeting', value: '-' },
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
      { id: 'service-request', label: 'Service Request', icon: 'headset' },
      { id: 'future-action-one', label: '', disabled: true },
      { id: 'future-action-two', label: '', disabled: true },
    ],
  },
];
