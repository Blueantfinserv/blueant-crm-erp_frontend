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
  if (!dateValue) return 'Pending';
  const backendDate = parseBackendCalendarDate(dateValue);
  if (!backendDate) return 'Pending';
  const taskDate = new Date(backendDate.year, backendDate.month - 1, backendDate.day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const differenceInDays = Math.round((taskDate.getTime() - today.getTime()) / 86_400_000);
  if (differenceInDays === 0) return 'Today';
  if (differenceInDays > 0 && differenceInDays <= 3) return 'Future 3 Days';
  return 'Pending';
};

const isHiddenCompletedLead = (status?: string) => (
  status === 'ALREADY_CLIENT' || status === 'CONVERTED' || status === 'CONVERTED_CLIENT'
);

export const getActionableTaskMeetings = (
  meetings: readonly MeetingResponse[],
  leads: readonly LeadResponse[],
) => meetings.filter((meeting) => {
  if (meeting.meetingStatus !== 'SCHEDULED' || meeting.meetingType === 'INTRO') return false;
  const lead = leads.find((candidate) => (
    (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)
    || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)
  ));
  return !isHiddenCompletedLead(lead?.leadStatus) && !isHiddenCompletedLead(meeting.leadStatus);
});
