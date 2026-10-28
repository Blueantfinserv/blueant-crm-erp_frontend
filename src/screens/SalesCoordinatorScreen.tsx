import { VerificationDropdown } from '../components/VerificationDropdown';
import { prospectInfoFields } from '../utils/prospectDetails';
import { createElement, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Icon } from 'react-native-paper';
import { leadService } from '../services/LeadService';
import { leadSearchApi } from '../api/leadSearch';
import { leadApi } from '../api/lead';
import type { AssignLeadRequest, LeadResponse } from '../types/lead';
import { meetingService } from '../services/MeetingService';
import { meetingApi } from '../api/meeting';
import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';
import { clientMeetingApi } from '../api/clientMeeting';
import { SecureStorageService } from '../services/SecureStorageService';
import type { ClientProfileResponse } from '../types/crm';
import { useAppTheme } from '../theme/ThemeProvider';
import { createMeetingVerificationForm } from './meetingVerificationForm';
import { historyStyles, styles, verificationStyles, popupStyles } from './salesCoordinatorStyles';

/* ───────────────────────── Types ───────────────────────── */

type Tab = 'today' | 'responses' | 'tasks' | 'assign' | 'assignedLeads';
type VerificationField = NonNullable<keyof MeetingVerificationRequest>;
type VerificationForm = Record<Exclude<VerificationField, 'aloneWith'>, string>;
type ClientBusinessType = 'SIP' | 'LUMP_SUM' | 'INSURANCE' | 'SHARES' | 'LOAN' | 'SERVICE_REQUEST' | 'BROKER_CHANGE';
type ClientBusinessItemForm = { businessType: ClientBusinessType; amount: string };
type ClientVerificationForm = {
  newMeetingDate: string; meetingTime: string; blueantAppUsed: string; aloneWith: string;
  personName: string; position: string; businessGenerated: string;
  businessItems: ClientBusinessItemForm[]; remarks: string; nextFollowupDate: string; meetingDate: string; blueantAppLocked: boolean;
};
type MeetingColumnFilter = Partial<Record<'clientName' | 'meetingTitle' | 'employeeName' | 'employeeRole' | 'leadStatus' | 'meetingDate' | 'nextMeetingDate' | 'aloneWith' | 'verifiedBy', string>>;
type AssignedDateRange = { from: string; to: string };
type VerificationPage = { content?: { meetingCode?: string; verificationStatus?: string }[]; totalPages?: number };

/* ───────────────────────── Constants ───────────────────────── */

const VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX = 'blueant.pc.verifiedClientMeetings';
const VERIFIED_CLIENT_MEETINGS_GLOBAL_KEY = `${VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX}.all`;
const PAGE_SIZE = 100;
const TABS: readonly { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today Meetings', icon: 'calendar-check-outline' },
  { key: 'responses', label: 'Verified Meetings', icon: 'clipboard-check-outline' },
  { key: 'tasks', label: 'Sales Person Tasks', icon: 'account-group-outline' },
  { key: 'assign', label: 'Assign New Lead', icon: 'account-plus-outline' },
  { key: 'assignedLeads', label: 'Assigned Leads', icon: 'account-arrow-right-outline' },
];
const POSITION_OPTIONS = ['Team leader', 'Admin', 'Super Admin', 'Sales Manager', 'RM'];
const CLIENT_POSITION_OPTIONS = ['SUPER ADMIN', 'ADMIN', 'TL', 'SM', 'RM'] as const;
const FIELDS: readonly { key: keyof VerificationForm; label: string; placeholder: string }[] = [
  { key: 'meetingDate', label: 'Meeting Date', placeholder: 'Choose meeting date' },
  { key: 'meetingTiming', label: 'Meeting Time', placeholder: 'HH:mm:ss' },
  { key: 'ageGroup', label: 'Age Group', placeholder: 'Backend code, e.g. AGE_25_35' },
  { key: 'existingSip', label: 'Any Prior Investment', placeholder: 'Backend value, e.g. YES' },
  { key: 'profession', label: 'Profession', placeholder: 'Backend code, e.g. DOCTOR' },
  { key: 'bestTimeForMeeting', label: 'Best Time for Meeting', placeholder: 'Backend code, e.g. EVENING' },
  { key: 'professionDetail', label: 'Clinic / Company / Firm Name', placeholder: 'Profession details' },
  { key: 'meetingWith', label: 'Meeting With', placeholder: 'Backend code, e.g. SOMEONE_ELSE' },
  { key: 'personName', label: 'Person / Joined Person Name', placeholder: 'Person name' },
  { key: 'position', label: 'Position', placeholder: 'Position' },
];
const NOT_CONDUCTED_FIELDS = FIELDS.filter((field) => field.key === 'meetingTiming' || field.key === 'meetingDate');
const HOURS = Array.from({ length: 14 }, (_, index) => String(index + 9).padStart(2, '0'));
const PRIOR_INVESTMENT_OPTIONS = ['YES', 'NO'] as const;
const BEST_TIME_OPTIONS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
const MEETING_WITH_OPTIONS = ['SELF', 'SOMEONE_ELSE'] as const;
const CLIENT_BUSINESS_TYPES: readonly { type: ClientBusinessType; label: string; requiresAmount: boolean; icon: string }[] = [
  { type: 'SIP', label: 'SIP', requiresAmount: true, icon: 'chart-line' },
  { type: 'LUMP_SUM', label: 'Lumpsum', requiresAmount: true, icon: 'cash-multiple' },
  { type: 'INSURANCE', label: 'Insurance', requiresAmount: true, icon: 'shield-check-outline' },
  { type: 'SHARES', label: 'Shares', requiresAmount: true, icon: 'chart-areaspline' },
  { type: 'LOAN', label: 'Loan', requiresAmount: true, icon: 'bank-outline' },
  { type: 'SERVICE_REQUEST', label: 'Service Request', requiresAmount: false, icon: 'account-wrench-outline' },
  { type: 'BROKER_CHANGE', label: 'Broker Change', requiresAmount: false, icon: 'swap-horizontal' },
];
const clientBusinessDefinition = (type: ClientBusinessType) => CLIENT_BUSINESS_TYPES.find((item) => item.type === type)!;
const EXCLUDED_TASK_LEAD_STATUSES = new Set(['ALREADY_CLIENT', 'CONVERTED', 'CONVERTED_CLIENT', 'CLIENT_REMOVED', 'CLIENT_NOT_INTERESTED', 'REMOVED', 'NOT_INTERESTED']);
const AGE_GROUP_LABELS: Record<string, string> = {
  BELOW_25: 'Below 25', AGE_25_35: '25–35', AGE_36_45: '36–45',
  AGE_46_55: '46–55', AGE_56_65: '56–65', ABOVE_65: '65+',
};
const AGE_GROUP_OPTIONS = Object.keys(AGE_GROUP_LABELS);
const PROFESSION_LABELS: Record<string, string> = {
  SALARIED_EMPLOYEE: 'Salaried Employee', BUSINESS_OWNER: 'Business Owner', SELF_EMPLOYED: 'Self Employed', DOCTOR: 'Doctor',
  LAWYER_ADVOCATE: 'Lawyer / Advocate', CHARTERED_ACCOUNTANT: 'Chartered Accountant (CA)', COMPANY_SECRETARY: 'Company Secretary (CS)',
  ENGINEER: 'Engineer', ARCHITECT: 'Architect', CONSULTANT: 'Consultant', TEACHER_PROFESSOR: 'Teacher / Professor',
  GOVERNMENT_EMPLOYEE: 'Government Employee', BANKING_FINANCE_PROFESSIONAL: 'Banking / Finance Professional',
  IT_SOFTWARE_PROFESSIONAL: 'IT / Software Professional', HEALTHCARE_PROFESSIONAL: 'Healthcare Professional',
  SALES_MARKETING_PROFESSIONAL: 'Sales / Marketing Professional', REAL_ESTATE_PROFESSIONAL: 'Real Estate Professional',
  TRADER_INVESTOR: 'Trader / Investor', RETIRED: 'Retired', STUDENT: 'Student', HOMEMAKER: 'Homemaker', OTHER: 'Other', NOT_DISCLOSED: 'Not Disclosed',
};
const PROFESSION_OPTIONS = Object.keys(PROFESSION_LABELS);
// Static display fallbacks for the PC assignment dropdown. Backend-loaded names still take precedence.
const SALES_PERSONS = [
  { code: 'RK1507', name: 'Rakesh Kumar' }, { code: 'AS0108', name: 'Abhijeet Singh' }, { code: 'AK0107', name: 'Atul Kumar' },
  { code: 'RG1108', name: 'Rajat Gupta' }, { code: 'HP0605', name: 'Harsh Pilania' }, { code: 'AKS0108', name: 'Amit Kumar Singh' },
  { code: 'SM2403', name: 'Sunny Mathur' }, { code: 'GK0902', name: 'Garv Kumar' }, { code: 'AS1909', name: 'Abhishek Singh' },
  { code: 'US2601', name: 'Umakant Sharma' },
] as const;
const SALES_PERSON_CODES = SALES_PERSONS.map((employee) => employee.code);
// The lead search response contains historical coordinator names, which makes the Assigned Leads
// filters show cross-team sales people. Keep the confirmed current PC team ownership explicit
// until the backend returns that mapping.
const COORDINATOR_SALES_TEAM: Readonly<Record<string, readonly string[]>> = {
  'Aarti Kumari': ['Rakesh Kumar', 'Atul Kumar', 'Rajat Gupta'],
  'Samridhi Saini': ['Gary Kumar', 'Garv Kumar', 'Umakant Sharma', 'Abhishek Singh', 'Sunny Mathur'],
};
const FILTER_COLUMNS: { key: keyof MeetingColumnFilter; label: string }[] = [
  { key: 'clientName', label: 'CLIENT NAME' }, { key: 'meetingTitle', label: 'MEETING TYPE' }, { key: 'employeeName', label: 'ASSIGNED TO' }, { key: 'employeeRole', label: 'ROLE' },
  { key: 'leadStatus', label: 'LEAD STATUS' }, { key: 'meetingDate', label: 'MEETING DATE' }, { key: 'nextMeetingDate', label: 'NEXT PLAN DATE' }, { key: 'aloneWith', label: 'JOINED' },
];

/* ───────────────────────── Small helpers ───────────────────────── */

const show = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);
const digitsOnly = (value: string | undefined) => String(value ?? '').replace(/\D/g, '');
const maskedMobile = (value: unknown) => {
  const text = String(value ?? '');
  const digits = text.replace(/\D/g, '');
  return digits.length >= 4 ? `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}` : text;
};
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const calendarDate = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
const timeText = (v?: { hour?: number; minute?: number; second?: number } | string) => typeof v === 'string' ? v : v?.hour === undefined ? '—' : [v.hour, v.minute ?? 0, v.second ?? 0].map((n) => String(n).padStart(2, '0')).join(':');
const mapUrlFor = (meeting: MeetingResponse) => meeting.googleMapsUrl || (meeting.latitude != null && meeting.longitude != null ? `https://www.google.com/maps?q=${meeting.latitude},${meeting.longitude}` : null);
const matchesSearch = (value: unknown, query: string) => !query.trim() || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase());
const matchesAssignedDate = (assignedAt: string | undefined, range: AssignedDateRange) => {
  if (!range.from && !range.to) return true;
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  if (!date) return false;
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
};
const clientMeetingTime = (value?: string) => {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] ?? 0) } : undefined;
};
const isVerificationFieldVisible = (field: VerificationField, meetingWith: string) => {
  if (field !== 'personName' && field !== 'position') return true;
  return ['SOMEONE', 'SOMEONE_ELSE', 'WITH_SOMEONE'].includes(meetingWith.trim().toUpperCase().replace(/\s+/g, '_'));
};
const isNotConductedMeeting = (meeting?: MeetingResponse | null) => meeting?.meetingConducted === 'NOT_CONDUCTED' || meeting?.meetingStatus === 'NOT_CONDUCTED';
const isAlreadyAssignedError = (error: unknown) => /already\s+(assigned|exists)|assigned\s+already|duplicate/i.test(error instanceof Error ? error.message : '');
const belongsToCoordinatorTeam = (coordinator: string, salesPerson: string | undefined) => {
  const team = COORDINATOR_SALES_TEAM[coordinator];
  return !coordinator || !team || Boolean(salesPerson && team.includes(salesPerson));
};
const isValidAmount = (value: string) => Boolean(value.trim()) && Number.isFinite(Number(value)) && Number(value) >= 0;

/* ───────────────────────── Roles ───────────────────────── */

