import { LeadPriority, LeadStatus } from '../leadData';

export type LeadInfo = {
  leadId: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  industry: string;
  assignedSalesManager: string;
  createdDate: string;
  lastUpdated: string;
  leadStatus: LeadStatus;
  priority: LeadPriority;
};

export type TimelineActivity = {
  icon: string;
  title: string;
  dateTime: string;
  description: string;
  performedBy: string;
};

export type LeadNote = {
  user: string;
  time: string;
  content: string;
};

export type FollowupItem = {
  date: string;
  time: string;
  type: string;
  assignedTo: string;
  status: 'Scheduled' | 'Pending' | 'Completed';
};

export type LeadDocument = {
  fileName: string;
  uploadDate: string;
};

export const leadInfo: LeadInfo = {
  leadId: 'L-2008',
  customerName: 'Pooja Nair',
  company: 'Apex Mobility',
  email: 'pooja.nair@apexmobility.com',
  phone: '+91 98765 12347',
  source: 'Website',
  industry: 'Transportation',
  assignedSalesManager: 'Arjun Malhotra',
  createdDate: '21 Jul 2026, 09:14 AM',
  lastUpdated: '21 Jul 2026, 11:08 AM',
  leadStatus: 'New',
  priority: 'High',
};

export const timelineActivities: TimelineActivity[] = [
  {
    icon: '✦',
    title: 'Lead Created',
    dateTime: '21 Jul 2026, 09:14 AM',
    description: 'Lead captured from the website inquiry form.',
    performedBy: 'System',
  },
  {
    icon: '☎',
    title: 'Phone Call',
    dateTime: '21 Jul 2026, 10:10 AM',
    description: 'Initial qualification call completed with customer.',
    performedBy: 'Arjun Malhotra',
  },
  {
    icon: '✉',
    title: 'WhatsApp Sent',
    dateTime: '21 Jul 2026, 10:35 AM',
    description: 'Shared product brochure and pricing overview.',
    performedBy: 'Arjun Malhotra',
  },
  {
    icon: '✉',
    title: 'Email Sent',
    dateTime: '21 Jul 2026, 11:00 AM',
    description: 'Follow-up email with company profile and brochure.',
    performedBy: 'Arjun Malhotra',
  },
  {
    icon: '🗓',
    title: 'Meeting Scheduled',
    dateTime: '21 Jul 2026, 11:08 AM',
    description: 'Discovery meeting booked for product discussion.',
    performedBy: 'Arjun Malhotra',
  },
  {
    icon: '✓',
    title: 'Follow-up Completed',
    dateTime: '21 Jul 2026, 11:12 AM',
    description: 'Lead confirmed availability for the meeting slot.',
    performedBy: 'Arjun Malhotra',
  },
];

export const leadNotes: LeadNote[] = [
  {
    user: 'Arjun Malhotra',
    time: '11:05 AM',
    content: 'Customer is evaluating proposals from two vendors and wants a quick turnaround.',
  },
  {
    user: 'Pooja Nair',
    time: '11:12 AM',
    content: 'Confirmed interest in enterprise mobility solution with monthly billing.',
  },
  {
    user: 'Arjun Malhotra',
    time: '11:18 AM',
    content: 'Shared product deck and highlighted implementation support process.',
  },
  {
    user: 'Sales Ops',
    time: '11:32 AM',
    content: 'Updated priority to High after qualification call.',
  },
  {
    user: 'Arjun Malhotra',
    time: '11:45 AM',
    content: 'Scheduled next touchpoint for tomorrow after internal review.',
  },
];

export const followupItems: FollowupItem[] = [
  {
    date: '22 Jul 2026',
    time: '10:00 AM',
    type: 'Discovery Meeting',
    assignedTo: 'Arjun Malhotra',
    status: 'Scheduled',
  },
  {
    date: '23 Jul 2026',
    time: '04:30 PM',
    type: 'Proposal Review',
    assignedTo: 'Arjun Malhotra',
    status: 'Pending',
  },
  {
    date: '24 Jul 2026',
    time: '02:15 PM',
    type: 'Commercial Discussion',
    assignedTo: 'Arjun Malhotra',
    status: 'Pending',
  },
];

export const leadDocuments: LeadDocument[] = [
  { fileName: 'PAN.pdf', uploadDate: '21 Jul 2026' },
  { fileName: 'Aadhaar.pdf', uploadDate: '21 Jul 2026' },
  { fileName: 'GST.pdf', uploadDate: '21 Jul 2026' },
  { fileName: 'Company Profile.pdf', uploadDate: '21 Jul 2026' },
];

