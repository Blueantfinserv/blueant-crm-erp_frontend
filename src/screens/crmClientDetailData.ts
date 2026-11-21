import type { ClientMeetingResponse, ClientProfileResponse } from '../types/crm';
import type { SalesTask } from '../modules/salesManager/tasks/types/tasks';
import { mapClientToSalesTask } from '../modules/salesManager/tasks/taskMappers';
import { latestClientMeeting } from '../utils/clientHistorySelectors';
import { formatTimestamp } from '../modules/salesManager/tasks/taskDateUtils';

export const crmClientDetailTask = (profile: ClientProfileResponse, history: readonly ClientMeetingResponse[]): SalesTask => {
  const latest = latestClientMeeting(history);
  const task = mapClientToSalesTask({
    clientId: profile.id, clientCode: profile.clientCode,
    clientName: profile.clientName, mobileNumber: profile.mobileNumber,
    location: profile.location ?? profile.city,
    clinicAddress: profile.clinicAddress ?? profile.officeAddress,
    assignmentDate: profile.assignmentDate ?? profile.assignedAt,
    activeMeetingCode: latest?.meetingCode,
    activeMeetingNumber: latest?.meetingNumber,
    activeMeetingDate: latest?.nextPlanDate,
  }, 0);
  return {
    ...task, email: profile.email,
    remarks: latest?.remarks?.trim() || profile.remarks?.trim() || 'No meeting remarks recorded.',
    lastUpdated: formatTimestamp(latest?.meetingDate ?? profile.assignmentDate ?? profile.assignedAt),
  };
};

export const mergeCrmClientProfile = (existing: ClientProfileResponse, fresh: ClientProfileResponse): ClientProfileResponse => ({
  ...existing,
  ...Object.fromEntries(Object.entries(fresh).filter(([, value]) => value !== undefined && value !== null)),
});