const employeeRole = (roleValue?: string, employeeCode?: string): 'SM' | 'RM' | 'SC' => {
  const role = String(roleValue ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (role === 'RELATIONSHIP_MANAGER' || role === 'RM') return 'RM';
  if (role === 'SALES_COORDINATOR' || role === 'SC') return 'SC';
  if (role === 'SALES_MANAGER' || role === 'SM') return 'SM';
  if (employeeCode?.trim() === 'AP0101') return 'RM';
  if (employeeCode?.trim() === 'DV0101') return 'SC';
  return 'SM';
};
const meetingRole = (meeting: MeetingResponse) => employeeRole(meeting.employeeRole ?? meeting.assignedEmployeeRole, meeting.employeeCode);
const leadRole = (lead: LeadResponse) => employeeRole(lead.assignedEmployeeRole, lead.assignedEmployeeCode);
const employeeRoleLabels = (meeting: MeetingResponse) => {
  const role = meetingRole(meeting);
  return role === 'RM' ? { person: 'Relationship Manager', id: 'Relationship Manager ID' }
    : role === 'SC' ? { person: 'Sales Coordinator', id: 'Sales Coordinator ID' }
    : { person: 'Sales Manager', id: 'Sales Manager ID' };
};

/* ───────────────────────── Locally stored verified client meetings ───────────────────────── */

const parseStoredVerifiedClientMeetings = (value: string | null): MeetingResponse[] => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is MeetingResponse => Boolean(item && typeof item === 'object' && item.isClientMeeting && item.meetingCode)) : [];
  } catch { return []; }
};
const mergeVerifiedMeetings = (...groups: readonly MeetingResponse[][]): MeetingResponse[] => Array.from(groups.flat().reduce((records, meeting) => {
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
const verifiedClientStorageKeys = (employeeId?: string) => Array.from(new Set([
  VERIFIED_CLIENT_MEETINGS_GLOBAL_KEY,
  `${VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX}.${employeeId ?? 'current'}`,
  `${VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX}.current`,
]));
const loadStoredVerifiedClientMeetings = async (employeeId?: string): Promise<MeetingResponse[]> => {
  const values = await Promise.all(verifiedClientStorageKeys(employeeId).map((key) => SecureStorageService.getPersistentItem(key)));
  return mergeVerifiedMeetings(...values.map(parseStoredVerifiedClientMeetings));
};
const saveStoredVerifiedClientMeetings = async (records: MeetingResponse[], employeeId?: string) => {
  const serialized = JSON.stringify(records);
  await Promise.all(verifiedClientStorageKeys(employeeId).map((key) => SecureStorageService.setPersistentItem(key, serialized)));
};

/* ───────────────────────── Forms ───────────────────────── */

const emptyAssignForm = () => ({ clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', bestTimeForMeeting: '', salesPersonEmployeeCode: '', assignedAt: localToday() });
const emptyForm = (): VerificationForm => ({ meetingDate: '', meetingTiming: '', ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '', meetingWith: '', personName: '', position: '' });
const emptyClientVerificationForm = (meeting?: MeetingResponse): ClientVerificationForm => {
  const business = String(meeting?.businessGenerated ?? '').trim().toUpperCase();
  const time = timeText(meeting?.meetingTime);
  return {
    newMeetingDate: meeting?.meetingDate?.slice(0, 10) ?? localToday(), meetingTime: time === '—' ? '' : time,
    blueantAppUsed: '', aloneWith: meeting?.aloneWith === 'SOMEONE' ? 'SOMEONE' : 'SELF', personName: '', position: '',
    businessGenerated: business === 'YES' || business === 'NO' ? business : '', businessItems: [],
    // RM/SC meeting remarks are shown in the meeting context. Keep the PC
    // verification remark blank so it is stored as the PC's own response.
    remarks: '', nextFollowupDate: meeting?.nextMeetingDate?.slice(0, 10) ?? '', meetingDate: meeting?.meetingDate?.slice(0, 10) ?? localToday(), blueantAppLocked: false,
  };
};
const clientInvestmentTotal = (form: ClientVerificationForm) => form.businessItems.reduce((total, item) => total + (item.amount.trim() ? Number(item.amount) : 0), 0);
const clientBusinessTypes = (form: ClientVerificationForm) => form.businessGenerated === 'YES' ? form.businessItems.map((item) => item.businessType) : undefined;

/* ───────────────────────── Data loading ───────────────────────── */

const assignedSalesPersonForMobile = async (mobileNumber: string) => {
  const response = await leadSearchApi.search({ keyword: mobileNumber, page: 0, size: 25 });
  const matchedLead = response.data?.content?.find((lead) => digitsOnly(lead.mobileNumber) === digitsOnly(mobileNumber));
  if (!matchedLead) return null;
  if (matchedLead.assignedEmployeeName?.trim()) return matchedLead.assignedEmployeeName.trim();
  const uniqueLeadId = matchedLead.uniqueLeadId?.trim();
  if (!uniqueLeadId) return null;
  return (await leadApi.getLeadDetails(uniqueLeadId)).data?.assignedEmployeeName?.trim() || null;
};
const clientMeetingAsCoordinatorRecord = (meeting: Awaited<ReturnType<typeof clientMeetingApi.getMeeting>>, profile?: ClientProfileResponse | null): MeetingResponse => ({
  meetingCode: meeting.meetingCode,
  meetingNumber: meeting.meetingNumber,
  meetingTitle: 'Client Meeting',
  meetingStatus: meeting.meetingStatus as MeetingResponse['meetingStatus'],
  meetingConducted: meeting.meetingConducted,
  meetingDate: meeting.meetingDate,
  meetingTime: clientMeetingTime(meeting.meetingTime),
  nextMeetingDate: meeting.nextPlanDate,
  clientName: meeting.clientName ?? profile?.clientName,
  mobileNumber: meeting.mobileNumber ?? profile?.mobileNumber,
  alternateMobileNumber: profile?.alternateMobileNumber,
  email: profile?.email,
  speciality: profile?.speciality,
  location: profile?.location,
  clinicAddress: profile?.clinicAddress,
  employeeCode: meeting.assignedEmployeeCode,
  employeeName: meeting.assignedEmployeeName,
  // Client-meeting responses expose the employee code but not the role. Resolve the known
  // assigned code so an active SC filter does not hide Divya's pending client meetings.
  employeeRole: employeeRole(undefined, meeting.assignedEmployeeCode) === 'SC' ? 'SALES_COORDINATOR' : 'RELATIONSHIP_MANAGER',
  meetingMode: meeting.meetingMode as MeetingResponse['meetingMode'],
  aloneWith: meeting.aloneWith,
  personName: meeting.personName,
  position: meeting.position,
  businessGenerated: meeting.businessGenerated,
  blueantAppUsed: meeting.blueantAppUsed,
  investmentType: meeting.investmentType,
  businessTypes: meeting.businessTypes,
  investmentAmount: meeting.investmentAmount,
  remarks: meeting.remarks,
  latitude: meeting.latitude,
  longitude: meeting.longitude,
  locationAccuracy: meeting.locationAccuracy,
  verificationStatus: meeting.verificationStatus,
  isClientMeeting: true,
});
const loadClientMeetings = async (fetchPage: (page?: number) => Promise<VerificationPage>, { pendingOnly = false, markVerified = false } = {}): Promise<MeetingResponse[]> => {
  const firstPage = await fetchPage();
  const remainingPages = await Promise.all(Array.from({ length: Math.max(0, (firstPage.totalPages ?? 1) - 1) }, (_, index) => fetchPage(index + 1)));
  const codes = [firstPage, ...remainingPages].flatMap((page) => page.content ?? [])
    .filter((item) => !pendingOnly || !item.verificationStatus || item.verificationStatus === 'PENDING')
    .map((item) => item.meetingCode?.trim())
    .filter((code): code is string => Boolean(code));
  const records = await Promise.all(codes.map((meetingCode) => clientMeetingApi.getMeeting(meetingCode)));
  const profiles = await Promise.all(records.map((meeting) => meeting.clientCode ? clientMeetingApi.getProfile(meeting.clientCode).catch(() => null) : Promise.resolve(null)));
  return records.map((meeting, index) => {
    const record = clientMeetingAsCoordinatorRecord(meeting, profiles[index]);
    return markVerified ? { ...record, verificationStatus: 'VERIFIED' as const } : record;
  });
};
const loadPendingClientMeetings = () => loadClientMeetings((page) => clientMeetingApi.getPendingVerification(page), { pendingOnly: true });
const loadVerifiedClientMeetings = () => loadClientMeetings((page) => clientMeetingApi.getVerifiedVerification(page), { markVerified: true });
const loadCoordinatorAssignedLeads = async () => {
  const search = (page: number) => leadSearchApi.search({ page, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
  const firstPage = await search(0);
  const leads = [...(firstPage.data?.content ?? [])];
  const totalPages = firstPage.data?.totalPages ?? 1;
  for (let page = 1; page < totalPages; page += 1) leads.push(...((await search(page)).data?.content ?? []));
  // Coordinator ownership is determined by the backend assignment flow. Do not include
  // direct/historical assignments here, otherwise one sales person appears under coordinators
  // who do not own that assignment.
  return leads
    .map((lead) => ({ ...lead, assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt }))
    .filter((lead) => lead.assignmentSource === 'SALES_COORDINATOR' || lead.assignedByCoordinator);
};

/* ───────────────────────── Filtering & export ───────────────────────── */

const leadCardTone = (lead: LeadResponse) => [...String(lead.assignedByEmployeeCode ?? lead.assignedByEmployeeName ?? '')].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
const filterMeetingRecords = (items: readonly MeetingResponse[], filters: MeetingColumnFilter) => items.filter((meeting) => Object.entries(filters).every(([key, filter]) => {
  if (key === 'meetingDate' && filter?.startsWith('range:')) {
    const [from, to] = filter.slice(6).split(',');
    const date = String(meeting.meetingDate ?? '');
    return (!from || date >= from) && (!to || date <= to);
  }
  const choices = filter?.split('|').filter(Boolean) ?? [];
  const current = String(key === 'meetingTitle' ? meeting.meetingTitle ?? meeting.meetingType ?? '' : key === 'employeeRole' ? meetingRole(meeting) : meeting[key as keyof MeetingResponse] ?? '').toLowerCase();
  return !choices.length || choices.some((choice) => {
    const selected = choice.toLowerCase();
    return key === 'employeeName' ? current === selected || current.startsWith(`${selected} `) || selected.startsWith(`${current} `) : current.includes(selected);
  });
}));
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const exportNamePart = (value: string) => value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'all-sales-persons';
const exportDatePart = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : `${date.getDate()}${date.toLocaleString('en-IN', { month: 'short' })}`;
};
const downloadCsv = (headers: readonly string[], rows: readonly (readonly unknown[])[], fileName: string) => {
  const blob = new Blob([`\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${fileName}.csv`; link.click();
  URL.revokeObjectURL(url);
};

/* ───────────────────────── Main screen ───────────────────────── */

export function SalesCoordinatorScreen({ permissions }: { permissions?: readonly string[] | null }) {
  const { isDark } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 760;
  const [tab, setTab] = useState<Tab>('today');
  const [pending, setPending] = useState<MeetingResponse[]>([]);
  const [verified, setVerified] = useState<MeetingResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [tabLoading, setTabLoading] = useState<Tab | null>(null);
  const [tabLoadingProgress, setTabLoadingProgress] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const nextRefreshAt = useRef(Date.now() + 10_000);
  const nextVerifiedRefreshAt = useRef(Date.now() + 5 * 60_000);
  const nextTaskRefreshAt = useRef(Date.now() + 60 * 60_000);
  const nextAssignedLeadsRefreshAt = useRef(Date.now() + 30 * 60_000);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loadInFlight = useRef(false);
  const pendingRefreshInFlight = useRef(false);
  const verifiedRefreshInFlight = useRef(false);
  const taskRefreshInFlight = useRef(false);
  const assignedLeadsRefreshInFlight = useRef(false);
  const dataGeneration = useRef(0);
  const hasLoaded = useRef(false);
  const hasTaskData = useRef(false);
  const hasAssignedLeadsData = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MeetingResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [clientForm, setClientForm] = useState<ClientVerificationForm>(() => emptyClientVerificationForm());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(0);
  const [todayColumnFilters, setTodayColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseColumnFilters, setResponseColumnFilters] = useState<MeetingColumnFilter>({});
  const [taskColumnFilters, setTaskColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseSearch, setResponseSearch] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODAY' | 'PENDING'>('ALL');
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignedLeads, setAssignedLeads] = useState<LeadResponse[]>([]);
  const [assignedLeadsPage, setAssignedLeadsPage] = useState(0);
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [assignedSalesPersonFilter, setAssignedSalesPersonFilter] = useState('');
  const [assignedDateRange, setAssignedDateRange] = useState<AssignedDateRange>({ from: '', to: '' });
  const [historyLead, setHistoryLead] = useState<LeadResponse | null>(null);
  const [historyMeetings, setHistoryMeetings] = useState<MeetingResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingProgress, setHistoryLoadingProgress] = useState(10);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [exportingAssignedLeads, setExportingAssignedLeads] = useState(false);

  const salesPersonNamesByCode = useMemo(() => {
    const values = new Map<string, string>(SALES_PERSONS.map((employee) => [employee.code, employee.name]));
    meetings.forEach((meeting) => {
      if (meeting.employeeCode?.trim() && meeting.employeeName?.trim()) values.set(meeting.employeeCode.trim(), meeting.employeeName.trim());
    });
    assignedLeads.forEach((lead) => {
      if (lead.assignedEmployeeCode?.trim() && lead.assignedEmployeeName?.trim()) values.set(lead.assignedEmployeeCode.trim(), lead.assignedEmployeeName.trim());
    });
    return values;
  }, [assignedLeads, meetings]);

  const exportAssignedLeads = async () => {
    if (Platform.OS !== 'web') { Alert.alert('Excel export', 'Excel export is currently available on the web version.'); return; }
    setExportingAssignedLeads(true);
    try {
      const assignedStamp = (lead: LeadResponse) => String(lead.assignedAt ?? lead.assignmentDate ?? lead.assignedDate ?? '');
      const uniqueLeads = [...visibleAssignedLeads.reduce((byLead, lead) => {
        const key = lead.uniqueLeadId?.trim() || String(lead.leadId ?? lead.leadCode ?? `${lead.mobileNumber ?? ''}:${lead.clientName ?? ''}`);
        const current = byLead.get(key);
        if (!current || assignedStamp(lead) > assignedStamp(current)) byLead.set(key, lead);
        return byLead;
      }, new Map<string, LeadResponse>()).values()];
      const allMeetings = meetings.length ? meetings : await meetingService.getAllMeetingRecords();
      const meetingByCode = new Map<string, MeetingResponse>();
      [...allMeetings, ...pending, ...verified].forEach((meeting) => {
        const key = meeting.meetingCode ?? String(meeting.id ?? '');
        if (key) meetingByCode.set(key, { ...meetingByCode.get(key), ...meeting });
      });
      const sortKey = (m: MeetingResponse) => `${String(m.meetingDate ?? m.createdAt ?? '')}T${timeText(m.meetingTime)}|${String(m.updatedAt ?? m.lastModifiedDate ?? '')}`;
      const rows = uniqueLeads.map((lead) => {
        const latestMeeting = [...meetingByCode.values()]
          .filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber)))
          .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))[0];
        return [
          lead.clientName, lead.mobileNumber, lead.speciality, lead.location, lead.clinicAddress,
          lead.assignedEmployeeName, lead.assignedByEmployeeName, lead.assignedAt, lead.leadStatus?.replace(/_/g, ' '),
          latestMeeting?.ageGroup, latestMeeting?.existingSip, latestMeeting?.profession, latestMeeting?.professionDetail, latestMeeting?.bestTimeForMeeting,
          latestMeeting?.meetingTitle ?? latestMeeting?.meetingType, latestMeeting?.meetingStatus, latestMeeting?.meetingDate, timeText(latestMeeting?.meetingTime), latestMeeting?.meetingMode, latestMeeting?.leadStatus?.replace(/_/g, ' '), latestMeeting?.aloneWith, latestMeeting?.personName, latestMeeting?.position, latestMeeting?.remarks ?? latestMeeting?.meetingRemarks ?? latestMeeting?.discussion, latestMeeting?.nextMeetingDate,
          latestMeeting?.id, lead.leadId,
        ];
      });
      const headers = ['Client Name', 'Mobile Number', 'Speciality', 'Location', 'Clinic Address', 'Sales Person', 'Sales Coordinator', 'Assigned Date', 'Current Lead Status', 'SC Age Group', 'SC Prior Investment', 'SC Profession', 'SC Firm / Clinic', 'SC Best Time', 'Latest Meeting Type', 'Latest Meeting Status', 'Latest Meeting Date', 'Latest Meeting Time', 'Latest Meeting Mode', 'Latest Meeting Lead Status', 'Latest Meeting Joined With', 'Latest Meeting Person Name', 'Latest Meeting Person Position', 'Latest Meeting Remarks', 'Latest Next Plan Date'];
      headers.push('Meeting ID', 'Lead ID');
      const from = exportDatePart(assignedDateRange.from);
      const to = exportDatePart(assignedDateRange.to);
      const dateRangeName = from && to ? `${from}-to-${to}` : from ? `from-${from}` : to ? `to-${to}` : 'all-dates';
      downloadCsv(headers, rows, `assigned-leads-${exportNamePart(assignedSalesPersonFilter)}-${dateRangeName}`);
    } catch (e) { Alert.alert('Excel export', e instanceof Error ? e.message : 'Assigned lead export failed.'); }
    finally { setExportingAssignedLeads(false); }
  };

  const load = useCallback(async (includeDeferredData = false) => {
    if (loadInFlight.current || submittingRef.current) return;
    loadInFlight.current = true;
    const generation = dataGeneration.current;
    if (!hasLoaded.current) { setLoadingProgress(10); setLoading(true); }
    setRefreshing(true);
    try {
      const [leadPending, clientPending, leadVerified, clientVerified, deferred] = await Promise.all([
        meetingService.getVerificationMeetings('PENDING').then((result) => { setLoadingProgress(40); return result; }),
        loadPendingClientMeetings().catch(() => []),
        meetingService.getVerificationMeetings('VERIFIED').then((result) => { setLoadingProgress(70); return result; }),
        loadVerifiedClientMeetings().catch(() => []),
        includeDeferredData ? Promise.all([meetingService.getAllMeetingRecords(), loadCoordinatorAssignedLeads()]).then((result) => { setLoadingProgress(90); return result; }) : Promise.resolve(null),
      ]);
      if (generation !== dataGeneration.current) return;
      const currentUser = await SecureStorageService.getUserData();
      const locallyVerifiedClients = await loadStoredVerifiedClientMeetings(currentUser?.employeeId);
      setLoadingProgress(100); setPending([...leadPending, ...clientPending]); setVerified(mergeVerifiedMeetings(leadVerified, clientVerified, locallyVerifiedClients));
      if (deferred) { setMeetings(deferred[0]); setAssignedLeads(deferred[1]); hasTaskData.current = true; hasAssignedLeadsData.current = true; }
      hasLoaded.current = true;
      setError(null); setRefreshError(null);
    } catch (e) {
      if (generation !== dataGeneration.current) return;
      const message = e instanceof Error ? e.message : 'Coordinator data could not be loaded.';
      if (hasLoaded.current) setRefreshError(message);
      else setError(message);
    }
    finally {
      loadInFlight.current = false; setLoading(false); setRefreshing(false);
      nextRefreshAt.current = Date.now() + 10_000;
      nextVerifiedRefreshAt.current = Date.now() + 5 * 60_000;
      nextTaskRefreshAt.current = Date.now() + 60 * 60_000;
      nextAssignedLeadsRefreshAt.current = Date.now() + 30 * 60_000;
    }
  }, []);
  const refreshPendingMeetings = useCallback(async () => {
    if (loadInFlight.current || pendingRefreshInFlight.current || submittingRef.current) return;
    pendingRefreshInFlight.current = true;
    try {
      const [leadPending, clientPending] = await Promise.all([meetingService.getVerificationMeetings('PENDING'), loadPendingClientMeetings().catch(() => [])]);
      setPending([...leadPending, ...clientPending]);
    } finally { pendingRefreshInFlight.current = false; nextRefreshAt.current = Date.now() + 10_000; }
  }, []);
  const refreshVerifiedMeetings = useCallback(async () => {
    if (loadInFlight.current || verifiedRefreshInFlight.current || submittingRef.current) return;
    verifiedRefreshInFlight.current = true;
    try {
      const [leadVerified, clientVerified, currentUser] = await Promise.all([meetingService.getVerificationMeetings('VERIFIED'), loadVerifiedClientMeetings().catch(() => []), SecureStorageService.getUserData()]);
      const locallyVerifiedClients = await loadStoredVerifiedClientMeetings(currentUser?.employeeId);
      setVerified(mergeVerifiedMeetings(leadVerified, clientVerified, locallyVerifiedClients));
    } finally { verifiedRefreshInFlight.current = false; nextVerifiedRefreshAt.current = Date.now() + 5 * 60_000; }
  }, []);
  const refreshTaskMeetings = useCallback(async () => {
    if (!hasTaskData.current || loadInFlight.current || taskRefreshInFlight.current || submittingRef.current) return;
    taskRefreshInFlight.current = true;
    try { setMeetings(await meetingService.getAllMeetingRecords()); }
    finally { taskRefreshInFlight.current = false; nextTaskRefreshAt.current = Date.now() + 60 * 60_000; }
  }, []);
  const refreshAssignedLeads = useCallback(async () => {
    if (!hasAssignedLeadsData.current || loadInFlight.current || assignedLeadsRefreshInFlight.current || submittingRef.current) return;
    assignedLeadsRefreshInFlight.current = true;
    try { setAssignedLeads(await loadCoordinatorAssignedLeads()); }
    finally { assignedLeadsRefreshInFlight.current = false; nextAssignedLeadsRefreshAt.current = Date.now() + 30 * 60_000; }
  }, []);
  useEffect(() => {
    void load();
    const todayTimer = setInterval(() => { if (Date.now() >= nextRefreshAt.current) void refreshPendingMeetings(); }, 1000);
    const verifiedTimer = setInterval(() => void refreshVerifiedMeetings(), 5 * 60_000);
    const taskTimer = setInterval(() => void refreshTaskMeetings(), 60 * 60_000);
    const assignedTimer = setInterval(() => void refreshAssignedLeads(), 30 * 60_000);
    return () => { clearInterval(todayTimer); clearInterval(verifiedTimer); clearInterval(taskTimer); clearInterval(assignedTimer); dataGeneration.current += 1; };
  }, [load, refreshAssignedLeads, refreshPendingMeetings, refreshTaskMeetings, refreshVerifiedMeetings]);
  useEffect(() => {
    if (tab === 'tasks' && !hasTaskData.current && tabLoading !== 'tasks') {
      setTabLoadingProgress(10); setTabLoading('tasks');
      void Promise.all([
        meetingService.getAllMeetingRecords().then((result) => { setTabLoadingProgress(50); return result; }),
        (hasAssignedLeadsData.current ? Promise.resolve(assignedLeads) : loadCoordinatorAssignedLeads()).then((result) => { setTabLoadingProgress(90); return result; }),
      ])
        .then(([taskMeetings, leads]) => { setTabLoadingProgress(100); setMeetings(taskMeetings); if (!hasAssignedLeadsData.current) { setAssignedLeads(leads); hasAssignedLeadsData.current = true; } hasTaskData.current = true; })
        .catch((e: unknown) => setRefreshError(e instanceof Error ? e.message : 'Sales person tasks could not be loaded.'))
        .finally(() => setTabLoading(null));
    }
    if (tab === 'assignedLeads' && !hasAssignedLeadsData.current && tabLoading !== 'assignedLeads') {
      setTabLoadingProgress(10); setTabLoading('assignedLeads');
      void loadCoordinatorAssignedLeads()
        .then((leads) => { setTabLoadingProgress(100); setAssignedLeads(leads); hasAssignedLeadsData.current = true; })
        .catch((e: unknown) => setRefreshError(e instanceof Error ? e.message : 'Assigned leads could not be loaded.'))
        .finally(() => setTabLoading(null));
    }
  }, [assignedLeads, tab, tabLoading]);

  const taskStatus = (m: MeetingResponse): 'TODAY' | 'PENDING' | 'OTHER' => {
    const taskDate = String(m.nextMeetingDate ?? m.meetingDate ?? '').slice(0, 10);
    if (taskDate === localToday()) return 'TODAY';
    if (m.meetingTitle === 'Lead') return !taskDate || taskDate < localToday() ? 'PENDING' : 'OTHER';
    return taskDate && taskDate < localToday() ? 'PENDING' : 'OTHER';
  };
  const taskMeetings = useMemo(() => {
    if (tab !== 'tasks') return [];
    return meetings.filter((meeting) => {
      if (String(meeting.meetingStatus ?? '').toUpperCase() === 'COMPLETED') return false;
      const assignedLead = assignedLeads.find((lead) => (meeting.leadId !== undefined && lead.leadId === meeting.leadId) || (Boolean(meeting.leadCode) && lead.leadCode === meeting.leadCode));
      return !EXCLUDED_TASK_LEAD_STATUSES.has(String(meeting.leadStatus ?? '').toUpperCase())
        && !EXCLUDED_TASK_LEAD_STATUSES.has(String(assignedLead?.leadStatus ?? '').toUpperCase());
    });
  }, [assignedLeads, meetings, tab]);
  const taskLeads = useMemo<MeetingResponse[]>(() => {
    if (tab !== 'tasks') return [];
    const meetingLeadKeys = new Set(taskMeetings.flatMap((meeting) => [
      meeting.leadId !== undefined ? `id:${meeting.leadId}` : '',
      meeting.leadCode ? `code:${meeting.leadCode}` : '',
    ]).filter(Boolean));
    const updatedStamp = (m: MeetingResponse) => String(m.workflowUpdatedAt ?? m.updatedAt ?? m.lastModifiedDate ?? m.meetingDate ?? '');
    return assignedLeads
      .filter((lead) => {
        const keys = [lead.leadId !== undefined ? `id:${lead.leadId}` : '', lead.leadCode ? `code:${lead.leadCode}` : ''].filter(Boolean);
        return !EXCLUDED_TASK_LEAD_STATUSES.has(String(lead.leadStatus ?? '').toUpperCase()) && keys.every((key) => !meetingLeadKeys.has(key));
      })
      .map((lead) => {
        const latestMeetingWithNextPlan = [...meetings, ...pending, ...verified]
          .filter((meeting) => Boolean(meeting.nextMeetingDate) && (
            (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber))
          ))
          .sort((left, right) => updatedStamp(right).localeCompare(updatedStamp(left)))[0];
        return {
          leadId: lead.leadId,
          leadCode: lead.leadCode,
          clientName: lead.clientName,
          mobileNumber: lead.mobileNumber,
          employeeName: lead.assignedEmployeeName,
          employeeCode: lead.assignedEmployeeCode,
          meetingTitle: 'Lead',
          meetingDate: String(latestMeetingWithNextPlan?.nextMeetingDate ?? lead.assignedAt ?? '').slice(0, 10),
          meetingStatus: 'SCHEDULED',
          leadStatus: lead.leadStatus as MeetingResponse['leadStatus'],
        };
      });
  }, [assignedLeads, meetings, pending, tab, taskMeetings, verified]);
  const taskRecords = useMemo(() => tab === 'tasks' ? [...taskLeads, ...taskMeetings] : [], [tab, taskLeads, taskMeetings]);
  const filteredTasks = useMemo(() => {
    if (tab !== 'tasks') return [];
    const query = taskSearch.trim().toLowerCase();
    const matchingTasks = taskRecords.filter((m) => {
      const searchMatch = !query || String(m.clientName ?? '').toLowerCase().includes(query) || String(m.mobileNumber ?? '').toLowerCase().includes(query);
      return searchMatch && (statusFilter === 'ALL' || taskStatus(m) === statusFilter);
    });
    return filterMeetingRecords(matchingTasks, taskColumnFilters);
  }, [statusFilter, tab, taskColumnFilters, taskRecords, taskSearch]);
  const pagedTasks = useMemo(() => filteredTasks.slice(taskPage * PAGE_SIZE, (taskPage + 1) * PAGE_SIZE), [filteredTasks, taskPage]);
  const visibleTodayMeetings = useMemo(() => filterMeetingRecords(pending, todayColumnFilters), [pending, todayColumnFilters]);
  const visibleVerifiedMeetings = useMemo(() => filterMeetingRecords(verified.filter((meeting) => matchesSearch(meeting.clientName, responseSearch) || matchesSearch(meeting.mobileNumber, responseSearch)), responseColumnFilters), [responseColumnFilters, responseSearch, verified]);
  const visibleAssignedLeads = useMemo(() => assignedLeads.filter((lead) => (
    (matchesSearch(lead.clientName, assignedSearch) || matchesSearch(lead.mobileNumber, assignedSearch))
    && (!coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter)
    && belongsToCoordinatorTeam(coordinatorFilter, lead.assignedEmployeeName)
    && (!assignedSalesPersonFilter || lead.assignedEmployeeName === assignedSalesPersonFilter)
    && matchesAssignedDate(lead.assignedAt, assignedDateRange)
  )), [assignedDateRange, assignedLeads, assignedSalesPersonFilter, assignedSearch, coordinatorFilter]);
  const pagedAssignedLeads = useMemo(() => visibleAssignedLeads.slice(assignedLeadsPage * PAGE_SIZE, (assignedLeadsPage + 1) * PAGE_SIZE), [assignedLeadsPage, visibleAssignedLeads]);
  useEffect(() => { setTaskPage(0); }, [taskSearch, statusFilter, taskColumnFilters]);
  useEffect(() => { setAssignedLeadsPage(0); }, [assignedSearch, coordinatorFilter, assignedSalesPersonFilter, assignedDateRange]);
  useEffect(() => { setTaskPage((page) => Math.min(page, Math.max(0, Math.ceil(filteredTasks.length / PAGE_SIZE) - 1))); }, [filteredTasks.length]);
  useEffect(() => { setAssignedLeadsPage((page) => Math.min(page, Math.max(0, Math.ceil(visibleAssignedLeads.length / PAGE_SIZE) - 1))); }, [visibleAssignedLeads.length]);
  const taskSalesPeople = useMemo(() => new Set(assignedLeads.map((lead) => lead.assignedEmployeeCode ?? lead.assignedEmployeeName).filter(Boolean)).size, [assignedLeads]);

  const assignLead = async () => {
    const values = Object.values(assignForm).map((value) => value.trim());
    if (values.some((value) => !value)) { setAssignMessage({ type: 'error', text: 'Please complete all fields, including the employee code.' }); return; }
    if (!/^\d{10}$/.test(assignForm.mobileNumber.trim())) { setAssignMessage({ type: 'error', text: 'Mobile number must contain exactly 10 digits.' }); return; }
    setAssigning(true); setAssignMessage(null);
    try {
      const { assignedAt, bestTimeForMeeting, ...leadValues } = assignForm;
      const lead = await leadService.assignLead({ ...leadValues, clientName: assignForm.clientName.trim(), mobileNumber: assignForm.mobileNumber.trim(), location: assignForm.location.trim(), clinicAddress: assignForm.clinicAddress.trim(), speciality: assignForm.speciality.trim(), bestTimeToMeet: bestTimeForMeeting as AssignLeadRequest['bestTimeToMeet'], salesPersonEmployeeCode: assignForm.salesPersonEmployeeCode.trim().toUpperCase(), assignmentDate: assignedAt });
      setAssignForm(emptyAssignForm());
      setAssignMessage({ type: 'success', text: `${lead.clientName ?? 'Lead'} assigned successfully${lead.assignedEmployeeName ? ` to ${lead.assignedEmployeeName}` : ''}.` });
    } catch (e) {
      let text = e instanceof Error ? e.message : 'Lead assignment failed.';
      if (isAlreadyAssignedError(e)) {
        try {
          const salesPersonName = await assignedSalesPersonForMobile(assignForm.mobileNumber);
          text = salesPersonName ? `This lead is assigned to ${salesPersonName}.` : 'This mobile number already belongs to an existing lead.';
        } catch {
          // The original backend message remains visible if the optional name lookup is unavailable.
        }
      }
      setAssignMessage({ type: 'error', text });
    }
    finally { setAssigning(false); }
  };

  const openVerify = (meeting: MeetingResponse) => {
    setForm(createMeetingVerificationForm(meeting, verified));
    const priorClientVerification = verified.find((item) => {
      if (!item.isClientMeeting || !item.blueantAppUsed) return false;
      const currentMobile = digitsOnly(meeting.mobileNumber);
      const priorMobile = digitsOnly(item.mobileNumber);
      if (currentMobile && priorMobile) return currentMobile === priorMobile;
      return Boolean(meeting.clientName && item.clientName && meeting.clientName.trim().toLowerCase() === item.clientName.trim().toLowerCase());
    });
    const nextClientForm = emptyClientVerificationForm(meeting);
    if (priorClientVerification?.blueantAppUsed) {
      nextClientForm.blueantAppUsed = priorClientVerification.blueantAppUsed;
      nextClientForm.blueantAppLocked = true;
    }
    setClientForm(nextClientForm);
    setSubmitError(null); setSelected(meeting);
  };
  const verifyClientMeeting = async (meeting: MeetingResponse & { meetingCode: string }) => {
    const isNotConducted = isNotConductedMeeting(meeting);
    const date = isNotConducted ? clientForm.meetingDate : clientForm.newMeetingDate;
    const business = !isNotConducted && clientForm.businessGenerated === 'YES';
    if (!date) { setSubmitError('Please choose the meeting date.'); return; }
    if (!isNotConducted && !clientForm.meetingTime) { setSubmitError('Please choose the meeting time.'); return; }
    if (!isNotConducted && !clientForm.blueantAppUsed) { setSubmitError('Please select whether the BlueAnt app was used.'); return; }
    if (!isNotConducted && clientForm.aloneWith === 'SOMEONE' && (!clientForm.personName.trim() || !clientForm.position)) { setSubmitError('Please enter the person name and select their designation.'); return; }
    if (!isNotConducted && !clientForm.businessGenerated) { setSubmitError('Please select whether business was generated.'); return; }
    if (business && !clientForm.businessItems.length) { setSubmitError('Select at least one business category.'); return; }
    const invalidBusinessItem = business && clientForm.businessItems.find((item) => {
      const requiresAmount = clientBusinessDefinition(item.businessType).requiresAmount;
      return (requiresAmount || item.amount.trim()) && !isValidAmount(item.amount);
    });
    if (invalidBusinessItem) { setSubmitError(`Enter a valid amount (0 or more) for ${clientBusinessDefinition(invalidBusinessItem.businessType).label}.`); return; }
    // Reference is represented by its concrete backend business types: INSURANCE, SHARES and LOAN.
    submittingRef.current = true; setSubmitting(true); setSubmitError(null); dataGeneration.current += 1;
    try {
      const remarks = clientForm.remarks.trim() || undefined;
      const businessTypes = clientBusinessTypes(clientForm);
      const investmentAmount = clientForm.businessGenerated === 'YES' ? clientInvestmentTotal(clientForm) : undefined;
      const businessItems = clientForm.businessGenerated === 'YES' ? clientForm.businessItems.map((item) => ({
        businessType: item.businessType,
        amount: item.amount.trim() ? Number(item.amount) : null,
      })) : undefined;
      const verifiedClientMeeting = await clientMeetingApi.verify(meeting.meetingCode, isNotConducted ? { meetingDate: clientForm.meetingDate, remarks } : {
        newMeetingDate: clientForm.newMeetingDate,
        meetingTime: clientForm.meetingTime, blueantAppUsed: clientForm.blueantAppUsed.trim() || undefined,
        aloneWith: clientForm.aloneWith,
        ...(clientForm.aloneWith === 'SOMEONE' ? { personName: clientForm.personName.trim(), position: clientForm.position.replace(/_/g, ' ') } : {}),
        businessGenerated: clientForm.businessGenerated || undefined, businessItems, remarks,
      });
      // The verification endpoint returns the PC answers but may omit the original client/profile
      // fields. Keep the values already loaded for the pending meeting so the verified list and
      // response modal remain useful after submission.
      const verifiedClientRecord: MeetingResponse = {
        ...clientMeetingAsCoordinatorRecord(verifiedClientMeeting),
        clientName: verifiedClientMeeting.clientName ?? meeting.clientName,
        mobileNumber: verifiedClientMeeting.mobileNumber ?? meeting.mobileNumber,
        alternateMobileNumber: meeting.alternateMobileNumber,
        email: meeting.email,
        speciality: meeting.speciality,
        location: meeting.location,
        clinicAddress: meeting.clinicAddress,
        employeeCode: verifiedClientMeeting.assignedEmployeeCode ?? meeting.employeeCode,
        employeeName: verifiedClientMeeting.assignedEmployeeName ?? meeting.employeeName,
        employeeRole: meeting.employeeRole,
        meetingMode: (verifiedClientMeeting.meetingMode ?? meeting.meetingMode) as MeetingResponse['meetingMode'],
        nextMeetingDate: verifiedClientMeeting.nextPlanDate ?? meeting.nextMeetingDate,
        meetingDate: clientForm.newMeetingDate,
        meetingTime: clientMeetingTime(clientForm.meetingTime),
        aloneWith: clientForm.aloneWith,
        personName: clientForm.aloneWith === 'SOMEONE' ? clientForm.personName.trim() : undefined,
        position: clientForm.aloneWith === 'SOMEONE' ? clientForm.position.replace(/_/g, ' ') : undefined,
        blueantAppUsed: clientForm.blueantAppUsed,
        businessGenerated: clientForm.businessGenerated,
        businessTypes,
        investmentType: undefined,
        investmentAmount,
        // Keep the RM/SC meeting note and the PC verification answer separate.
        // The verification API currently returns its response in `remarks`.
        remarks: meeting.remarks ?? meeting.meetingRemarks,
        meetingRemarks: meeting.meetingRemarks ?? meeting.remarks,
        verificationRemarks: verifiedClientMeeting.remarks ?? remarks,
        verificationStatus: 'VERIFIED',
      };
      setPending((items) => items.filter((item) => item.meetingCode !== meeting.meetingCode));
      const currentUser = await SecureStorageService.getUserData();
      const locallyVerifiedClients = await loadStoredVerifiedClientMeetings(currentUser?.employeeId);
      await saveStoredVerifiedClientMeetings(mergeVerifiedMeetings([verifiedClientRecord], locallyVerifiedClients), currentUser?.employeeId);
      setVerified((items) => mergeVerifiedMeetings([verifiedClientRecord], items));
      setSelected(null);
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Client meeting verification failed.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  const verify = async () => {
    if (!selected?.meetingCode || submittingRef.current) return;
    if (selected.isClientMeeting) { await verifyClientMeeting({ ...selected, meetingCode: selected.meetingCode }); return; }
    const notConducted = isNotConductedMeeting(selected);
    if (!form.meetingDate) { setSubmitError('Please choose the meeting date.'); return; }
    if (!form.meetingTiming) { setSubmitError('Please choose the meeting time.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(form.meetingTiming)) { setSubmitError('Meeting Time must use HH:mm:ss format.'); return; }
    if (!notConducted && !form.meetingWith) { setSubmitError('Please choose who joined the meeting.'); return; }
    if (!notConducted && form.meetingWith === 'SOMEONE_ELSE' && (!form.personName.trim() || !form.position.trim())) { setSubmitError('Please enter the person name and position.'); return; }
    const visibleValues = Object.fromEntries(
      (notConducted ? NOT_CONDUCTED_FIELDS : FIELDS)
        .filter((field) => isVerificationFieldVisible(field.key, form.meetingWith))
        .map((field) => [field.key, form[field.key].trim()]).filter(([, fieldValue]) => Boolean(fieldValue)),
    ) as MeetingVerificationRequest;
    const payload: MeetingVerificationRequest = notConducted ? visibleValues : { ...visibleValues, aloneWith: form.meetingWith === 'SELF' ? 'SELF' : 'SOMEONE', meetingWith: form.meetingWith };
    submittingRef.current = true; setSubmitting(true); setSubmitError(null);
    dataGeneration.current += 1;
    try {
      await meetingService.verifyMeeting(selected.meetingCode, payload);
      setPending((items) => items.filter((m) => m.meetingCode !== selected.meetingCode));
      setSelected(null);
      void meetingService.getVerificationMeetings('VERIFIED').then(setVerified).catch(() => undefined);
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Meeting verification failed.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  const openLeadHistory = async (lead: LeadResponse) => {
    setHistoryLead(lead); setHistoryMeetings([]); setHistoryError(null); setHistoryLoadingProgress(10); setHistoryLoading(true);
    const leadIdentifier = lead.uniqueLeadId ?? (lead.leadId !== undefined ? String(lead.leadId) : '');
    const sameLead = (meeting: MeetingResponse) => (lead.leadId !== undefined && meeting.leadId === lead.leadId) || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode);
    const localMeetings = meetings.filter(sameLead);
    const verifiedMeetings = verified.filter(sameLead);
    try {
      const [detailResult, historyResult] = await Promise.all([
        lead.uniqueLeadId ? leadApi.getLeadDetails(lead.uniqueLeadId).then((result) => { setHistoryLoadingProgress(50); return result; }).catch(() => null) : Promise.resolve(null),
        leadIdentifier ? meetingApi.getHistory(leadIdentifier).then((result) => { setHistoryLoadingProgress(80); return result; }).catch(() => null) : Promise.resolve(null),
      ]);
      const byCode = new Map<string, MeetingResponse>();
      [...(historyResult?.data ?? []), ...localMeetings, ...verifiedMeetings].forEach((meeting) => { const key = meeting.meetingCode ?? String(meeting.id ?? ''); if (key) byCode.set(key, { ...byCode.get(key), ...meeting }); });
      const detailedMeetings = await Promise.all([...byCode.values()].map(async (meeting) => meeting.meetingCode ? meetingApi.getMeeting(meeting.meetingCode).then((result) => result.data ?? meeting).catch(() => meeting) : meeting));
      setHistoryLoadingProgress(100); setHistoryLead(detailResult?.data ? { ...lead, ...detailResult.data } : lead);
      setHistoryMeetings(detailedMeetings.sort((a, b) => String(b.meetingDate ?? b.createdAt ?? '').localeCompare(String(a.meetingDate ?? a.createdAt ?? ''))));
    } catch (e) { setHistoryError(e instanceof Error ? e.message : 'Lead history could not be loaded.'); setHistoryMeetings(localMeetings); }
    finally { setHistoryLoading(false); }
  };

  const renderTab = (item: typeof TABS[number]) => {
    const tone = item.key === 'today' ? 'Today' : item.key === 'responses' ? 'Responses' : item.key === 'tasks' ? 'Tasks' : 'Assign';
    const active = tab === item.key;
    const tabColor = tone === 'Today' ? '#4338CA' : tone === 'Responses' ? '#6D28D9' : tone === 'Tasks' ? '#047857' : '#B45309';
    const selectedForeground = isDark && Platform.OS === 'web' ? '#000000' : '#FFFFFF';
    return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, styles[`tab${tone}`], active && styles[`tab${tone}Active`]]}><View style={[styles.tabIcon, styles[`tab${tone}Icon`], active && styles.tabIconActive]}><Icon source={item.icon} size={14} color={active ? selectedForeground : tabColor} /></View><Text style={[styles.tabText, styles[`tab${tone}Color`], active && styles.tabTextActive, active && isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{item.label}</Text>{item.key === 'today' ? <Text style={[styles.badge, styles.badgeToday, active && styles.badgeActive]}>{pending.length}</Text> : null}</Pressable>;
  };
  const metricsBlock = <View style={styles.metrics}><Metric icon="clock-outline" value={pending.length} label="To review" tone="blue" /><Metric icon="account-outline" value={taskSalesPeople} label="Sales people" tone="orange" /></View>;
  const syncBlock = <View style={[styles.syncControls, compact && styles.syncControlsCompact]}><Pressable disabled={refreshing || submitting} onPress={() => void load(true)} style={({ pressed }) => [styles.syncButton, (refreshing || submitting) && styles.disabled, pressed && styles.pressed]}><Icon source="refresh" size={17} color="#3156C8" /><Text style={styles.refreshText}>Sync data</Text></Pressable><AutoRefreshBadge tab={tab} refreshing={refreshing} submitting={submitting} nextRefreshAt={nextRefreshAt} nextVerifiedRefreshAt={nextVerifiedRefreshAt} nextTaskRefreshAt={nextTaskRefreshAt} nextAssignedLeadsRefreshAt={nextAssignedLeadsRefreshAt} /></View>;
  const subtitle = tab === 'today' ? `Showing ${visibleTodayMeetings.length} of ${pending.length} meetings`
    : tab === 'responses' ? `Showing ${visibleVerifiedMeetings.length} of ${verified.length} verified meetings`
    : tab === 'tasks' ? `Showing ${filteredTasks.length} of ${taskRecords.length} active tasks`
    : tab === 'assignedLeads' ? `Showing ${visibleAssignedLeads.length} of ${assignedLeads.length} assigned leads`
    : 'Create a physical lead and assign it to a sales person';
  const hasAssignedFilters = Boolean(assignedSearch || coordinatorFilter || assignedSalesPersonFilter || assignedDateRange.from || assignedDateRange.to);
  const clearAssignedFilters = () => { setAssignedSearch(''); setCoordinatorFilter(''); setAssignedSalesPersonFilter(''); setAssignedDateRange({ from: '', to: '' }); };

  return <View style={[styles.page, compact && styles.pageCompact]}>
    <View style={styles.topSection}>
      <View style={[styles.workspaceHeader, compact && styles.workspaceHeaderCompact]}>{compact ? <><View style={styles.mobileHeaderTopRow}>{metricsBlock}{syncBlock}</View><View style={styles.mobileTabRow}>{TABS.slice(0, 3).map(renderTab)}</View><View style={styles.mobileTabRow}>{TABS.slice(3).map(renderTab)}</View></> : <>{metricsBlock}<View style={[styles.tabs, styles.workspaceTabs]}>{TABS.map(renderTab)}</View>{syncBlock}</>}</View>
      {refreshError ? <Text style={styles.error}>Sync failed. Retrying automatically in 10 seconds.</Text> : null}
    </View>
    <View style={styles.contentPanel}>
      <View style={styles.contentHeading}>
        <View style={[styles.contentHeadingRow, compact && styles.contentHeadingRowCompact]}>
          <View>
            <Text style={styles.contentTitle}>{TABS.find((item) => item.key === tab)?.label}</Text>
            <Text style={styles.contentSubtitle}>{subtitle}</Text>
          </View>
          {tab === 'responses' ? <TextInput value={responseSearch} onChangeText={setResponseSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} /> : null}
          {tab === 'tasks' && !loading && !error ? <TaskToolbar search={taskSearch} onSearch={setTaskSearch} status={statusFilter} onStatus={setStatusFilter} /> : null}
          {tab === 'assignedLeads' ? <View style={[styles.assignedHeaderActions, compact && styles.assignedHeaderActionsCompact]}>
            <HeaderLeadFilters leads={assignedLeads} coordinatorFilter={coordinatorFilter} setCoordinatorFilter={setCoordinatorFilter} salesPersonFilter={assignedSalesPersonFilter} setSalesPersonFilter={setAssignedSalesPersonFilter} dateRange={assignedDateRange} setDateRange={setAssignedDateRange} search={assignedSearch} setSearch={setAssignedSearch} />
            {!compact ? <Pressable accessibilityLabel="Export assigned leads to Excel" disabled={exportingAssignedLeads} onPress={() => void exportAssignedLeads()} style={({ pressed }) => [styles.assignedExportButton, exportingAssignedLeads && styles.disabled, pressed && styles.pressed]}>{exportingAssignedLeads ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="file-excel-outline" size={18} color="#FFFFFF" />}</Pressable> : null}
            {hasAssignedFilters ? <Pressable accessibilityLabel="Clear assigned lead filters" onPress={clearAssignedFilters} style={styles.assignedClearButton}><Text style={styles.assignedClearText}>Clear</Text></Pressable> : null}
          </View> : null}
        </View>
      </View>
      {!compact && !loading && !error && tab === 'today' ? <MeetingTableHeader hideMeetingDate records={pending} filters={todayColumnFilters} onFiltersChange={setTodayColumnFilters} /> : null}
      {tab === 'tasks' ? <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator stickyHeaderIndices={[0]}>
        <View style={styles.taskStickyHeader}>{!compact && !loading && !error && tabLoading !== 'tasks' ? <MeetingTableHeader taskOnly records={taskRecords} filters={taskColumnFilters} onFiltersChange={setTaskColumnFilters} /> : null}</View>
        <View>
          {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
          {loading || tabLoading === 'tasks' ? <State loading progress={loading ? loadingProgress : tabLoadingProgress} message="Loading sales person tasks..." /> : error ? <State message={error} /> : null}
          {!loading && tabLoading !== 'tasks' && !error ? <><Cards taskOnly items={pagedTasks} empty="No meeting tasks match these filters." /><Pagination page={taskPage} total={filteredTasks.length} onPageChange={setTaskPage} /></> : null}
        </View>
      </ScrollView> : <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={tab === 'responses'} stickyHeaderIndices={tab === 'responses' ? [0] : undefined}>
        <View style={tab === 'responses' ? styles.verifiedStickyHeader : undefined}>{!compact && !loading && !error && tab === 'responses' ? <MeetingTableHeader verified records={verified} filters={responseColumnFilters} onFiltersChange={setResponseColumnFilters} /> : null}</View>
        {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
        {loading ? <State loading progress={loadingProgress} message="Loading coordinator workspace..." /> : tabLoading === 'assignedLeads' ? <State loading progress={tabLoadingProgress} message="Loading assigned leads..." /> : error ? <State message={error} /> : null}
        {!loading && !error && tab === 'today' ? <Cards hideMeetingDate items={visibleTodayMeetings} empty="No meetings are pending Process Coordinator verification." action="Verify Details" onOpen={openVerify} /> : null}
        {!loading && !error && tab === 'responses' ? <Cards items={visibleVerifiedMeetings} empty="No meetings have been verified by the Sales Coordinator yet." action="View Response" onOpen={setSelected} verified /> : null}
        {!loading && !error && tab === 'assign' ? <AssignLeadForm compact={compact} form={assignForm} setForm={setAssignForm} assigning={assigning} message={assignMessage} salesPersonNamesByCode={salesPersonNamesByCode} onSubmit={() => void assignLead()} /> : null}
        {!loading && tabLoading !== 'assignedLeads' && !error && tab === 'assignedLeads' ? <><AssignedLeadCards leads={pagedAssignedLeads} onOpen={openLeadHistory} /><Pagination page={assignedLeadsPage} total={visibleAssignedLeads.length} onPageChange={setAssignedLeadsPage} /></> : null}
      </ScrollView>}
    </View>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View nativeID="blueant-workflow-modal" style={[styles.modal, selected && tab !== 'responses' && !selected.isClientMeeting && [popupStyles.modal, { width: Math.min(1100, Math.max(0, windowWidth - 48)) }]]}>
      {selected && tab !== 'responses' && !selected.isClientMeeting ? (
        <LeadVerificationPopup meeting={selected} form={form} setForm={setForm} submitError={submitError} submitting={submitting} onSubmit={() => void verify()} onClose={() => setSelected(null)} />
      ) : <>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text></View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>
        {selected ? <Details meeting={selected} visitOnly={isNotConductedMeeting(selected)} /> : null}
        {tab === 'responses' && selected ? selected.isClientMeeting ? <ClientVerificationDetails meeting={selected} /> : <VerificationDetails meeting={selected} />
          : selected?.isClientMeeting ? <ClientVerificationFields meeting={selected} form={clientForm} setForm={setClientForm} submitError={submitError} submitting={submitting} onSubmit={() => void verify()} />
          : selected ? <View style={[styles.formSection, verificationStyles.section]}>
            <Text style={styles.sectionTitle}>{isNotConductedMeeting(selected) ? 'Verify Location Visit' : 'PC Additional Information'}</Text>
            {isNotConductedMeeting(selected) ? <Text style={styles.help}>Confirm only the date and time of this visited-but-not-met record.</Text> : null}
            <View style={styles.formGrid}>{(isNotConductedMeeting(selected) ? NOT_CONDUCTED_FIELDS : FIELDS).map((field) => <VerificationFormField key={field.key} field={field} form={form} setForm={setForm} />)}</View>
            {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
            <SubmitButton submitting={submitting} onPress={() => void verify()} label={isNotConductedMeeting(selected) ? 'Verify Visit' : 'Verify Meeting'} />
          </View> : null}
      </ScrollView>
      </>}
    </View></View></Modal>
    <Modal transparent visible={Boolean(historyLead)} animationType="fade" onRequestClose={() => setHistoryLead(null)}><View style={styles.backdrop}><View nativeID="blueant-workflow-modal" style={styles.modal}>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>LEAD HISTORY</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{historyLead?.clientName ?? 'Lead details'}</Text></View><Pressable onPress={() => setHistoryLead(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>{historyLead ? <LeadHistoryContent lead={historyLead} meetings={historyMeetings} loading={historyLoading} progress={historyLoadingProgress} error={historyError} /> : null}</ScrollView>
    </View></View></Modal>
  </View>;
}

/* ───────────────────────── Small components ───────────────────────── */

const verificationPopupCss = `
#blueant-verification-popup { box-sizing: border-box; }
#blueant-verification-fields select {
  appearance: none !important; -webkit-appearance: none !important;
  width: 100%; min-width: 0; height: 40px !important; min-height: 40px !important;
  border: 1px solid #D5E1F1 !important; border-radius: 9px !important;
  padding: 0 32px 0 10px !important; background-color: #FFFFFF;
  color: #1E3353; font-size: 12px !important; line-height: normal;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23647793' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 9px center;
  cursor: pointer; transition: border-color .15s, box-shadow .15s;
}
#blueant-verification-fields select:hover { border-color: #9DB7E4 !important; }
#blueant-verification-fields select:focus-visible,
#blueant-verification-fields input:focus-visible {
  outline: 2px solid #2563EB; outline-offset: 1px;
  border-color: #2563EB !important;
}
#blueant-verification-fields select:disabled { background-color: #EFF3F8; color: #8693A8; cursor: not-allowed; }
#blueant-verification-fields input { min-width: 0; height: 40px !important; box-sizing: border-box; }
`;

function LeadVerificationPopup({ meeting, form, setForm, submitError, submitting, onSubmit, onClose }: {
  meeting: MeetingResponse; form: VerificationForm; setForm: React.Dispatch<React.SetStateAction<VerificationForm>>;
  submitError: string | null; submitting: boolean; onSubmit: () => void; onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const stacked = width < 960 || height < 650;
  const Container = stacked ? ScrollView : View;
  const visitOnly = isNotConductedMeeting(meeting);
  return <Container nativeID="blueant-verification-popup" style={stacked ? popupStyles.scroll : popupStyles.layout} {...(stacked ? { contentContainerStyle: [popupStyles.layout, popupStyles.stacked], keyboardShouldPersistTaps: 'handled' as const } : {})}>
    {Platform.OS === 'web' ? createElement('style', null, verificationPopupCss) : null}
    <View style={[popupStyles.sidebar, stacked && popupStyles.sidebarStacked]}>
      <View style={popupStyles.status}><View style={popupStyles.statusDot} /><Text style={popupStyles.statusText}>PENDING VERIFICATION</Text></View>
      <Text style={popupStyles.clientName}>{meeting.clientName ?? meeting.meetingCode}</Text>
      <Details meeting={meeting} visitOnly={visitOnly} presentation="sidebar" />
    </View>
    <View style={popupStyles.main}>
      <View style={popupStyles.heading}>
        <View style={popupStyles.headingIcon}><Icon source="calendar-check-outline" size={28} color="#2563EB" /></View>
        <View style={popupStyles.headingCopy}><Text style={popupStyles.title}>Meeting Details</Text></View>
        <Pressable accessibilityLabel="Close meeting verification" onPress={onClose} style={popupStyles.close}><Icon source="close" size={23} color="#23416A" /></Pressable>
      </View>
      <View style={popupStyles.mainBody}>
        <Details meeting={meeting} visitOnly={visitOnly} presentation="summary" />
        <View style={popupStyles.formCard}>
          <View style={popupStyles.formHeading}><Icon source="file-document-outline" size={20} color="#2563EB" /><Text style={popupStyles.formTitle}>{visitOnly ? 'Verify Location Visit' : 'PC Additional Information'}</Text></View>
          {visitOnly ? <Text style={styles.help}>Confirm only the date and time of this visited-but-not-met record.</Text> : null}
          <View nativeID="blueant-verification-fields" style={[styles.formGrid, popupStyles.formGrid]}>{(visitOnly ? NOT_CONDUCTED_FIELDS : FIELDS).map((field) => <VerificationFormField key={field.key} field={field} form={form} setForm={setForm} layoutStyle={popupStyles.formField} />)}</View>
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        </View>
        <View style={popupStyles.footer}>
          <View style={popupStyles.submitWrap}><SubmitButton submitting={submitting} onPress={onSubmit} label={visitOnly ? 'Verify Visit' : 'Verify Meeting'} blue /></View>
        </View>
      </View>
    </View>
  </Container>;
}

function SubmitButton({ submitting, onPress, label, blue = false }: { submitting: boolean; onPress: () => void; label: string; blue?: boolean }) {
  return <Pressable disabled={submitting} onPress={onPress} style={[styles.submit, blue && popupStyles.submit, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Icon source="check-decagram-outline" size={20} color="#fff" />}<Text style={styles.submitText}>{submitting ? 'Verifying...' : label}</Text></Pressable>;
}
function AutoRefreshBadge({ tab, refreshing, submitting, nextRefreshAt, nextVerifiedRefreshAt, nextTaskRefreshAt, nextAssignedLeadsRefreshAt }: { tab: Tab; refreshing: boolean; submitting: boolean; nextRefreshAt: MutableRefObject<number>; nextVerifiedRefreshAt: MutableRefObject<number>; nextTaskRefreshAt: MutableRefObject<number>; nextAssignedLeadsRefreshAt: MutableRefObject<number> }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () => {
      const next = tab === 'today' ? nextRefreshAt.current : tab === 'responses' ? nextVerifiedRefreshAt.current : tab === 'tasks' ? nextTaskRefreshAt.current : tab === 'assignedLeads' ? nextAssignedLeadsRefreshAt.current : null;
      setSeconds(next === null ? null : Math.max(0, Math.ceil((next - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [nextAssignedLeadsRefreshAt, nextRefreshAt, nextTaskRefreshAt, nextVerifiedRefreshAt, tab]);
  const label = seconds === null ? 'Ready' : seconds >= 3600 ? `${Math.ceil(seconds / 3600)}h` : seconds >= 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
  return <View style={styles.autoRefreshBadge}><View style={styles.autoRefreshDot} /><Text style={styles.autoRefreshLabel}>{refreshing ? 'Syncing' : submitting ? 'Paused' : tab === 'assign' ? 'Ready' : 'Auto-refresh'}</Text><View style={styles.countdownBadge}>{refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.countdownText}>{label}</Text>}</View></View>;
}
function Pagination({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE + 1;
  const end = Math.min(total, (safePage + 1) * PAGE_SIZE);
  return <View style={styles.pagination}><Text style={styles.paginationText}>Showing {start}–{end} of {total}</Text><View style={styles.paginationControls}><Pressable disabled={safePage === 0} onPress={() => onPageChange(safePage - 1)} style={[styles.paginationButton, safePage === 0 && styles.disabled]}><Text style={styles.paginationButtonText}>Previous</Text></Pressable><Text style={styles.paginationText}>Page {safePage + 1} of {totalPages}</Text><Pressable disabled={safePage === totalPages - 1} onPress={() => onPageChange(safePage + 1)} style={[styles.paginationButton, safePage === totalPages - 1 && styles.disabled]}><Text style={styles.paginationButtonText}>Next</Text></Pressable></View></View>;
}
function Metric({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'blue' | 'orange' }) {
  const toneStyle = tone === 'orange' ? styles.metricOrange : styles.metricBlue;
  const accentStyle = tone === 'orange' ? styles.metricAccentOrange : styles.metricAccentBlue;
  const color = tone === 'orange' ? '#D97706' : '#3156C8';
  return <View style={[styles.metric, accentStyle]}><View style={[styles.metricIcon, toneStyle]}><Icon source={icon} size={15} color={color} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>;
}
function TaskToolbar({ search, onSearch, status, onStatus }: { search: string; onSearch: (value: string) => void; status: 'ALL' | 'TODAY' | 'PENDING'; onStatus: (value: 'ALL' | 'TODAY' | 'PENDING') => void }) {
  return <View style={[styles.taskToolbar, styles.taskToolbarHeader]}><TextInput value={search} onChangeText={onSearch} placeholder="Search lead name or number" placeholderTextColor="#94A3B8" style={styles.filterInput} /><View style={styles.chips}>{(['ALL', 'TODAY', 'PENDING'] as const).map((value) => <Pressable key={value} onPress={() => onStatus(value)} style={[styles.chip, status === value && styles.chipActive]}><Text style={[styles.chipText, status === value && styles.chipTextActive]}>{value === 'ALL' ? 'ALL TASKS' : `${value} TASKS`}</Text></Pressable>)}</View></View>;
}
function State({ message, loading = false, progress = 10 }: { message: string; loading?: boolean; progress?: number }) {
  return <View style={styles.state}>
    {loading ? <LoadingProgressBar progress={progress} /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}
    <Text style={styles.stateText}>{message}</Text>
  </View>;
}
function LoadingProgressBar({ progress }: { progress: number }) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    const animation = Animated.timing(animatedProgress, { toValue: progress, duration: 240, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [animatedProgress, progress]);
  const width = animatedProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return <View style={styles.loadingProgressWrap}><View style={styles.loadingProgressTrack}><Animated.View style={[styles.loadingProgressFill, { width }]} /></View><Text style={styles.loadingProgressValue}>{progress}%</Text></View>;
}

/* ───────────────────────── Calendars ───────────────────────── */

function InlineCalendar({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const empty = Array.from({ length: (month.getDay() + 6) % 7 });
  const iso = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <View style={styles.inlineCalendar}><View style={styles.calendarHeader}><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><Icon source="chevron-left" size={18} color="#3156C8" /></Pressable><Text style={styles.calendarMonth}>{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><Icon source="chevron-right" size={18} color="#3156C8" /></Pressable></View><View style={styles.calendarGrid}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Text key={`${day}${index}`} style={styles.calendarWeekday}>{day}</Text>)}{empty.map((_, index) => <View key={`empty${index}`} style={styles.calendarDay} />)}{days.map((day) => <Pressable key={day} onPress={() => onSelect(iso(day))} style={[styles.calendarDay, value === iso(day) && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, value === iso(day) && styles.calendarDayTextSelected]}>{day}</Text></Pressable>)}</View></View>;
}
function CompactAssignmentCalendar({ visible, value, maxDate, onDismiss, onSelect }: { visible: boolean; value: string; maxDate?: string; onDismiss: () => void; onSelect: (value: string) => void }) {
  const selected = value ? new Date(`${value}T12:00:00`) : new Date();
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => { if (visible) { const next = value ? new Date(`${value}T12:00:00`) : new Date(); setCursor(new Date(next.getFullYear(), next.getMonth(), 1)); } }, [value, visible]);
  const firstDay = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + days }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}><View style={styles.dateBackdrop}><View style={styles.datePopover}>
    <View style={styles.datePopoverHeader}>
      <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={styles.dateNav}><Icon source="chevron-left" size={19} color="#3156C8" /></Pressable>
      <Text style={styles.datePopoverTitle}>{cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Text>
      <View style={styles.datePopoverActions}><Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={styles.dateNav}><Icon source="chevron-right" size={19} color="#3156C8" /></Pressable><Pressable accessibilityLabel="Close calendar" onPress={onDismiss} style={styles.dateClose}><Icon source="close" size={17} color="#64748B" /></Pressable></View>
    </View>
    <View style={styles.dateWeekRow}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <Text key={day} style={styles.dateWeekday}>{day}</Text>)}</View>
    <View style={styles.dateGrid}>{cells.map((day, index) => {
      if (day === null) return <View key={`blank-${index}`} style={styles.dateCell} />;
      const date = calendarDate(new Date(cursor.getFullYear(), cursor.getMonth(), day));
      const disabled = Boolean(maxDate && date > maxDate);
      return <Pressable key={day} disabled={disabled} onPress={() => { onSelect(date); onDismiss(); }} style={({ pressed }) => [styles.dateCell, value === date && styles.dateCellSelected, disabled && styles.dateCellDisabled, pressed && !disabled && styles.pressed]}><Text style={[styles.dateCellText, value === date && styles.dateCellTextSelected, disabled && styles.dateCellTextDisabled]}>{day}</Text></Pressable>;
    })}</View>
  </View></View></Modal>;
}
function DatePickerField({ label, value, placeholder, maxDate, onSelect, style, tone, controlStyle }: { label: string; value: string; placeholder: string; maxDate?: string; onSelect: (value: string) => void; style?: object; tone?: object; controlStyle?: object }) {
  const [visible, setVisible] = useState(false);
  return <View style={[styles.field, tone, style]}><Text style={styles.fieldLabel}>{label}</Text><Pressable onPress={() => setVisible(true)} style={[styles.assignDatePicker, verificationStyles.control, controlStyle]}><Icon source="calendar-month-outline" size={18} color="#3156C8" /><Text style={styles.assignDatePickerText}>{value || placeholder}</Text><Icon source="chevron-down" size={18} color="#64748B" /></Pressable><CompactAssignmentCalendar visible={visible} value={value} maxDate={maxDate} onDismiss={() => setVisible(false)} onSelect={onSelect} /></View>;
}

/* ───────────────────────── Verification forms ───────────────────────── */

function ClientVerificationFields({ meeting, form, setForm, submitError, submitting, onSubmit }: { meeting: MeetingResponse; form: ClientVerificationForm; setForm: React.Dispatch<React.SetStateAction<ClientVerificationForm>>; submitError: string | null; submitting: boolean; onSubmit: () => void }) {
  const { isDark } = useAppTheme();
  const notConducted = isNotConductedMeeting(meeting);
  const pickerOptionColor = isDark ? '#FFFFFF' : '#000000';
  const amountError = Boolean(submitError?.startsWith('Enter a valid amount'));
  const update = <K extends keyof ClientVerificationForm>(key: K, value: ClientVerificationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const dateField = (label: string, key: 'newMeetingDate' | 'meetingDate') => <DatePickerField key={key} label={label} value={form[key]} placeholder="Choose date" maxDate={localToday()} onSelect={(value) => update(key, value)} style={verificationStyles.field} />;
  const remarksField = <View style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>Remarks</Text><TextInput value={form.remarks} onChangeText={(value) => update('remarks', value)} placeholder="Verification remarks" placeholderTextColor="#94A3B8" multiline style={[styles.input, verificationStyles.input, verificationStyles.textarea]} /></View>;
  const select = (label: string, key: 'aloneWith' | 'businessGenerated' | 'blueantAppUsed' | 'position', options: readonly string[]) => <View key={key} style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>{label}</Text><View style={[styles.pickerShell, verificationStyles.control]}><Picker enabled={!(key === 'blueantAppUsed' && form.blueantAppLocked)} selectedValue={form[key]} onValueChange={(value) => { const next = String(value); if (key === 'aloneWith' && next === 'SELF') setForm((current) => ({ ...current, aloneWith: next, personName: '', position: '' })); else if (key === 'businessGenerated' && next !== 'YES') setForm((current) => ({ ...current, businessGenerated: next, businessItems: [] })); else update(key, next); }} style={[styles.picker, verificationStyles.control]}><Picker.Item label={`Select ${label.toLowerCase()}`} value="" color={pickerOptionColor} />{options.map((option) => <Picker.Item key={option} label={option === 'SOMEONE' ? 'Someone' : option === 'SELF' ? 'Alone' : option === 'SUPER_ADMIN' ? 'Super Admin' : option === 'TL' ? 'Team Leader' : option === 'SM' ? 'Sales Manager' : option} value={option} color={pickerOptionColor} />)}</Picker></View></View>;
  const toggleBusinessItem = (businessType: ClientBusinessType) => setForm((current) => ({
    ...current,
    businessItems: current.businessItems.some((item) => item.businessType === businessType)
      ? current.businessItems.filter((item) => item.businessType !== businessType)
      : [...current.businessItems, { businessType, amount: '' }],
  }));
  const updateBusinessAmount = (businessType: ClientBusinessType, amount: string) => setForm((current) => ({
    ...current,
    businessItems: current.businessItems.map((item) => item.businessType === businessType ? { ...item, amount } : item),
  }));
  const selectedBusinessDetails = () => <View style={verificationStyles.investmentDetailsGrid}>{form.businessItems.map((item) => {
    const definition = clientBusinessDefinition(item.businessType);
    const invalid = amountError && (definition.requiresAmount || item.amount.trim()) && !isValidAmount(item.amount);
    return <View key={item.businessType} style={verificationStyles.investmentDetailCard}><View style={verificationStyles.investmentDetailHeading}><View style={verificationStyles.investmentDetailIcon}><Icon source={definition.icon} size={14} color="#3156C8" /></View><View><Text style={verificationStyles.investmentDetailTitle}>{definition.label}</Text><Text style={verificationStyles.investmentDetailCaption}>{definition.requiresAmount ? 'Amount required — enter 0 if applicable.' : 'Amount optional — leave blank if it does not apply.'}</Text></View></View><View style={verificationStyles.investmentInputField}><Text style={styles.fieldLabel}>{definition.requiresAmount ? 'Amount *' : 'Amount (optional)'}</Text><TextInput value={item.amount} onChangeText={(amount) => updateBusinessAmount(item.businessType, amount)} placeholder="Enter amount" placeholderTextColor="#94A3B8" keyboardType="numeric" style={[styles.input, verificationStyles.input, invalid && verificationStyles.investmentInputInvalid]} />{invalid ? <Text style={verificationStyles.investmentInputError}>Enter 0 or a positive number.</Text> : null}</View></View>;
  })}</View>;
  const [selectedHour = ''] = form.meetingTime.split(':');
  const meetingTime = <View style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>Meeting Time</Text><View style={[styles.pickerShell, verificationStyles.control]}><Picker selectedValue={selectedHour} onValueChange={(hour) => update('meetingTime', hour ? `${hour}:00:00` : '')} style={[styles.picker, verificationStyles.control]}><Picker.Item label="Hour" value="" color={pickerOptionColor} />{HOURS.map((hour) => <Picker.Item key={hour} label={hour} value={hour} color={pickerOptionColor} />)}</Picker></View></View>;
  return <View style={[styles.formSection, verificationStyles.section]}>
    <Text style={styles.sectionTitle}>{notConducted ? 'Client Meeting Not Conducted' : 'Client PC Verification'}</Text>
    <Text style={styles.help}>{notConducted ? 'Confirm the meeting date, remarks and next follow-up plan.' : 'Complete the Client Meeting verification details.'}</Text>
    <View style={styles.formGrid}>
      {notConducted ? <>{dateField('Meeting Date', 'meetingDate')}{remarksField}</> : <>
        {dateField('Meeting Date', 'newMeetingDate')}{meetingTime}{select('BlueAnt App Used', 'blueantAppUsed', ['YES', 'NO'])}
        {select('Along With', 'aloneWith', ['SELF', 'SOMEONE'])}
        {form.aloneWith === 'SOMEONE' ? <><View style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>Person Name *</Text><TextInput value={form.personName} onChangeText={(value) => update('personName', value)} placeholder="Person name" placeholderTextColor="#94A3B8" style={[styles.input, verificationStyles.input]} /></View>{select('Person Designation *', 'position', CLIENT_POSITION_OPTIONS)}</> : null}
        {select('Business/Service Request', 'businessGenerated', ['YES', 'NO'])}
        {form.businessGenerated === 'YES' ? <View style={verificationStyles.investmentPanel}><View style={verificationStyles.investmentPanelHeader}><View style={verificationStyles.investmentPanelIcon}><Icon source="chart-box-outline" size={17} color="#3156C8" /></View><View style={verificationStyles.investmentPanelCopy}><Text style={verificationStyles.investmentPanelTitle}>Business Details</Text><Text style={verificationStyles.investmentPanelSubtitle}>Choose every applicable business category. Amount is required only for monetary categories.</Text></View></View><View style={verificationStyles.referenceTypes}>{CLIENT_BUSINESS_TYPES.map((definition) => { const chosen = form.businessItems.some((item) => item.businessType === definition.type); return <Pressable key={definition.type} onPress={() => toggleBusinessItem(definition.type)} style={[verificationStyles.referenceType, chosen && verificationStyles.referenceTypeSelected]}><Text style={[verificationStyles.referenceTypeText, chosen && verificationStyles.referenceTypeTextSelected]}>{definition.label}</Text></Pressable>; })}</View>{selectedBusinessDetails()}</View> : null}
        {remarksField}
      </>}
    </View>
    {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
    <SubmitButton submitting={submitting} onPress={onSubmit} label="Verify Client Meeting" />
  </View>;
}
function VerificationFormField({ field, form, setForm, layoutStyle }: { field: typeof FIELDS[number]; form: VerificationForm; setForm: React.Dispatch<React.SetStateAction<VerificationForm>>; layoutStyle?: object }) {
  const update = (value: string) => setForm((current) => ({
    ...current,
    [field.key]: value,
    ...(field.key === 'meetingWith' && value === 'SELF' ? { personName: '', position: '' } : {}),
  }));
  const tone = field.key === 'meetingTiming' || field.key === 'ageGroup' ? styles.fieldToneBlue : field.key === 'existingSip' || field.key === 'profession' ? styles.fieldToneTeal : field.key === 'professionDetail' || field.key === 'bestTimeForMeeting' ? styles.fieldToneViolet : styles.fieldToneAmber;

  if (!isVerificationFieldVisible(field.key, form.meetingWith)) return null;

  if (field.key === 'meetingDate') {
    return <DatePickerField label={field.label} value={form.meetingDate} placeholder={field.placeholder} maxDate={localToday()} onSelect={update} style={[verificationStyles.field, layoutStyle]} tone={tone} controlStyle={layoutStyle ? popupStyles.control : undefined} />;
  }
  if (field.key === 'meetingTiming') {
    const [selectedHour = ''] = form.meetingTiming.split(':');
    return (
      <View style={[styles.field, tone, verificationStyles.field, layoutStyle]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.timePickerRow}>
          <View style={[styles.timePicker, { minWidth: 0 }]}><VerificationDropdown label={field.label} value={selectedHour} onChange={(hour) => update(hour ? `${hour}:00:00` : '')} options={[{ label: 'Hour', value: '' }, ...HOURS.map((hour) => ({ label: hour, value: hour }))]} /></View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={[styles.secondsBox, verificationStyles.control, layoutStyle && popupStyles.control]}><Text style={styles.secondsValue}>00</Text></View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={[styles.secondsBox, verificationStyles.control, layoutStyle && popupStyles.control]}><Text style={styles.secondsValue}>00</Text></View>
        </View>
      </View>
    );
  }

  const options = field.key === 'existingSip' ? PRIOR_INVESTMENT_OPTIONS
    : field.key === 'bestTimeForMeeting' ? BEST_TIME_OPTIONS
    : field.key === 'ageGroup' ? AGE_GROUP_OPTIONS
    : field.key === 'profession' ? PROFESSION_OPTIONS
    : field.key === 'meetingWith' ? MEETING_WITH_OPTIONS
    : field.key === 'position' ? POSITION_OPTIONS
    : null;
  const optionLabel = (option: string) => field.key === 'ageGroup' ? AGE_GROUP_LABELS[option] : field.key === 'profession' ? PROFESSION_LABELS[option] : field.key === 'meetingWith' ? option === 'SELF' ? 'Self' : 'With someone' : option;
  if (options) {
    return (
      <View style={[styles.field, tone, verificationStyles.field, layoutStyle]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <VerificationDropdown label={field.label} value={form[field.key]} onChange={update} options={[{ label: 'Select an option', value: '' }, ...options.map((option) => ({ label: optionLabel(option), value: option }))]} />
      </View>
    );
  }
  return <View style={[styles.field, tone, verificationStyles.field, layoutStyle]}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput value={form[field.key]} onChangeText={update} placeholder={field.placeholder} style={[styles.input, verificationStyles.input, layoutStyle && popupStyles.control]} /></View>;
}

/* ───────────────────────── Table header with column filters ───────────────────────── */

function MeetingTableHeader({ verified = false, taskOnly = false, hideMeetingDate = false, records, filters, onFiltersChange }: { verified?: boolean; taskOnly?: boolean; hideMeetingDate?: boolean; records: readonly MeetingResponse[]; filters: MeetingColumnFilter; onFiltersChange: React.Dispatch<React.SetStateAction<MeetingColumnFilter>> }) {
  const [openFilter, setOpenFilter] = useState<keyof MeetingColumnFilter | null>(null);
  const [draftChoices, setDraftChoices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [dateTarget, setDateTarget] = useState<'from' | 'to' | null>(null);
  const columns = (taskOnly ? FILTER_COLUMNS.filter((column) => ['clientName', 'meetingTitle', 'employeeName', 'employeeRole', 'meetingDate'].includes(column.key)) : verified ? [...FILTER_COLUMNS, { key: 'verifiedBy' as const, label: 'VERIFIED BY' }] : FILTER_COLUMNS).filter((column) => !hideMeetingDate || column.key !== 'meetingDate');
  const dropdownKeys: (keyof MeetingColumnFilter)[] = taskOnly ? ['employeeName', 'employeeRole'] : verified
    ? ['employeeName', 'employeeRole', 'verifiedBy', 'meetingTitle', 'leadStatus', 'meetingDate']
    : ['employeeName', 'employeeRole', 'meetingTitle', 'leadStatus'];
  const optionsFor = (key: keyof MeetingColumnFilter) => {
    const values = [...new Set(records.map((record) => String(key === 'meetingTitle' ? record.meetingTitle ?? record.meetingType ?? '' : key === 'employeeRole' ? meetingRole(record) : record[key as keyof MeetingResponse] ?? '')).filter(Boolean))].sort();
    if (key !== 'employeeName') return values;
    return values.filter((name) => !values.some((other) => other !== name && other.toLowerCase().startsWith(`${name.toLowerCase()} `)));
  };
  const openChoices = (key: keyof MeetingColumnFilter) => {
    if (key === 'meetingDate' && verified) { const [from = '', to = ''] = (filters[key] ?? '').replace('range:', '').split(','); setDateRange({ from, to }); }
    else setDraftChoices((filters[key] ?? '').split('|').filter(Boolean));
    setOpenFilter(key);
  };
  const dateFilterOpen = openFilter === 'meetingDate' && verified;
  return <>
    <View style={[styles.listHeader, styles.verifiedListHeader, styles.desktopRow]}>
      {columns.map((column, index) => <View key={column.key} style={[styles.headerColumn, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>
        {dropdownKeys.includes(column.key)
          ? <View style={styles.headerFilterWrap}><Pressable onPress={() => openChoices(column.key)} style={styles.headerFilterButton}><Text numberOfLines={1} style={[styles.headerFilterText, filters[column.key] && styles.columnLabelFiltered]}>{column.label}</Text><View style={[styles.headerFilterIcon, filters[column.key] && styles.headerFilterIconActive]}><Icon source="filter-variant" size={10} color={filters[column.key] ? '#FFFFFF' : '#536B9F'} /></View></Pressable></View>
          : <Text numberOfLines={1} style={styles.columnLabel}>{column.label}</Text>}
      </View>)}
      {taskOnly && (filters.employeeName || filters.employeeRole) ? <Pressable accessibilityLabel="Clear assignment filters" onPress={() => onFiltersChange((current) => ({ ...current, employeeName: '', employeeRole: '' }))} style={styles.taskFilterClear}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}
      {!taskOnly ? <Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}
    </View>
    {openFilter ? <Modal transparent visible animationType="fade" onRequestClose={() => setOpenFilter(null)}><Pressable style={styles.filterBackdrop} onPress={() => setOpenFilter(null)}><Pressable style={styles.filterPopover} onPress={() => undefined}>
      <View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>{dateFilterOpen ? 'MEETING DATE RANGE' : columns.find((column) => column.key === openFilter)?.label}</Text><Text style={styles.filterPopoverHint}>{dateFilterOpen ? 'Choose a start and end date' : 'Select one or more values'}</Text></View><Pressable onPress={() => setOpenFilter(null)}><Icon source="close" size={18} color="#64748B" /></Pressable></View>
      {dateFilterOpen
        ? <View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{dateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar value={dateRange[dateTarget]} onSelect={(value) => { setDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View>
        : <ScrollView style={styles.filterChoices}>{optionsFor(openFilter).map((option) => { const checked = draftChoices.includes(option); return <Pressable key={option} onPress={() => setDraftChoices((items) => checked ? items.filter((item) => item !== option) : [...items, option])} style={[styles.filterChoice, checked && styles.filterChoiceSelected]}><View style={[styles.filterCheckbox, checked && styles.filterCheckboxSelected]}>{checked ? <Icon source="check" size={13} color="#FFFFFF" /> : null}</View><Text style={[styles.filterChoiceText, checked && styles.filterChoiceTextSelected]}>{option.replace(/_/g, ' ')}</Text></Pressable>; })}</ScrollView>}
      <View style={styles.filterActions}>
        <Pressable onPress={() => dateFilterOpen ? setDateRange({ from: '', to: '' }) : setDraftChoices([])} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable>
        <Pressable onPress={() => { onFiltersChange((current) => ({ ...current, [openFilter]: dateFilterOpen ? (dateRange.from || dateRange.to ? `range:${dateRange.from},${dateRange.to}` : '') : draftChoices.join('|') })); setOpenFilter(null); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable>
      </View>
    </Pressable></Pressable></Modal> : null}
  </>;
}

/* ───────────────────────── Meeting list & details ───────────────────────── */

function Cards({ items, empty, action, onOpen, verified = false, taskOnly = false, hideMeetingDate = false }: { items: readonly MeetingResponse[]; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean; taskOnly?: boolean; hideMeetingDate?: boolean }) {
  const compact = useWindowDimensions().width < 760;
  if (!items.length) return <State message={empty} />;
  if (compact) return <View style={styles.list}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.mobileRow, i % 2 === 1 && styles.listRowAlternate]}><View style={styles.personCell}><View style={styles.cellCopy}><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(maskedMobile(m.mobileNumber))}</Text></View></View><View style={styles.mobileMeeting}><Text style={styles.cellMain}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.cellSub}>{show(m.meetingDate)} · {show(m.nextMeetingDate)}{verified ? ` · Verified by ${show(m.verifiedBy)}` : ''}</Text></View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.mobileAction}><Icon source="chevron-right" size={16} color="#3156C8" /></Pressable> : null}</View>)}</View>;
  const columns = (taskOnly ? [
    ['MEETING TYPE', (m: MeetingResponse) => m.meetingTitle ?? m.meetingType],
    ['ASSIGNED TO', (m: MeetingResponse) => m.employeeName],
    ['ROLE', (m: MeetingResponse) => meetingRole(m)],
    ['MEETING DATE', (m: MeetingResponse) => m.meetingDate],
  ] : [
    ['MEETING TYPE', (m: MeetingResponse) => m.meetingTitle ?? m.meetingType],
    ['ASSIGNED TO', (m: MeetingResponse) => m.employeeName],
    ['ROLE', (m: MeetingResponse) => meetingRole(m)],
    ['LEAD STATUS', (m: MeetingResponse) => m.leadStatus],
    ['MEETING DATE', (m: MeetingResponse) => m.meetingDate],
    ['NEXT PLAN DATE', (m: MeetingResponse) => m.nextMeetingDate],
    ['JOINED', (m: MeetingResponse) => m.aloneWith],
    ...(verified ? [['VERIFIED BY', (m: MeetingResponse) => m.verifiedBy] as const] : []),
  ]).filter(([label]) => !hideMeetingDate || label !== 'MEETING DATE') as unknown as readonly [string, (m: MeetingResponse) => unknown][];
  return <View style={styles.desktopTable}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.listRow, styles.desktopRow, i % 2 === 1 && styles.listRowAlternate]}>
    <View style={[styles.personCell, styles.fluidColumn, styles.clientColumn]}><View style={styles.cellCopy}><Text numberOfLines={1} style={styles.client}>{show(m.clientName)}</Text></View></View>
    {columns.map(([label, value]) => <View key={label} style={[styles.cell, styles.fluidColumn, label === 'LEAD STATUS' && styles.leadStatusColumn]}><Text numberOfLines={1} style={[styles.cellMain, label === 'LEAD STATUS' && styles.status, label === 'LEAD STATUS' && styles.leadStatusValue, label === 'LEAD STATUS' && m.leadStatus === 'CONVERTED_CLIENT' && styles.statusVerified, label === 'JOINED' && styles.joinedBadge, label === 'ROLE' && styles.roleBadge, label === 'ROLE' && meetingRole(m) === 'RM' && styles.roleBadgeRm, label === 'ROLE' && meetingRole(m) === 'SC' && styles.roleBadgeSc]}>{label === 'LEAD STATUS' ? show(value(m)).replace(/_/g, ' ') : show(value(m))}</Text></View>)}
    {onOpen ? <Pressable onPress={() => onOpen(m)} style={({ pressed }) => [styles.rowAction, styles.desktopActionColumn, pressed && styles.rowActionPressed]}><Text numberOfLines={1} style={styles.rowActionText}>{action}</Text><Icon source="chevron-right" size={13} color="#3156C8" /></Pressable> : taskOnly ? null : <View style={styles.desktopActionColumn} />}
  </View>)}</View>;
}
function Details({ meeting: m, visitOnly = false, presentation }: { meeting: MeetingResponse; visitOnly?: boolean; presentation?: 'sidebar' | 'summary' }) {
  const meetingPlace = m.meetingLocation ?? m.location ?? m.address;
  const mapUrl = mapUrlFor(m);
  const overviewFields: [string, unknown][] = [['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Next Plan Date', m.nextMeetingDate]];
  if (!visitOnly) overviewFields.push(['Lead Status', m.leadStatus?.replace(/_/g, ' ')]);
  const employeeLabels = employeeRoleLabels(m);
  const clientDetails = m.isClientMeeting && (m.clinicAddress || m.speciality) ? [m.speciality, m.clinicAddress].filter(Boolean).join(' · ') : '';
  const contactFields: [string, unknown][] = [['Mobile Number', maskedMobile(m.mobileNumber)]];
  if (m.isClientMeeting) contactFields.push(['Alternate Mobile', maskedMobile(m.alternateMobileNumber)], ['Email', m.email]);
  contactFields.push([employeeLabels.person, m.employeeName], [employeeLabels.id, m.employeeCode]);
  if (m.meetingCode || m.id) contactFields.push(['Meeting ID', m.meetingCode ?? m.id]);
  if (!visitOnly) {
    contactFields.push(['Joined With', m.aloneWith]);
    if (clientDetails) contactFields.push(['Client Details', clientDetails]);
  }
  if (presentation === 'summary') return <View style={popupStyles.summaryGrid}>{overviewFields.map(([label, field], index) => <View key={label} style={[popupStyles.summaryCard, index === 3 && popupStyles.summaryStatus]}><Icon source={index === 3 ? 'chart-timeline-variant' : 'calendar-outline'} size={20} color="#2563EB" /><View style={popupStyles.summaryCopy}><Text style={popupStyles.label}>{label}</Text><Text numberOfLines={index === 3 ? 1 : undefined} adjustsFontSizeToFit={index === 3} minimumFontScale={0.8} style={[popupStyles.value, index === 3 && popupStyles.statusValue]}>{show(field)}</Text></View></View>)}</View>;
  if (presentation === 'sidebar') return <View style={popupStyles.sidebarCards}>
    <View style={popupStyles.infoCard}><View style={popupStyles.formHeading}><Icon source="account-box-outline" size={20} color="#2563EB" /><Text style={popupStyles.cardTitle}>Client Information</Text></View>
      {contactFields.map(([label, field]) => <View key={label} style={popupStyles.contactRow}><Text style={popupStyles.contactLabel}>{label}</Text><Text style={popupStyles.contactValue}>{show(field)}</Text></View>)}
    </View>
    {(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks) ? <View style={popupStyles.remarks}><View style={popupStyles.formHeading}><Icon source="comment-text-outline" size={18} color="#A16207" /><Text style={popupStyles.cardTitle}>Remarks</Text></View><Text style={popupStyles.bodyText}>{show(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks)}</Text></View> : null}
    {meetingPlace || mapUrl ? <View style={popupStyles.locationCard}>
      {meetingPlace ? <><View style={popupStyles.formHeading}><Icon source="map-marker-outline" size={20} color="#2563EB" /><Text style={popupStyles.cardTitle}>{m.isClientMeeting ? 'Client Location' : 'Meeting Location'}</Text></View><Text style={popupStyles.bodyText}>{show(meetingPlace)}</Text></> : null}
      {mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={popupStyles.mapButton}><Icon source="google-maps" size={18} color="#2563EB" /><Text style={popupStyles.mapText}>Open in Google Maps</Text></Pressable> : null}
    </View> : null}
  </View>;
  return <View style={styles.detailsWrap}>
    <View style={styles.overviewGrid}>{overviewFields.map(([label, field], index) => <View key={label} style={[styles.overviewCard, [styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.overviewStatusCard][index]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={[styles.overviewValue, index === 3 && styles.overviewStatusText]}>{show(field)}</Text></View>)}</View>
    <View style={styles.contactGrid}>{contactFields.map(([label, field], index) => <View key={label} style={[styles.contactCard, label === 'Joined With' && styles.contactCardCompact, label === 'Client Details' && styles.clientDetailsContactCard, [styles.toneSlate, styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.toneAmber][index % 5]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={label === 'Client Details' ? undefined : 1} style={styles.detailValue}>{show(field)}</Text></View>)}</View>
    <View style={styles.contextGrid}>
      {(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks) ? <View style={[styles.contextCard, styles.remarksCard, styles.remarksWide]}><View style={styles.contextHeading}><Icon source="comment-text-outline" size={15} color="#A16207" /><Text style={styles.contextLabel}>REMARKS</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks)}</Text></View> : null}
      {meetingPlace ? <View style={[styles.contextCard, styles.locationCard, styles.locationNarrow]}><View style={styles.contextHeading}><Icon source="map-marker-outline" size={15} color="#0F766E" /><Text style={styles.contextLabel}>{m.isClientMeeting ? 'CLIENT LOCATION' : 'MEETING LOCATION'}</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(meetingPlace)}</Text></View> : null}
      {mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={[styles.mapButton, styles.mapButtonCompact]}><Icon source="map-marker-radius" size={17} color="#FFFFFF" /><Text style={styles.mapButtonText}>Open in Google Maps</Text></Pressable> : null}
    </View>
  </View>;
}
function DetailGrid({ fields }: { fields: readonly (readonly [string, unknown])[] }) {
  return <View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View>;
}
function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) {
  const fields = [['Verified By', m.verifiedBy], ['Verification Date', m.meetingVerificationDate], ...FIELDS.map((field) => [field.label, m[field.key]] as const)] as const;
  return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><DetailGrid fields={fields} /></View>;
}
function ClientVerificationDetails({ meeting: m }: { meeting: MeetingResponse }) {
  const fields = ([['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['BlueAnt App Used', m.blueantAppUsed], ['Along With', m.aloneWith], ['Person Name', m.personName], ['Person Designation', m.position], ['Business/Service Request', m.businessGenerated], ['Investment Types', m.businessTypes?.join(', ') ?? m.investmentType], ['Total Investment Amount', m.investmentAmount], ['Remarks by PC', m.verificationRemarks ?? m.remarks]] as const).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return <View style={styles.formSection}><Text style={styles.sectionTitle}>Client PC Verification Response</Text><DetailGrid fields={fields} /></View>;
}

/* ───────────────────────── Assign lead ───────────────────────── */

function AssignLeadForm({ compact, form, setForm, assigning, message, salesPersonNamesByCode, onSubmit }: { compact: boolean; form: ReturnType<typeof emptyAssignForm>; setForm: (updater: (current: ReturnType<typeof emptyAssignForm>) => ReturnType<typeof emptyAssignForm>) => void; assigning: boolean; message: { type: 'success' | 'error'; text: string } | null; salesPersonNamesByCode: ReadonlyMap<string, string>; onSubmit: () => void }) {
  const { isDark } = useAppTheme();
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const buttonColor = isDark && Platform.OS === 'web' ? '#000000' : '#FFFFFF';
  const fields = [['clientName', 'Client Name', 'e.g. Dr. Rajesh Kumar'], ['mobileNumber', 'Mobile Number', '10-digit mobile number'], ['location', 'Location', 'City or area'], ['clinicAddress', 'Clinic Address', 'Complete clinic address'], ['speciality', 'Speciality', 'e.g. Cardiologist'], ['bestTimeForMeeting', 'Best Time to Meet', 'Select best time'], ['salesPersonEmployeeCode', 'Employee Code', 'e.g. EMP000011']] as const;
  return <View style={styles.assignWrap}>
    <View style={styles.assignIntro}><View style={styles.assignIntroIcon}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View><Text style={styles.assignIntroTitle}>Lead information</Text><Text style={styles.assignIntroText}>Enter the client details, meeting preference, assignment date and employee code.</Text></View></View>
    <View style={styles.assignGrid}>
      {fields.map(([key, label, placeholder]) => <View key={key} style={[styles.assignField, key === 'salesPersonEmployeeCode' && styles.assignEmployeeField, compact && styles.assignFieldCompact]}>
        <Text style={styles.assignLabel}>{label}</Text>
        {key === 'salesPersonEmployeeCode'
          ? <View style={styles.assignPickerShell}><Picker selectedValue={form.salesPersonEmployeeCode} onValueChange={(value) => setForm((current) => ({ ...current, salesPersonEmployeeCode: String(value) }))} style={styles.assignPicker}><Picker.Item label="Select employee code" value="" />{SALES_PERSON_CODES.map((code) => <Picker.Item key={code} label={`${code}${salesPersonNamesByCode.get(code) ? ` - ${salesPersonNamesByCode.get(code)}` : ''}`} value={code} />)}</Picker></View>
          : key === 'bestTimeForMeeting'
            ? <View style={styles.assignPickerShell}><Picker selectedValue={form.bestTimeForMeeting} onValueChange={(value) => setForm((current) => ({ ...current, bestTimeForMeeting: String(value) }))} style={styles.assignPicker}><Picker.Item label={placeholder} value="" /><Picker.Item label="9:00 AM - 12:00 PM" value="NINE_TO_TWELVE" /><Picker.Item label="12:00 PM - 3:00 PM" value="TWELVE_TO_THREE" /><Picker.Item label="3:00 PM - 6:00 PM" value="THREE_TO_SIX" /><Picker.Item label="6:00 PM - 9:00 PM" value="SIX_TO_NINE" /></Picker></View>
            : <TextInput value={form[key]} onChangeText={(text) => setForm((current) => ({ ...current, [key]: key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : text }))} placeholder={placeholder} placeholderTextColor="#A1A9B7" autoCapitalize="sentences" keyboardType={key === 'mobileNumber' ? 'phone-pad' : 'default'} style={styles.assignInput} />}
      </View>)}
      <View style={[styles.assignField, styles.assignDateField, compact && styles.assignFieldCompact]}><Text style={styles.assignLabel}>Assigned Date</Text><Pressable onPress={() => setDatePickerVisible(true)} style={styles.assignDatePicker}><Icon source="calendar-month-outline" size={18} color="#3156C8" /><Text style={styles.assignDatePickerText}>{form.assignedAt || 'Choose assigned date'}</Text><Icon source="chevron-down" size={18} color="#64748B" /></Pressable></View>
      <View style={[styles.assignActionField, compact && styles.assignFieldCompact]}><Pressable disabled={assigning} onPress={onSubmit} style={({ pressed }) => [styles.assignButton, assigning && styles.disabled, pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color={buttonColor} /> : <Icon source="account-check-outline" size={18} color={buttonColor} />}<Text style={[styles.assignButtonText, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View>
    </View>
    {message ? <View style={[styles.assignFeedback, message.type === 'success' ? styles.assignSuccess : styles.assignError]}><Icon source={message.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={message.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.assignFeedbackText, message.type === 'error' && styles.assignErrorText]}>{message.text}</Text></View> : null}
    <CompactAssignmentCalendar visible={datePickerVisible} value={form.assignedAt} onDismiss={() => setDatePickerVisible(false)} onSelect={(assignedAt) => setForm((current) => ({ ...current, assignedAt }))} />
  </View>;
}

/* ───────────────────────── Assigned leads ───────────────────────── */

function HeaderLeadFilters({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter, dateRange, setDateRange, search, setSearch }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void; dateRange: AssignedDateRange; setDateRange: (value: AssignedDateRange) => void; search: string; setSearch: (value: string) => void }) {
  const compact = useWindowDimensions().width < 760;
  const { isDark } = useAppTheme();
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState<AssignedDateRange>(dateRange);
  const [dateTarget, setDateTarget] = useState<'from' | 'to' | null>(null);
  const coordinators = [...new Set(leads.map((lead) => lead.assignedByEmployeeName).filter(Boolean))] as string[];
  const salesPeople = [...new Set(leads
    .filter((lead) => (!coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter) && belongsToCoordinatorTeam(coordinatorFilter, lead.assignedEmployeeName))
    .map((lead) => lead.assignedEmployeeName)
    .filter(Boolean))] as string[];
  const rangeLabel = dateRange.from || dateRange.to ? `${dateRange.from || '...'} to ${dateRange.to || '...'}` : 'All assigned dates';
  const openDateRange = () => { setDraftDateRange(dateRange); setDateTarget(null); setDatePickerVisible(true); };
  return <>
    <View style={[styles.headerLeadFilters, compact && styles.headerLeadFiltersCompact]}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} />
      <View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Pressable onPress={openDateRange} style={[styles.headerLeadDatePicker, compact && styles.headerLeadPickerCompact]}><Icon source="calendar-month-outline" size={15} color="#BFD1FF" /><Text numberOfLines={1} style={styles.headerLeadDateText}>{rangeLabel}</Text>{dateRange.from || dateRange.to ? <Pressable accessibilityLabel="Clear assigned date range" hitSlop={8} onPress={() => setDateRange({ from: '', to: '' })}><Icon source="close-circle" size={15} color="#BFD1FF" /></Pressable> : <Icon source="chevron-down" size={15} color="#BFD1FF" />}</Pressable></View>
      <View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Icon source="account-tie-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker selectedValue={coordinatorFilter} onValueChange={(value) => { setCoordinatorFilter(String(value)); setSalesPersonFilter(''); }} style={[styles.headerLeadPickerControl, isDark && styles.headerLeadPickerControlDark]}><Picker.Item label="All Coordinators" value="" />{coordinators.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View>
      <View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact, !coordinatorFilter && styles.headerLeadPickerDisabled, isDark && !coordinatorFilter && styles.headerLeadPickerDisabledDark]}><Icon source="account-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker enabled={Boolean(coordinatorFilter)} selectedValue={salesPersonFilter} onValueChange={(value) => setSalesPersonFilter(String(value))} style={[styles.headerLeadPickerControl, isDark && styles.headerLeadPickerControlDark]}><Picker.Item label={coordinatorFilter ? 'All Sales Persons' : 'Choose salesperson'} value="" />{salesPeople.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View>
    </View>
    <Modal transparent visible={datePickerVisible} animationType="fade" onRequestClose={() => setDatePickerVisible(false)}><Pressable style={styles.filterBackdrop} onPress={() => setDatePickerVisible(false)}><Pressable style={styles.filterPopover} onPress={() => undefined}>
      <View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>ASSIGNED DATE RANGE</Text><Text style={styles.filterPopoverHint}>Choose a start and end date</Text></View><Pressable onPress={() => setDatePickerVisible(false)}><Icon source="close" size={18} color="#64748B" /></Pressable></View>
      <View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{draftDateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar key={`${dateTarget}-${draftDateRange[dateTarget]}`} value={draftDateRange[dateTarget]} onSelect={(value) => { setDraftDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View>
      <View style={styles.filterActions}><Pressable onPress={() => { setDraftDateRange({ from: '', to: '' }); setDateTarget(null); }} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable><Pressable onPress={() => { setDateRange(draftDateRange); setDatePickerVisible(false); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable></View>
    </Pressable></Pressable></Modal>
  </>;
}
function AssignedLeadCards({ leads, onOpen }: { leads: LeadResponse[]; onOpen: (lead: LeadResponse) => void }) {
  const compact = useWindowDimensions().width < 760;
  const { isDark } = useAppTheme();
  const tones = [styles.leadToneBlue, styles.leadToneTeal, styles.leadToneViolet, styles.leadToneAmber];
  return <View style={[styles.assignedLeadWrap, compact && styles.assignedLeadWrapCompact]}><View style={[styles.assignedLeadGrid, compact && styles.assignedLeadGridCompact]}>{leads.length ? leads.map((lead) => <Pressable key={lead.leadId ?? lead.leadCode} onPress={() => onOpen(lead)} style={({ pressed }) => [styles.assignedLeadCard, compact && styles.assignedLeadCardCompact, tones[leadCardTone(lead)], pressed && styles.pressed]}>
    <View style={styles.assignedLeadTop}><View style={styles.assignedLeadCopy}><Text numberOfLines={1} style={[styles.assignedLeadName, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{show(lead.clientName)}</Text><Text style={styles.assignedLeadMeta}>{leadRole(lead)}</Text></View><View style={styles.leadStatusPill}><Text style={styles.leadStatusPillText}>{show(lead.leadStatus).replace(/_/g, ' ')}</Text></View></View>
    <View style={styles.assignedLeadDivider} />
    <View style={[styles.assignedLeadDetails, compact && styles.assignedLeadDetailsCompact]}><View><Text style={styles.assignLabel}>ASSIGNED TO</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedEmployeeName)}</Text></View><View><Text style={styles.assignLabel}>ASSIGNED DATE</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedAt)}</Text></View><View><Text style={styles.assignLabel}>LAST MEETING / VERIFIED</Text><Text style={styles.assignedLeadValue}>{show(lead.audit?.updatedAt)}</Text></View></View>
  </Pressable>) : <State message="No assigned leads match these filters." />}</View></View>;
}

/* ───────────────────────── Lead history ───────────────────────── */

function MeetingHistoryRow({ meeting, alternate }: { meeting: MeetingResponse; alternate: boolean }) {
  const status = String(meeting.meetingStatus ?? meeting.leadStatus ?? 'PENDING').replace(/_/g, ' ');
  const normalized = status.toUpperCase();
  const statusStyle = normalized.includes('COMPLETED') ? historyStyles.statusCompleted : normalized.includes('SCHEDULED') ? historyStyles.statusScheduled : historyStyles.statusPending;
  const completed = normalized.includes('COMPLETED') || normalized.includes('VERIFIED');
  const remark = completed ? meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion : null;
  const tags = [
    meeting.meetingTiming ? { key: 'time', icon: 'clock-outline', label: `Time: ${meeting.meetingTiming}`, style: historyStyles.tagTime, color: '#1D4ED8' } : null,
    meeting.meetingWith ? { key: 'join', icon: 'account-multiple-outline', label: `Joined: ${meeting.meetingWith.replace(/_/g, ' ')}`, style: historyStyles.tagJoin, color: '#0F766E' } : null,
    meeting.personName ? { key: 'person', icon: 'account-outline', label: `Person: ${meeting.personName}`, style: historyStyles.tagPerson, color: '#7C3AED' } : null,
    meeting.position ? { key: 'position', icon: 'briefcase-outline', label: `Position: ${meeting.position}`, style: historyStyles.tagPosition, color: '#9A3412' } : null,
  ].filter(Boolean) as { key: string; icon: string; label: string; style: object; color: string }[];
  return <View style={[historyStyles.meetingCard, alternate && historyStyles.meetingCardAlt]}>
    <View style={historyStyles.meetingCardTop}>
      <View style={historyStyles.meetingTitleBlock}><Text style={historyStyles.meetingTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={historyStyles.meetingDate}>{show(meeting.meetingDate)}</Text></View>
      <Text style={[historyStyles.meetingStatus, statusStyle]}>{status}</Text>
    </View>
    {tags.length ? <View style={historyStyles.meetingTagsRow}>{tags.map((tag) => <View key={tag.key} style={[historyStyles.meetingTag, tag.style]}><Icon source={tag.icon} size={11} color={tag.color} /><Text style={[historyStyles.meetingTagText, { color: tag.color }]}>{tag.label}</Text></View>)}</View> : null}
    {remark ? <View style={historyStyles.meetingRemarkBlock}><Text style={historyStyles.meetingRemarkLabel}>REMARKS</Text><Text style={historyStyles.meetingRemarkText}>{remark}</Text></View> : null}
  </View>;
}
function LiveLocationButton({ url }: { url: string | null | undefined }) {
  const { isDark } = useAppTheme();
  const sourceColor = isDark && Platform.OS === 'web' ? '#000000' : '#FFFFFF';
  return <Pressable disabled={!url} onPress={() => { if (url) void Linking.openURL(url); }} style={[historyStyles.liveLocationButton, !url && historyStyles.liveLocationDisabled]}><Icon source="map-marker-radius" size={16} color={sourceColor} /><Text style={[historyStyles.liveLocationText, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>Live location</Text></Pressable>;
}
function LeadHistoryContent({ lead, meetings, loading, progress, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; progress: number; error: string | null }) {
  const isDone = (m: MeetingResponse) => ['COMPLETED', 'VERIFIED'].includes(String(m.meetingStatus ?? m.verificationStatus ?? '').toUpperCase());
  const verifiedMeeting = meetings.find((m) => m.verificationStatus === 'VERIFIED' || Boolean(m.verifiedBy) || Boolean(m.meetingVerificationDate) || Boolean(m.ageGroup) || Boolean(m.profession));
  const latest = meetings.find((m) => isDone(m) && (m.remarks || m.meetingRemarks || m.discussion));
  const latestRemarks = latest?.remarks ?? latest?.meetingRemarks ?? latest?.discussion ?? lead.remarks;
  const liveLocationUrl = meetings.map(mapUrlFor).find(Boolean);
  const leadFields = prospectInfoFields(lead).map(({ label, value }) => [label, label === 'Mobile Number' || label === 'Alternate Mobile' ? maskedMobile(value) : value]);
  const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Sales coordinator', lead.assignedByEmployeeName], ['SC ID', lead.assignedByEmployeeCode], ['Assigned date', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting], ['Meeting date', verifiedMeeting.meetingDate], ['Meeting time', verifiedMeeting.meetingTiming], ['Alone / accompanied', verifiedMeeting.aloneWith], ['Meeting with', verifiedMeeting.meetingWith], ['Joined person', verifiedMeeting.personName], ['Position', verifiedMeeting.position]].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const section = (title: string, fields: (string | undefined)[][], tone: 'lead' | 'assignment' | 'verification') => <View style={[historyStyles.section, tone === 'lead' ? historyStyles.leadSection : tone === 'assignment' ? historyStyles.assignmentSection : historyStyles.verificationSection]}>
    <Text style={historyStyles.sectionTitle}>{title}</Text>
    <View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, historyStyles.detail]}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View>
    {tone === 'lead' ? <View style={historyStyles.latestRow}><View style={historyStyles.latestRemarks}><Text style={styles.label}>LATEST REMARKS</Text><Text numberOfLines={2} style={styles.detailValue}>{show(latestRemarks)}</Text></View><LiveLocationButton url={liveLocationUrl} /></View> : null}
  </View>;
  return <View style={styles.historyWrap}>
    {section('Lead details', leadFields, 'lead')}
    {section('Assignment details', assignmentFields, 'assignment')}
    {section('PC verification details', scFields, 'verification')}
    <View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <State loading progress={progress} message="Loading lead history..." /> : meetings.length ? <View style={historyStyles.meetingList}>{meetings.map((meeting, index) => <MeetingHistoryRow key={meeting.meetingCode ?? `${meeting.id ?? index}`} meeting={meeting} alternate={index % 2 === 1} />)}</View> : <State message="No meeting history is available for this lead yet." />}
  </View>;
}
