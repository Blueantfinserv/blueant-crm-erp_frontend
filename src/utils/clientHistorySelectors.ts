import type { ClientMeetingResponse } from '../types/crm';

// Meeting sequence is authoritative. Equal sequences retain date ordering, then input order.
export const compareClientMeetings = (a: ClientMeetingResponse, b: ClientMeetingResponse) => {
  const left = Number.isFinite(a.meetingNumber) ? a.meetingNumber! : -Infinity;
  const right = Number.isFinite(b.meetingNumber) ? b.meetingNumber! : -Infinity;
  if (left !== right) return right > left ? 1 : -1;
  return String(b.meetingDate ?? '').localeCompare(String(a.meetingDate ?? ''));
};
export const sortedClientHistory = (history: readonly ClientMeetingResponse[]) => [...history].sort(compareClientMeetings);
export const latestClientMeeting = (history: readonly ClientMeetingResponse[]) => sortedClientHistory(history)[0];
