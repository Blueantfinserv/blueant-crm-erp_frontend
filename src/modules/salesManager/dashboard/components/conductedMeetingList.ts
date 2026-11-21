import type { DashboardListItem } from '../types/dashboard';
import type { ClientMeetingResponse, ClientWorkFollowResponse } from '../../../../types/crm';

export type ConductedMeetingRecord = {
  id?: number;
  meetingCode?: string;
  meetingNumber?: number;
  meetingStatus?: string;
  meetingConducted?: string;
  meetingDate?: string;
  employeeCode?: string;
  assignedEmployeeCode?: string;
  clientCode?: string;
  leadCode?: string;
  leadId?: number;
  clientName?: string;
  mobileNumber?: string;
  remarks?: string;
  meetingRemarks?: string;
  discussion?: string;
  meetingTitle?: string;
  meetingType?: string;
  meetingMode?: string;
};

export type ClientMeetingHistoryEntry = {
  client: ClientWorkFollowResponse;
  history: ClientMeetingResponse[];
};

export const upsertClientMeetingHistory = (
  entries: readonly ClientMeetingHistoryEntry[],
  client: ClientWorkFollowResponse,
  history: ClientMeetingResponse[],
) => {
  const existing = entries.findIndex(entry => entry.client.clientCode === client.clientCode);
  return existing < 0
    ? [...entries, { client, history }]
    : entries.map((entry, index) => index === existing ? { client, history } : entry);
};

const isPresent = (value: unknown) => value !== undefined && value !== null && value !== '';

export const isConductedMeeting = (meeting: ConductedMeetingRecord) => {
  const conducted = meeting.meetingConducted?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const status = meeting.meetingStatus?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (conducted === 'NOT_CONDUCTED' || status === 'NOT_CONDUCTED') return false;
  return conducted === 'CONDUCTED' || status === 'COMPLETED';
};

export const getConductedMeetingPeriod = (value: string | undefined, now = new Date()): DashboardListItem['period'] | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date.getTime() === today.getTime()) return 'today';
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (date >= weekStart && date <= today) return 'thisWeek';
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  if (date >= lastMonthStart && date <= lastMonthEnd) return 'lastMonth';
  return null;
};

export const filterConductedMeetingsForEmployee = (
  meetings: readonly ConductedMeetingRecord[],
  employeeCode?: string,
) => employeeCode
  ? meetings.filter(meeting => (meeting.employeeCode ?? meeting.assignedEmployeeCode) === employeeCode)
  : [...meetings];

const identity = (meeting: ConductedMeetingRecord, index: number) => {
  if (meeting.meetingCode?.trim()) return `meeting:${meeting.meetingCode.trim()}`;
  if (meeting.id !== undefined) return `id:${meeting.id}`;
  const person = meeting.clientCode?.trim() || meeting.leadCode?.trim()
    || (meeting.leadId !== undefined ? `lead:${meeting.leadId}` : '')
    || meeting.mobileNumber?.replace(/\D/g, '')
    || meeting.clientName?.trim().toLowerCase();
  return person ? `${person}:${meeting.meetingDate ?? ''}:${meeting.meetingNumber ?? ''}` : `row:${index}`;
};

export const mergeConductedMeetings = (...groups: readonly ConductedMeetingRecord[][]) => {
  const records = new Map<string, ConductedMeetingRecord>();
  let index = 0;
  groups.flat().forEach((meeting) => {
    const key = identity(meeting, index++);
    const merged: ConductedMeetingRecord = { ...(records.get(key) ?? {}) };
    Object.entries(meeting).forEach(([field, value]) => {
      if (isPresent(value)) Object.assign(merged, { [field]: value });
    });
    records.set(key, merged);
  });
  return [...records.values()].filter(isConductedMeeting);
};

export const toConductedMeetingListItem = (
  meeting: ConductedMeetingRecord,
  period: DashboardListItem['period'],
  dateLabel: string,
  fallbackClientName?: string,
): DashboardListItem => ({
  id: meeting.meetingCode ?? String(meeting.id ?? identity(meeting, 0)),
  primaryText: meeting.clientName ?? fallbackClientName ?? 'Unnamed client',
  secondaryText: [meeting.meetingTitle ?? meeting.meetingType, meeting.meetingMode].filter(Boolean).join(' · ') || 'Meeting',
  dateLabel,
  period,
  dateValue: meeting.meetingDate,
  remarks: meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion ?? 'No remarks available.',
});
