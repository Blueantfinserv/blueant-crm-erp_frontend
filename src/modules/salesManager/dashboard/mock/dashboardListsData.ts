import { DashboardListCard } from '../types/dashboard';

export const dashboardListsData: readonly DashboardListCard[] = [
  {
    id: 'lead-collected-list',
    title: 'Lead Collected List',
    icon: 'account-plus-outline',
    accentColor: '#2563EB',
    cardBackgroundColor: '#F8FBFF',
    metricLabel: 'Leads Collected',
    items: [
      { id: 'lead-1', primaryText: 'Aarav Mehta', secondaryText: 'Website enquiry', dateLabel: 'Today, 10:30 AM', period: 'today' },
      { id: 'lead-2', primaryText: 'Isha Industries', secondaryText: 'Referral lead', dateLabel: 'Today, 9:15 AM', period: 'today' },
      { id: 'lead-3', primaryText: 'Nova Retail', secondaryText: 'Campaign response', dateLabel: 'Monday, 3:20 PM', period: 'thisWeek' },
      { id: 'lead-4', primaryText: 'Apex Foods', secondaryText: 'Walk-in enquiry', dateLabel: 'Monday, 11:45 AM', period: 'thisWeek' },
      { id: 'lead-5', primaryText: 'Urban Nest', secondaryText: 'Social media lead', dateLabel: 'Jul 18, 2026', period: 'thisMonth' },
      { id: 'lead-6', primaryText: 'Orchid Healthcare', secondaryText: 'Partner referral', dateLabel: 'Jul 9, 2026', period: 'thisMonth' },
    ],
  },
  {
    id: 'meeting-done-list',
    title: 'Meeting Conducted List',
    icon: 'calendar-today',
    accentColor: '#16A34A',
    cardBackgroundColor: '#F5FCF7',
    metricLabel: 'Meetings Conducted',
    items: [
      { id: 'meeting-1', primaryText: 'Nova Retail', secondaryText: 'Discovery meeting', dateLabel: 'Today, 2:00 PM', period: 'today' },
      { id: 'meeting-2', primaryText: 'Isha Industries', secondaryText: 'Proposal review', dateLabel: 'Today, 11:00 AM', period: 'today' },
      { id: 'meeting-3', primaryText: 'Apex Foods', secondaryText: 'Product demonstration', dateLabel: 'Tuesday, 4:15 PM', period: 'thisWeek' },
      { id: 'meeting-4', primaryText: 'BlueSky Technologies', secondaryText: 'Follow-up meeting', dateLabel: 'Monday, 1:30 PM', period: 'thisWeek' },
      { id: 'meeting-5', primaryText: 'Urban Nest', secondaryText: 'Requirement discussion', dateLabel: 'Jul 16, 2026', period: 'thisMonth' },
    ],
  },
  {
    id: 'client-created-list',
    title: 'Client Created List',
    icon: 'star-four-points-outline',
    accentColor: '#8B5CF6',
    cardBackgroundColor: '#FAF8FF',
    metricLabel: 'Clients Created',
    items: [
      { id: 'client-1', primaryText: 'BlueSky Technologies', secondaryText: 'Enterprise client', dateLabel: 'Today, 12:20 PM', period: 'today' },
      { id: 'client-2', primaryText: 'Orchid Healthcare', secondaryText: 'Growth client', dateLabel: 'Tuesday, 10:10 AM', period: 'thisWeek' },
      { id: 'client-3', primaryText: 'Urban Nest', secondaryText: 'Standard client', dateLabel: 'Monday, 5:00 PM', period: 'thisWeek' },
      { id: 'client-4', primaryText: 'Horizon Exports', secondaryText: 'Enterprise client', dateLabel: 'Jul 14, 2026', period: 'thisMonth' },
    ],
  },
  {
    id: 'pending-document-list',
    title: 'Pending Document List',
    icon: 'file-document-outline',
    accentColor: '#F97316',
    cardBackgroundColor: '#FFFAF5',
    metricLabel: 'Pending Documents',
    items: [
      { id: 'document-1', primaryText: 'KYC documents', secondaryText: 'Nova Retail', dateLabel: 'Due today', period: 'today' },
      { id: 'document-2', primaryText: 'Signed agreement', secondaryText: 'Apex Foods', dateLabel: 'Due today', period: 'today' },
      { id: 'document-3', primaryText: 'GST certificate', secondaryText: 'Urban Nest', dateLabel: 'Due Friday', period: 'thisWeek' },
      { id: 'document-4', primaryText: 'Company PAN', secondaryText: 'Orchid Healthcare', dateLabel: 'Due Thursday', period: 'thisWeek' },
      { id: 'document-5', primaryText: 'Bank verification', secondaryText: 'Horizon Exports', dateLabel: 'Due Jul 31', period: 'thisMonth' },
    ],
  },
];
