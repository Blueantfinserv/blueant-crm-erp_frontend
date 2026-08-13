export type TaskScheduleFilter = 'Today' | 'Pending' | 'Future 3 Days';

export interface SalesTask {
  id: string;
  taskKind: 'LEAD' | 'MEETING';
  uniqueLeadId?: string;
  meetingCode?: string;
  meetingNumber?: number;
  meetingTitle?: string;
  meetingType?: string;
  meetingStatus?: string;
  leadCode?: string;
  leadId?: number;
  name: string;
  phone: string;
  locationText: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  hasLocationPin?: boolean;
  taskLabel: string;
  remarks: string;
  lastUpdated: string;
  nextFollowUpDate: string;
  schedule: TaskScheduleFilter;
  email?: string;
  leadSource?: string;
}

export const getTaskLeadIdentifier = (task: SalesTask) => (
  task.uniqueLeadId ?? (task.leadId !== undefined ? String(task.leadId) : undefined)
);
