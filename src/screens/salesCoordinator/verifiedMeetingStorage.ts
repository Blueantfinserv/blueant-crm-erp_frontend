import { SecureStorageService } from '../../services/SecureStorageService';
import type { MeetingResponse } from '../../types/meeting';
import { VERIFIED_CLIENT_MEETINGS_GLOBAL_KEY,VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX } from './coordinatorConstants';

export const parseStoredVerifiedClientMeetings = (value: string | null): MeetingResponse[] => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is MeetingResponse => Boolean(item && typeof item === 'object' && item.isClientMeeting && item.meetingCode)) : [];
  } catch { return []; }
};

export const mergeVerifiedMeetings = (...groups: readonly MeetingResponse[][]): MeetingResponse[] => Array.from(groups.flat().reduce((records, meeting) => {
  const key = meeting.meetingCode ?? `${meeting.id ?? ''}:${meeting.clientName ?? ''}:${meeting.meetingDate ?? ''}`;
  // A verification response can intentionally contain only PC answers. Do not let its absent
  // profile values erase already-loaded client information.
  const merged = { ...(records.get(key) ?? {}) } as MeetingResponse;
  Object.entries(meeting).forEach(([field, value]) => {
    if (value !== undefined && value !== null && value !== '') (merged as Record<string, unknown>)[field] = value;
  });
  records.set(key, merged);
  return records;
}, new Map<string, MeetingResponse>()).values());

export const verifiedClientStorageKeys = (employeeId?: string) => Array.from(new Set([
  VERIFIED_CLIENT_MEETINGS_GLOBAL_KEY,
  `${VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX}.${employeeId ?? 'current'}`,
  `${VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX}.current`,
]));

export const loadStoredVerifiedClientMeetings = async (employeeId?: string): Promise<MeetingResponse[]> => {
  const values = await Promise.all(verifiedClientStorageKeys(employeeId).map((key) => SecureStorageService.getPersistentItem(key)));
  return mergeVerifiedMeetings(...values.map(parseStoredVerifiedClientMeetings));
};

export const saveStoredVerifiedClientMeetings = async (records: MeetingResponse[], employeeId?: string) => {
  const serialized = JSON.stringify(records);
  await Promise.all(verifiedClientStorageKeys(employeeId).map((key) => SecureStorageService.setPersistentItem(key, serialized)));
};
