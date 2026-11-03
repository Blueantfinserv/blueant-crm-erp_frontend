import type { LeadResponse } from '../types/lead';
import type { MeetingResponse } from '../types/meeting';
import { digitsOnly, timeText } from './salesCoordinator/coordinatorUtils';

// Preserve the existing PC export schema and selection rules verbatim.
export function buildCrmAssignedLeadExport(leads: LeadResponse[], allMeetings: MeetingResponse[], pending: MeetingResponse[], verified: MeetingResponse[]) {
      const assignedStamp = (lead: LeadResponse) => String(lead.assignedAt ?? lead.assignmentDate ?? lead.assignedDate ?? '');
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
      const sortKey = (m: MeetingResponse) => `${String(m.meetingDate ?? m.createdAt ?? '')}T${timeText(m.meetingTime)}|${String(m.updatedAt ?? m.lastModifiedDate ?? '')}`;
      const rows = uniqueLeads.map((lead) => {
        const latestMeeting = [...meetingByCode.values()]
          .filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber)))
          .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))[0];
        return [
          lead.clientName, lead.mobileNumber, lead.speciality, lead.location, lead.clinicAddress,
          lead.assignedEmployeeName, lead.assignedByEmployeeName, lead.assignedAt, lead.leadStatus?.replace(/_/g, ' '),
          latestMeeting?.ageGroup, latestMeeting?.existingSip, latestMeeting?.profession, latestMeeting?.professionDetail, latestMeeting?.bestTimeForMeeting,
          latestMeeting?.meetingTitle ?? latestMeeting?.meetingType, latestMeeting?.meetingStatus, latestMeeting?.meetingDate, timeText(latestMeeting?.meetingTime), latestMeeting?.meetingMode, latestMeeting?.leadStatus?.replace(/_/g, ' '), latestMeeting?.aloneWith, latestMeeting?.personName, latestMeeting?.position, latestMeeting?.remarks ?? latestMeeting?.meetingRemarks ?? latestMeeting?.discussion, latestMeeting?.nextMeetingDate,
          latestMeeting?.id, lead.leadId,
        ];
      });
      const headers = ['Client Name', 'Mobile Number', 'Speciality', 'Location', 'Clinic Address', 'Sales Person', 'Sales Coordinator', 'Assigned Date', 'Current Lead Status', 'SC Age Group', 'SC Prior Investment', 'SC Profession', 'SC Firm / Clinic', 'SC Best Time', 'Latest Meeting Type', 'Latest Meeting Status', 'Latest Meeting Date', 'Latest Meeting Time', 'Latest Meeting Mode', 'Latest Meeting Lead Status', 'Latest Meeting Joined With', 'Latest Meeting Person Name', 'Latest Meeting Person Position', 'Latest Meeting Remarks', 'Latest Next Plan Date', 'Meeting ID', 'Lead ID'];
      return { headers, rows };
}
