import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';

export const LEAD_FIELDS = ['ageGroup', 'existingSip', 'profession', 'professionDetail', 'bestTimeForMeeting'] as const;
const meetingWithValue = (value: string | undefined) => {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, '_');
  // Verification uses SOMEONE_ELSE; the sales workflow's aloneWith uses SOMEONE.
  return ['SOMEONE', 'SOMEONE_ELSE', 'WITH_SOMEONE'].includes(normalized ?? '') ? 'SOMEONE_ELSE' : normalized === 'SELF' ? 'SELF' : '';
};

export const previousLeadMeetings = (meeting: MeetingResponse, verified: readonly MeetingResponse[]) =>
  verified.filter((item) => {
    if (item.meetingCode && item.meetingCode === meeting.meetingCode) return false;
    if (item.leadCode?.trim() && meeting.leadCode?.trim()) {
      return item.leadCode.trim() === meeting.leadCode.trim();
    }
    return item.leadId != null && meeting.leadId != null && item.leadId === meeting.leadId;
  }).sort((a, b) => {
    const timestamp = (item: MeetingResponse) => Date.parse(
      item.meetingVerificationDate || item.updatedAt || item.lastModifiedDate || item.meetingDate || '',
    ) || 0;
    return timestamp(b) - timestamp(a);
  });

export const createMeetingVerificationForm = (
  meeting: MeetingResponse,
  verified: readonly MeetingResponse[],
): Record<keyof MeetingVerificationRequest, string> => {
  const previous = previousLeadMeetings(meeting, verified);
  const form = {
    meetingDate: '',
    meetingTiming: '',
    meetingWith: meetingWithValue(meeting.meetingWith) || meetingWithValue(meeting.aloneWith),
    personName: meeting.personName?.trim() || '',
    position: meeting.position?.trim() || '',
    ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '',
  };
  for (const field of LEAD_FIELDS) {
    form[field] = [meeting, ...previous]
      .map((item) => item[field]?.trim())
      .find((value) => Boolean(value)) ?? '';
  }
  return form;
};
