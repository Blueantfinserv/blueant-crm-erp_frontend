import type { MeetingResponse } from '../../types/meeting';

// PC history display only: attempts do not advance the conducted-meeting sequence.
export function historyMeetingTitles(meetings: readonly MeetingResponse[]): Map<MeetingResponse, string> {
  const titles = new Map<MeetingResponse, string>();
  const ordered = [...meetings].sort((a, b) =>
    String(a.meetingDate ?? a.createdAt ?? '').localeCompare(String(b.meetingDate ?? b.createdAt ?? ''))
    || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))
    || String(a.meetingCode ?? a.id ?? '').localeCompare(String(b.meetingCode ?? b.id ?? ''), undefined, { numeric: true }));
  // Without the start of history, a locally reconstructed sequence would be misleading.
  const first = ordered[0];
  if (!first || first.isClientMeeting || !(first.meetingType === 'INTRO' || /intro/i.test(first.meetingTitle ?? ''))) return titles;
  let number = 0;
  for (const meeting of ordered) {
    if (meeting.isClientMeeting) continue;
    const mod100 = number % 100;
    const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[number % 10] ?? 'th';
    titles.set(meeting, number === 0 ? 'Intro Meeting' : `${number}${suffix} Meeting`);
    const notConducted = meeting.meetingConducted === 'NOT_CONDUCTED' || meeting.meetingStatus === 'NOT_CONDUCTED';
    const conducted = meeting.meetingConducted === 'CONDUCTED' || meeting.meetingStatus === 'COMPLETED';
    if (!notConducted && conducted) number += 1;
  }
  return titles;
}
