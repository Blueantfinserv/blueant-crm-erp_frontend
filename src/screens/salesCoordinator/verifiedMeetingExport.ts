import type { MeetingResponse } from '../../types/meeting';

export const VERIFIED_MEETING_EXPORT_HEADERS = [
  'Name', 'PAN Number', 'Sales Person / RM / SC Name', 'Meeting Date', 'Next Plan Date',
  'Remarks RM / SC', 'Remarks PC', 'Address', 'Location',
] as const;

// Export exactly the matching verified records in their current order, across all UI pages.
// Missing PC answers stay blank rather than reusing the sales person's remarks.
export const verifiedMeetingExportRows = (meetings: readonly MeetingResponse[]) => meetings.map(meeting => [
  meeting.clientName ?? '',
  meeting.panNumber ?? '',
  meeting.employeeName ?? meeting.assignedEmployeeName ?? '',
  meeting.meetingDate ?? '',
  meeting.nextMeetingDate ?? '',
  (meeting.isClientMeeting ? meeting.meetingRemarks ?? meeting.remarks : meeting.remarks ?? meeting.meetingRemarks) ?? meeting.discussion ?? '',
  meeting.verificationRemarks ?? '',
  meeting.residentialAddress ?? meeting.address ?? meeting.clinicAddress ?? '',
  meeting.currentCity ?? meeting.location ?? meeting.meetingLocation ?? '',
]);
