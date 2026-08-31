import { DashboardListCard } from '../types/dashboard';

export const dashboardListsData: readonly DashboardListCard[] = [
  {
    id: 'lead-collected-list',
    title: 'Lead Collected List',
    icon: 'account-plus-outline',
    accentColor: '#2563EB',
    cardBackgroundColor: '#F8FBFF',
    metricLabel: 'Leads Collected',
    items: [],
  },
  {
    id: 'meeting-done-list',
    title: 'Meeting Conducted List',
    icon: 'calendar-today',
    accentColor: '#16A34A',
    cardBackgroundColor: '#F5FCF7',
    metricLabel: 'Meetings Conducted',
    items: [],
  },
  {
    id: 'client-created-list',
    title: 'Client Created List',
    icon: 'star-four-points-outline',
    accentColor: '#8B5CF6',
    cardBackgroundColor: '#FAF8FF',
    metricLabel: 'Clients Created',
    items: [],
  },
  {
    id: 'pending-document-list',
    title: 'Pending Document List',
    icon: 'file-document-outline',
    accentColor: '#F97316',
    cardBackgroundColor: '#FFFAF5',
    metricLabel: 'Pending Documents',
    items: [],
  },
];
