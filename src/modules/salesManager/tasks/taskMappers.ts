import type { LeadResponse } from '../../../types/lead';
import type { MeetingResponse } from '../../../types/meeting';
import type { ClientWorkFollowResponse } from '../../../types/crm';
import type { SalesTask } from './types/tasks';
import { formatDate, formatTimestamp } from './taskDateUtils';
import { getTaskSchedule } from './taskMeetingSelectors';

export const meetingTitleOrder = (title: string) => {
  const match = title.match(/^(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

export const mapLeadToSalesTask = (lead: LeadResponse, index: number, meetingNextPlanDate?: string): SalesTask => {
  const nextPlanDate = meetingNextPlanDate ?? lead.nextPlanDate;
  return {
    id: lead.uniqueLeadId ?? lead.leadCode ?? String(lead.leadId ?? `lead-${index}`),
    taskKind: 'LEAD',
    prospectDetails: lead,
    leadCode: lead.leadCode,
    uniqueLeadId: lead.uniqueLeadId,
    meetingCode: lead.currentActiveMeeting?.meetingCode,
    leadId: lead.leadId,
    leadStatus: lead.leadStatus,
    assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt,
    scheduledAt: nextPlanDate ?? lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt,
    name: lead.clientName ?? 'Unnamed prospect',
    phone: lead.mobileNumber ?? '',
    locationText: lead.location ?? 'Location unavailable',
    clinicAddress: lead.clinicAddress,
    coordinates: { latitude: 0, longitude: 0 },
    hasLocationPin: false,
    taskLabel: 'PROSPECTS',
    remarks: lead.remarks ?? 'No remarks available.',
    lastUpdated: formatTimestamp(lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt),
    nextFollowUpDate: formatDate(nextPlanDate),
    nextPlanDate,
    schedule: getTaskSchedule(nextPlanDate),
    email: lead.email,
    leadSource: lead.leadSource,
  };
};

export const mapClientToSalesTask = (client: ClientWorkFollowResponse, index: number): SalesTask => {
  const activeDate = client.activeMeetingDate;
  const scheduledAt = activeDate ?? client.assignmentDate;
  return {
    id: client.clientCode ?? String(client.clientId ?? `client-${index}`), taskKind: 'CLIENT', clientCode: client.clientCode, meetingCode: client.activeMeetingCode,
    assignedAt: client.assignmentDate, scheduledAt, name: client.clientName ?? 'Unnamed client', phone: client.mobileNumber ?? '',
    locationText: client.location ?? 'Location unavailable', clinicAddress: client.clinicAddress, coordinates: { latitude: 0, longitude: 0 },
    hasLocationPin: false, taskLabel: client.activeMeetingCode ? `MEETING ${client.activeMeetingNumber ?? ''}`.trim() : 'CLIENT', remarks: client.activeMeetingCode ? `Active meeting: ${client.activeMeetingCode}` : 'No meeting scheduled.',
    lastUpdated: formatTimestamp(client.assignmentDate), nextFollowUpDate: formatDate(activeDate), nextPlanDate: activeDate,
    schedule: getTaskSchedule(scheduledAt), email: client.email, clientMeetingCount: client.totalMeetings ?? 0,
  };
};

export const mapMeetingToSalesTask = (
  meeting: MeetingResponse,
  index: number,
  lead?: LeadResponse,
  locationMeeting?: MeetingResponse,
  lastMeetingDate?: string,
): SalesTask => ({
  id: meeting.meetingCode ?? String(meeting.id ?? `meeting-${index}`),
  taskKind: 'MEETING',
  prospectDetails: lead,
  leadCode: meeting.leadCode,
  meetingCode: meeting.meetingCode,
  meetingNumber: meeting.meetingNumber,
  meetingTitle: meeting.meetingTitle,
  meetingType: meeting.meetingType,
  meetingStatus: meeting.meetingStatus,
  verificationStatus: meeting.verificationStatus,
  scheduledAt: meeting.meetingDate,
  uniqueLeadId: lead?.uniqueLeadId,
  leadId: meeting.leadId ?? lead?.leadId,
  name: meeting.clientName ?? 'Unnamed client',
  phone: meeting.mobileNumber ?? '',
  locationText: meeting.address ?? locationMeeting?.address ?? meeting.location ?? meeting.meetingLocation ?? locationMeeting?.meetingLocation ?? 'Location unavailable',
  clinicAddress: lead?.clinicAddress,
  coordinates: {
    latitude: meeting.latitude ?? locationMeeting?.latitude ?? 0,
    longitude: meeting.longitude ?? locationMeeting?.longitude ?? 0,
  },
  hasLocationPin: (
    Number.isFinite(meeting.latitude) && Number.isFinite(meeting.longitude)
  ) || (
    Number.isFinite(locationMeeting?.latitude) && Number.isFinite(locationMeeting?.longitude)
  ),
  taskLabel: meeting.meetingTitle ?? '',
  remarks: meeting.remarks ?? 'No remarks available.',
  lastUpdated: formatTimestamp(lastMeetingDate ?? lead?.assignmentDate ?? lead?.assignedDate ?? lead?.assignedAt),
  nextFollowUpDate: formatDate(meeting.meetingDate),
  nextPlanDate: meeting.meetingDate,
  schedule: getTaskSchedule(meeting.meetingDate),
});
