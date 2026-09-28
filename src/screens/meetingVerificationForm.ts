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
    // Copy only from an earlier meeting of this same lead. Intro is normally
    // meeting number 1, so Meeting 1 can correctly inherit Intro's values.
    if (meeting.meetingNumber !== undefined) {
      if (item.meetingNumber === undefined || item.meetingNumber >= meeting.meetingNumber) return false;
    }
    if (item.leadCode?.trim() && meeting.leadCode?.trim()) {
      return item.leadCode.trim() === meeting.leadCode.trim();
    }
    return item.leadId != null && meeting.leadId != null && item.leadId === meeting.leadId;
  }).sort((a, b) => {
    if (a.meetingNumber !== undefined && b.meetingNumber !== undefined && a.meetingNumber !== b.meetingNumber) {
      return b.meetingNumber - a.meetingNumber;
    }
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
  const earlier = previous[0];
  const form = {
    meetingDate: '',
    meetingTiming: '',
    meetingWith: meetingWithValue(earlier?.meetingWith) || meetingWithValue(earlier?.aloneWith),
    personName: earlier?.personName?.trim() || '',
    position: earlier?.position?.trim() || '',
    ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '',
  };
  for (const field of LEAD_FIELDS) {
    // Do not fill a blank field from older meetings or any other source.
    form[field] = earlier?.[field]?.trim() || '';
  }
  return form;
};
