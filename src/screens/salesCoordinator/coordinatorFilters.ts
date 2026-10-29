import type { LeadResponse } from '../../types/lead';
import type { MeetingResponse } from '../../types/meeting';
import type { MeetingColumnFilter } from './coordinatorTypes';
import { meetingRole } from './coordinatorUtils';

export const leadCardTone = (lead: LeadResponse) => [...String(lead.assignedByEmployeeCode ?? lead.assignedByEmployeeName ?? '')].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;

export const filterMeetingRecords = (items: readonly MeetingResponse[], filters: MeetingColumnFilter) => items.filter((meeting) => Object.entries(filters).every(([key, filter]) => {
  if (key === 'meetingDate' && filter?.startsWith('range:')) {
    const [from, to] = filter.slice(6).split(',');
    const date = String(meeting.meetingDate ?? '');
    return (!from || date >= from) && (!to || date <= to);
  }
  const choices = filter?.split('|').filter(Boolean) ?? [];
  const current = String(key === 'meetingTitle' ? meeting.meetingTitle ?? meeting.meetingType ?? '' : key === 'employeeRole' ? meetingRole(meeting) : meeting[key as keyof MeetingResponse] ?? '').toLowerCase();
  return !choices.length || choices.some((choice) => {
    const selected = choice.toLowerCase();
    if (key === 'meetingConducted') return current === selected;
    return key === 'employeeName' ? current === selected || current.startsWith(`${selected} `) || selected.startsWith(`${current} `) : current.includes(selected);
  });
}));
