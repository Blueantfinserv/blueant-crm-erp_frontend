import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';

const LEAD_FIELDS = ['ageGroup', 'existingSip', 'profession', 'professionDetail', 'bestTimeForMeeting'] as const;

export const createMeetingVerificationForm = (
  meeting: MeetingResponse,
  verified: readonly MeetingResponse[],
): Record<keyof MeetingVerificationRequest, string> => {
  const previous = verified.filter((item) => {
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

  const form = {
    meetingTiming: '',
    meetingWith: meeting.meetingWith?.trim() || meeting.aloneWith?.trim() || '',
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
