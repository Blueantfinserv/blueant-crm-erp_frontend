import type { LeadResponse } from '../../../types/lead';
import type { MeetingResponse } from '../../../types/meeting';
import type { SalesTask } from './types/tasks';

const parseBackendCalendarDate = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
};

export const getTaskSchedule = (dateValue?: string): SalesTask['schedule'] => {
  if (!dateValue) return 'Unscheduled';
  const backendDate = parseBackendCalendarDate(dateValue);
  if (!backendDate) return 'Unscheduled';
  const today = new Date();
  const taskDateUtc = Date.UTC(backendDate.year, backendDate.month - 1, backendDate.day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const differenceInDays = Math.round((taskDateUtc - todayUtc) / 86_400_000);
  if (differenceInDays < 0) return 'Pending';
  if (differenceInDays === 0) return 'Today';
  if (differenceInDays <= 3) return 'Future 3 Days';
  return 'Later';
};

export const isHiddenCompletedLead = (status?: string) => (
  status === 'ALREADY_CLIENT' || status === 'CONVERTED' || status === 'CONVERTED_CLIENT'
);

export const isRemovedLead = (status?: string) => (
  status === 'REMOVED' || status === 'NOT_INTERESTED' || status === 'CLIENT_REMOVED' || status === 'CLIENT_NOT_INTERESTED'
);

export const getActionableTaskMeetings = (
  meetings: readonly MeetingResponse[],
  leads: readonly LeadResponse[],
) => {
  const byId = new Map<number, { lead: LeadResponse; index: number }>();
  const byCode = new Map<string, { lead: LeadResponse; index: number }>();
  leads.forEach((lead, index) => {
    // Keep the first occurrence; Map treats NaN as equal, whereas the old === lookup does not.
    if (lead.leadId !== undefined && !Number.isNaN(lead.leadId) && !byId.has(lead.leadId)) byId.set(lead.leadId, { lead, index });
    if (lead.leadCode && !byCode.has(lead.leadCode)) byCode.set(lead.leadCode, { lead, index });
  });
  return meetings.filter((meeting) => {
    if (meeting.meetingStatus !== 'SCHEDULED' || meeting.meetingType === 'INTRO') return false;
    const idMatch = meeting.leadId !== undefined ? byId.get(meeting.leadId) : undefined;
    const codeMatch = meeting.leadCode ? byCode.get(meeting.leadCode) : undefined;
    // The original OR predicate chooses the earliest match across both keys, not ID priority.
    const lead = (idMatch && codeMatch ? (idMatch.index < codeMatch.index ? idMatch : codeMatch) : idMatch ?? codeMatch)?.lead;
    return !isHiddenCompletedLead(lead?.leadStatus)
      && !isHiddenCompletedLead(meeting.leadStatus)
      && !isRemovedLead(lead?.leadStatus)
      && !isRemovedLead(meeting.leadStatus);
  });
};
