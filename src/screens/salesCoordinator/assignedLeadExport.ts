import type { LeadResponse } from '../../types/lead';
import type { MeetingResponse } from '../../types/meeting';
import { digitsOnly, timeText } from './coordinatorUtils';

export const ASSIGNED_LEAD_EXPORT_HEADERS = [
  'Client Name', 'Mobile Number', 'Speciality', 'Location', 'Clinic Address', 'Sales Person',
  'Sales Coordinator', 'Assigned Date', 'Current Lead Status', 'SC Age Group',
  'SC Prior Investment', 'SC Profession', 'SC Firm / Clinic', 'SC Best Time', 'Latest Meeting Type',
  'Latest Meeting Status', 'Latest Meeting Date', 'Latest Meeting Time', 'Latest Meeting Mode',
  'Latest Meeting Lead Status', 'Latest Meeting Joined With', 'Latest Meeting Person Name',
  'Latest Meeting Person Position', 'Latest Meeting Remarks', 'Latest Next Plan Date', 'Meeting ID',
  'Lead ID',
  // 'Lead Code',
  // 'Unique Lead ID',
  // 'Email',
  // 'Alternate Mobile Number',
  // 'Company Name',
  // 'Lead Source',
  // 'Lead Stage',
  // 'Lead Remarks',
  // 'Assignment Source',
  // 'Latest Meeting Code',
  // 'Latest Meeting Verification Status',
  // 'Latest Meeting Verification Remarks',
  // 'Latest Meeting Next Meeting Time',
] as const;

const assignedStamp = (lead: LeadResponse) => String(lead.assignedAt ?? lead.assignmentDate ?? lead.assignedDate ?? '');
const meetingSortKey = (meeting: MeetingResponse) =>
  `${String(meeting.meetingDate ?? meeting.createdAt ?? '')}T${timeText(meeting.meetingTime)}|${String(meeting.updatedAt ?? meeting.lastModifiedDate ?? '')}`;

export function assignedLeadExportRows(
  leads: readonly LeadResponse[],
  allMeetings: readonly MeetingResponse[],
  pending: readonly MeetingResponse[],
  verified: readonly MeetingResponse[],
) {
  const uniqueLeads = [...leads.reduce((byLead, lead) => {
    const key = lead.uniqueLeadId?.trim() || String(lead.leadId ?? lead.leadCode ?? `${lead.mobileNumber ?? ''}:${lead.clientName ?? ''}`);
    const current = byLead.get(key);
    if (!current || assignedStamp(lead) > assignedStamp(current)) byLead.set(key, lead);
    return byLead;
  }, new Map<string, LeadResponse>()).values()];
  const meetingByCode = new Map<string, MeetingResponse>();
  [...allMeetings, ...pending, ...verified].forEach((meeting) => {
    const key = meeting.meetingCode ?? String(meeting.id ?? '');
    if (key) meetingByCode.set(key, { ...meetingByCode.get(key), ...meeting });
  });
  return uniqueLeads.map((lead) => {
    const latestMeeting = [...meetingByCode.values()]
      .filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId)
        || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
        || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber)))
      .sort((left, right) => meetingSortKey(right).localeCompare(meetingSortKey(left)))[0];
    return [
      lead.clientName, lead.mobileNumber, lead.speciality, lead.location, lead.clinicAddress,
      lead.assignedEmployeeName, lead.assignedByEmployeeName, lead.assignedAt, lead.leadStatus?.replace(/_/g, ' '),
      latestMeeting?.ageGroup, latestMeeting?.existingSip, latestMeeting?.profession, latestMeeting?.professionDetail, latestMeeting?.bestTimeForMeeting,
      latestMeeting?.meetingTitle ?? latestMeeting?.meetingType, latestMeeting?.meetingStatus, latestMeeting?.meetingDate, timeText(latestMeeting?.meetingTime), latestMeeting?.meetingMode, latestMeeting?.leadStatus?.replace(/_/g, ' '), latestMeeting?.aloneWith, latestMeeting?.personName, latestMeeting?.position, latestMeeting?.remarks ?? latestMeeting?.meetingRemarks ?? latestMeeting?.discussion, latestMeeting?.nextMeetingDate,
      latestMeeting?.id, lead.leadId,
      // lead.leadCode ?? '',
      // lead.uniqueLeadId ?? '',
      // lead.email ?? '',
      // lead.alternateMobileNumber ?? '',
      // lead.companyName ?? '',
      // lead.leadSource ?? '',
      // lead.leadStage ?? '',
      // lead.remarks ?? '',
      // lead.assignmentSource ?? '',
      // latestMeeting?.meetingCode ?? '',
      // latestMeeting?.verificationStatus ?? '',
      // latestMeeting?.verificationRemarks ?? '',
      // latestMeeting?.nextMeetingTime ? timeText(latestMeeting.nextMeetingTime) : '',
    ];
  });
}
