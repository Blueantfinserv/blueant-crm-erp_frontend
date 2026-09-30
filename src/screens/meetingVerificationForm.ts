import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';

const LEAD_FIELDS = ['ageGroup', 'existingSip', 'profession', 'professionDetail', 'bestTimeForMeeting'] as const;

const normalizedMeetingWith = (value?: string) => {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, '_');
  if (['SOMEONE', 'SOMEONE_ELSE', 'WITH_SOMEONE'].includes(normalized ?? '')) return 'SOMEONE_ELSE';
  return normalized === 'SELF' ? 'SELF' : '';
};

export const createMeetingVerificationForm = (
  meeting: MeetingResponse,
  verified: readonly MeetingResponse[],
): Record<Exclude<keyof MeetingVerificationRequest, 'aloneWith'>, string> => {
  const currentRecords = [meeting, ...verified.filter((item) => (
    Boolean(meeting.meetingCode) && item.meetingCode === meeting.meetingCode
  ))];
  const meetingWith = currentRecords.map((item) => normalizedMeetingWith(item.aloneWith))
    .find(Boolean) || currentRecords.map((item) => normalizedMeetingWith(item.meetingWith))
    .find(Boolean) || '';
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
    meetingDate: '',
    meetingTiming: '',
    meetingWith,
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
