import type { LeadResponse } from '../../types/lead';
import type { MeetingResponse } from '../../types/meeting';
import { COORDINATOR_SALES_TEAM } from './coordinatorConstants';
import type { AssignedDateRange,VerificationField } from './coordinatorTypes';

export const show = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);

export const digitsOnly = (value: string | undefined) => String(value ?? '').replace(/\D/g, '');

export const maskedMobile = (value: unknown) => {
  const text = String(value ?? '');
  const digits = text.replace(/\D/g, '');
  return digits.length >= 4 ? `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}` : text;
};

export const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export const calendarDate = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');

export const timeText = (v?: { hour?: number; minute?: number; second?: number } | string) => typeof v === 'string' ? v : v?.hour === undefined ? '—' : [v.hour, v.minute ?? 0, v.second ?? 0].map((n) => String(n).padStart(2, '0')).join(':');

export const mapUrlFor = (meeting: MeetingResponse) => meeting.googleMapsUrl || (meeting.latitude != null && meeting.longitude != null ? `https://www.google.com/maps?q=${meeting.latitude},${meeting.longitude}` : null);

export const matchesSearch = (value: unknown, query: string) => !query.trim() || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase());

export const matchesAssignedDate = (assignedAt: string | undefined, range: AssignedDateRange) => {
  if (!range.from && !range.to) return true;
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  if (!date) return false;
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
};

export const clientMeetingTime = (value?: string) => {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] ?? 0) } : undefined;
};

export const isVerificationFieldVisible = (field: VerificationField, meetingWith: string) => {
  if (field !== 'personName' && field !== 'position') return true;
  return ['SOMEONE', 'SOMEONE_ELSE', 'WITH_SOMEONE'].includes(meetingWith.trim().toUpperCase().replace(/\s+/g, '_'));
};

export const isNotConductedMeeting = (meeting?: MeetingResponse | null) => meeting?.meetingConducted === 'NOT_CONDUCTED' || meeting?.meetingStatus === 'NOT_CONDUCTED';

export const isAlreadyAssignedError = (error: unknown) => /already\s+(assigned|exists)|assigned\s+already|duplicate/i.test(error instanceof Error ? error.message : '');

export const belongsToCoordinatorTeam = (coordinator: string, salesPerson: string | undefined) => {
  const team = COORDINATOR_SALES_TEAM[coordinator];
  return !coordinator || !team || Boolean(salesPerson && team.includes(salesPerson));
};

export const isValidAmount = (value: string) => Boolean(value.trim()) && Number.isFinite(Number(value)) && Number(value) >= 0;

export const employeeRole = (roleValue?: string, employeeCode?: string): 'SM' | 'RM' | 'SC' => {
  const role = String(roleValue ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (role === 'RELATIONSHIP_MANAGER' || role === 'RM') return 'RM';
  if (role === 'SALES_COORDINATOR' || role === 'SC') return 'SC';
  if (role === 'SALES_MANAGER' || role === 'SM') return 'SM';
  if (employeeCode?.trim() === 'AP0101') return 'RM';
  if (employeeCode?.trim() === 'DV0101') return 'SC';
  return 'SM';
};

export const meetingRole = (meeting: MeetingResponse) => employeeRole(meeting.employeeRole ?? meeting.assignedEmployeeRole, meeting.employeeCode);

export const leadRole = (lead: LeadResponse) => employeeRole(lead.assignedEmployeeRole, lead.assignedEmployeeCode);

export const employeeRoleLabels = (meeting: MeetingResponse) => {
  const role = meetingRole(meeting);
  return role === 'RM' ? { person: 'Relationship Manager', id: 'Relationship Manager ID' }
    : role === 'SC' ? { person: 'Sales Coordinator', id: 'Sales Coordinator ID' }
    : { person: 'Sales Manager', id: 'Sales Manager ID' };
};
