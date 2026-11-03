import type { MeetingResponse } from '../../../types/meeting';

// First matching record wins comparator ties, matching the original stable sort.
export function selectLocationMeeting(meeting: MeetingResponse, history: readonly MeetingResponse[]): MeetingResponse | undefined {
  let selected: MeetingResponse | undefined;
  for (const candidate of history) {
    if (!(Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude) && (
      (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)
      || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)
    ))) continue;
    if (selected === undefined || (
      candidate.workflowUpdatedAt ?? candidate.updatedAt ?? candidate.lastModifiedDate ?? candidate.meetingDate ?? ''
    ).localeCompare(
      selected.workflowUpdatedAt ?? selected.updatedAt ?? selected.lastModifiedDate ?? selected.meetingDate ?? ''
    ) > 0) selected = candidate;
  }
  return selected;
}
