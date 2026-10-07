import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Icon } from 'react-native-paper';
import { leadService } from '../services/LeadService';
import { leadSearchApi } from '../api/leadSearch';
import { leadApi } from '../api/lead';
import type { AssignLeadRequest, LeadResponse } from '../types/lead';
import { meetingService } from '../services/MeetingService';
import { meetingApi } from '../api/meeting';
import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';
import { theme } from '../theme/theme';
import { createMeetingVerificationForm } from './meetingVerificationForm';

type Tab = 'today' | 'responses' | 'tasks' | 'assign' | 'assignedLeads';
type VerificationField = NonNullable<keyof MeetingVerificationRequest>;
type VerificationForm = Record<Exclude<VerificationField, 'aloneWith'>, string>;
type MeetingColumnFilter = Partial<Record<'clientName' | 'meetingTitle' | 'employeeName' | 'employeeRole' | 'leadStatus' | 'meetingDate' | 'nextMeetingDate' | 'aloneWith' | 'verifiedBy', string>>;
type AssignedDateRange = { from: string; to: string };
const isVerificationFieldVisible = (field: VerificationField, meetingWith: string) => {
  if (field !== 'personName' && field !== 'position') return true;
  return ['SOMEONE', 'SOMEONE_ELSE', 'WITH_SOMEONE'].includes(
    meetingWith.trim().toUpperCase().replace(/\s+/g, '_'),
  );
};
const isNotConductedMeeting = (meeting?: MeetingResponse | null) => (
  meeting?.meetingConducted === 'NOT_CONDUCTED' || meeting?.meetingStatus === 'NOT_CONDUCTED'
);
const TABS: readonly { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today Meetings', icon: 'calendar-check-outline' },
  { key: 'responses', label: 'Verified Meetings', icon: 'clipboard-check-outline' },
  { key: 'tasks', label: 'Sales Person Tasks', icon: 'account-group-outline' },
  { key: 'assign', label: 'Assign New Lead', icon: 'account-plus-outline' },
  { key: 'assignedLeads', label: 'Assigned Leads', icon: 'account-arrow-right-outline' },
];
const emptyAssignForm = () => ({ clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', bestTimeForMeeting: '', salesPersonEmployeeCode: '', assignedAt: localToday() });
const digitsOnly = (value: string | undefined) => String(value ?? '').replace(/\D/g, '');
const isAlreadyAssignedError = (error: unknown) => /already\s+(assigned|exists)|assigned\s+already|duplicate/i.test(error instanceof Error ? error.message : '');
const assignedSalesPersonForMobile = async (mobileNumber: string) => {
  const response = await leadSearchApi.search({ keyword: mobileNumber, page: 0, size: 25 });
  const matchedLead = response.data?.content?.find((lead) => digitsOnly(lead.mobileNumber) === digitsOnly(mobileNumber));
  if (!matchedLead) return null;
  if (matchedLead.assignedEmployeeName?.trim()) return matchedLead.assignedEmployeeName.trim();
  const uniqueLeadId = matchedLead.uniqueLeadId?.trim();
  if (!uniqueLeadId) return null;
  return (await leadApi.getLeadDetails(uniqueLeadId)).data?.assignedEmployeeName?.trim() || null;
};
const POSITION_OPTIONS = ['Team leader', 'Admin', 'Super Admin', 'Sales Manager', 'RM'];
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
const NOT_CONDUCTED_FIELDS = [
  FIELDS.find((field) => field.key === 'meetingTiming'),
  FIELDS.find((field) => field.key === 'meetingDate'),
].filter((field): field is (typeof FIELDS)[number] => Boolean(field));
const emptyForm = (): VerificationForm => ({ meetingDate: '', meetingTiming: '', ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '', meetingWith: '', personName: '', position: '' });
const HOURS = Array.from({ length: 14 }, (_, index) => String(index + 9).padStart(2, '0'));
const PRIOR_INVESTMENT_OPTIONS = ['YES', 'NO'] as const;
const BEST_TIME_OPTIONS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
const MEETING_WITH_OPTIONS = ['SELF', 'SOMEONE_ELSE'] as const;
const EXCLUDED_TASK_LEAD_STATUSES = new Set(['ALREADY_CLIENT', 'CONVERTED', 'CONVERTED_CLIENT', 'CLIENT_REMOVED', 'CLIENT_NOT_INTERESTED', 'REMOVED', 'NOT_INTERESTED']);
const PAGE_SIZE = 100;
const AGE_GROUP_LABELS: Record<string, string> = {
  BELOW_25: 'Below 25', AGE_25_35: '25–35', AGE_36_45: '36–45',
  AGE_46_55: '46–55', AGE_56_65: '56–65', ABOVE_65: '65+',
};
const AGE_GROUP_OPTIONS = Object.keys(AGE_GROUP_LABELS);
const PROFESSION_LABELS: Record<string, string> = {
  SALARIED_EMPLOYEE: 'Salaried Employee',
  BUSINESS_OWNER: 'Business Owner',
  SELF_EMPLOYED: 'Self Employed',
  DOCTOR: 'Doctor',
  LAWYER_ADVOCATE: 'Lawyer / Advocate',
  CHARTERED_ACCOUNTANT: 'Chartered Accountant (CA)',
  COMPANY_SECRETARY: 'Company Secretary (CS)',
  ENGINEER: 'Engineer',
  ARCHITECT: 'Architect',
  CONSULTANT: 'Consultant',
  TEACHER_PROFESSOR: 'Teacher / Professor',
  GOVERNMENT_EMPLOYEE: 'Government Employee',
  BANKING_FINANCE_PROFESSIONAL: 'Banking / Finance Professional',
  IT_SOFTWARE_PROFESSIONAL: 'IT / Software Professional',
  HEALTHCARE_PROFESSIONAL: 'Healthcare Professional',
  SALES_MARKETING_PROFESSIONAL: 'Sales / Marketing Professional',
  REAL_ESTATE_PROFESSIONAL: 'Real Estate Professional',
  TRADER_INVESTOR: 'Trader / Investor',
  RETIRED: 'Retired',
  STUDENT: 'Student',
  HOMEMAKER: 'Homemaker',
  OTHER: 'Other',
  NOT_DISCLOSED: 'Not Disclosed',
};
const PROFESSION_OPTIONS = Object.keys(PROFESSION_LABELS);
// Static display fallbacks for the PC assignment dropdown. Backend-loaded names still take precedence.
const SALES_PERSONS = [
  { code: 'RK1507', name: 'Rakesh Kumar' },
  { code: 'AS0108', name: 'Abhijeet Singh' },
  { code: 'AK0107', name: 'Atul Kumar' },
  { code: 'RG1108', name: 'Rajat Gupta' },
  { code: 'HP0605', name: 'Harsh Pilania' },
  { code: 'AKS0108', name: 'Amit Kumar Singh' },
  { code: 'SM2403', name: 'Sunny Mathur' },
  { code: 'GK0902', name: 'Garv Kumar' },
  { code: 'AS1909', name: 'Abhishek Singh' },
  { code: 'US2601', name: 'Umakant Sharma' },
  // Temporary assignment target for exercising the shared RM prospect workflow.
  { code: 'AP0101', name: 'Avesh Prajapati', role: 'RELATIONSHIP_MANAGER' },
] as const;
const SALES_PERSON_CODES = SALES_PERSONS.map((employee) => employee.code);
const employeeRole = (roleValue?: string, employeeCode?: string): 'SM' | 'RM' => {
  const role = String(roleValue ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (role === 'RELATIONSHIP_MANAGER' || role === 'RM') return 'RM';
  if (role === 'SALES_MANAGER' || role === 'SM') return 'SM';
  return employeeCode?.trim() === 'AP0101' ? 'RM' : 'SM';
};
const meetingRole = (meeting: MeetingResponse) => employeeRole(meeting.employeeRole ?? meeting.assignedEmployeeRole, meeting.employeeCode);
const leadRole = (lead: LeadResponse) => employeeRole(lead.assignedEmployeeRole, lead.assignedEmployeeCode);
const employeeRoleLabels = (meeting: MeetingResponse) => meetingRole(meeting) === 'RM'
  ? { person: 'Relationship Manager', id: 'Relationship Manager ID' }
  : { person: 'Sales Manager', id: 'Sales Manager ID' };
const show = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);
const maskedMobile = (value: unknown) => {
  const text = String(value ?? '');
  const digits = text.replace(/\D/g, '');
  return digits.length >= 4 ? `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}` : text;
};
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const calendarDate = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
const matchesAssignedDate = (assignedAt: string | undefined, range: AssignedDateRange) => {
  if (!range.from && !range.to) return true;
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  if (!date) return false;
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
};
const timeText = (v?: { hour?: number; minute?: number; second?: number } | string) => typeof v === 'string' ? v : v?.hour === undefined ? '—' : [v.hour, v.minute ?? 0, v.second ?? 0].map((n) => String(n).padStart(2, '0')).join(':');
const mapUrlFor = (meeting: MeetingResponse) => meeting.googleMapsUrl || (meeting.latitude != null && meeting.longitude != null ? `https://www.google.com/maps?q=${meeting.latitude},${meeting.longitude}` : null);
const matchesSearch = (value: unknown, query: string) => !query.trim() || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase());
const leadCardTone = (lead: LeadResponse) => [...String(lead.assignedByEmployeeCode ?? lead.assignedByEmployeeName ?? '')].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
const filterMeetingRecords = (items: readonly MeetingResponse[], filters: MeetingColumnFilter) => items.filter((meeting) => Object.entries(filters).every(([key, filter]) => { if (key === 'meetingDate' && filter?.startsWith('range:')) { const [from, to] = filter.slice(6).split(','); const date = String(meeting.meetingDate ?? ''); return (!from || date >= from) && (!to || date <= to); } const choices = filter?.split('|').filter(Boolean) ?? []; const current = String(key === 'meetingTitle' ? meeting.meetingTitle ?? meeting.meetingType ?? '' : key === 'employeeRole' ? meetingRole(meeting) : meeting[key as keyof MeetingResponse] ?? '').toLowerCase(); return !choices.length || choices.some((choice) => { const selected = choice.toLowerCase(); return key === 'employeeName' ? current === selected || current.startsWith(`${selected} `) || selected.startsWith(`${current} `) : current.includes(selected); }); }));
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const exportNamePart = (value: string) => value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'all-sales-persons';
const exportDatePart = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : `${date.getDate()}${date.toLocaleString('en-IN', { month: 'short' })}`;
};
const exportMeetingCsv = (items: readonly MeetingResponse[], fileName: string, includeVerifier: boolean) => {
  if (Platform.OS !== 'web') { Alert.alert('Excel export', 'Excel export is currently available on the web version.'); return; }
  const headers = ['Meeting Code', 'Client Name', 'Mobile Number', 'Meeting Type', 'Sales Person', 'Employee Code', 'Lead Status', 'Meeting Date', 'Meeting Time', 'Meeting Mode', 'Meeting Location', 'Next Plan Date', 'Joined', 'Person Name', 'Position', 'Remarks'];
  if (includeVerifier) headers.push('Verified By', 'Verification Date', 'Verification Remarks', 'PC Meeting Time', 'Age Group', 'Prior Investment', 'Profession', 'Clinic / Company / Firm Name', 'Best Time for Meeting', 'Meeting With', 'PC Person Name', 'PC Position', 'Latitude', 'Longitude', 'Location Accuracy', 'Google Maps Link');
  const rows = items.map((meeting) => [
    meeting.meetingCode, meeting.clientName, meeting.mobileNumber, meeting.meetingTitle ?? meeting.meetingType, meeting.employeeName, meeting.employeeCode, meeting.leadStatus?.replace(/_/g, ' '), meeting.meetingDate, timeText(meeting.meetingTime), meeting.meetingMode, meeting.meetingLocation ?? meeting.location ?? meeting.address, meeting.nextMeetingDate, meeting.aloneWith, meeting.personName, meeting.position, meeting.remarks ?? meeting.meetingRemarks,
    ...(includeVerifier ? [meeting.verifiedBy, meeting.meetingVerificationDate, meeting.verificationRemarks, meeting.meetingTiming, meeting.ageGroup, meeting.existingSip, meeting.profession, meeting.professionDetail, meeting.bestTimeForMeeting, meeting.meetingWith, meeting.personName, meeting.position, meeting.latitude, meeting.longitude, meeting.locationAccuracy, mapUrlFor(meeting)] : []),
  ]);
  const blob = new Blob([`\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${fileName}.csv`; link.click();
  URL.revokeObjectURL(url);
};
const loadCoordinatorAssignedLeads = async () => {
  const firstPage = await leadSearchApi.search({ page: 0, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
  const leads = [...(firstPage.data?.content ?? [])];
  const totalPages = firstPage.data?.totalPages ?? 1;
  for (let page = 1; page < totalPages; page += 1) {
    const response = await leadSearchApi.search({ page, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
    leads.push(...(response.data?.content ?? []));
  }
  return leads.map((lead) => ({ ...lead, assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt })).filter((lead) => lead.assignmentSource === 'SALES_COORDINATOR' || lead.assignedByCoordinator);
};

export function SalesCoordinatorScreen({ permissions }: { permissions?: readonly string[] | null }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(0);
  const [todayColumnFilters, setTodayColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseColumnFilters, setResponseColumnFilters] = useState<MeetingColumnFilter>({});
  const [taskColumnFilters, setTaskColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseSearch, setResponseSearch] = useState(''); const [assignedSearch, setAssignedSearch] = useState('');
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
  const [exportingAssignedLeads, setExportingAssignedLeads] = useState(false);

  const exportCurrentList = () => {
    if (tab === 'tasks') { exportMeetingCsv(filteredTasks, 'sales-person-tasks', false); return; }
    const responseTab = tab === 'responses';
    const records = responseTab ? verified : pending;
    const filters = responseTab ? responseColumnFilters : todayColumnFilters;
    exportMeetingCsv(filterMeetingRecords(records, filters), responseTab ? 'pc-meeting-response' : 'today-meetings', responseTab);
  };
  const exportAssignedLeads = async () => {
    if (Platform.OS !== 'web') { Alert.alert('Excel export', 'Excel export is currently available on the web version.'); return; }
    setExportingAssignedLeads(true);
    try {
      const rows = (await Promise.all(visibleAssignedLeads.map(async (lead) => {
        const leadIdentifier = lead.uniqueLeadId ?? (lead.leadId !== undefined ? String(lead.leadId) : '');
        const localMeetings = meetings.filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId) || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode));
        const [detailsResult, historyResult] = await Promise.all([
          lead.uniqueLeadId ? leadApi.getLeadDetails(lead.uniqueLeadId).catch(() => null) : Promise.resolve(null),
          leadIdentifier ? meetingApi.getHistory(leadIdentifier).catch(() => null) : Promise.resolve(null),
        ]);
        const detailedLead = detailsResult?.data ? { ...lead, ...detailsResult.data } : lead;
        const byCode = new Map<string, MeetingResponse>();
        [...(historyResult?.data ?? []), ...localMeetings].forEach((meeting) => {
          const key = meeting.meetingCode ?? String(meeting.id ?? '');
          if (key) byCode.set(key, { ...byCode.get(key), ...meeting });
        });
        const detailedMeetings = await Promise.all([...byCode.values()].map(async (meeting) => meeting.meetingCode ? meetingApi.getMeeting(meeting.meetingCode).then((result) => result.data ?? meeting).catch(() => meeting) : meeting));
        const orderedMeetings = detailedMeetings.sort((a, b) => String(a.meetingDate ?? a.createdAt ?? '').localeCompare(String(b.meetingDate ?? b.createdAt ?? '')));
        const latestVerification = [...orderedMeetings].reverse().find((meeting) => meeting.verificationStatus === 'VERIFIED' || Boolean(meeting.verifiedBy) || Boolean(meeting.ageGroup));
        const meetingRows = orderedMeetings.length ? orderedMeetings : [undefined];
        return meetingRows.map((meeting) => [
          detailedLead.clientName, detailedLead.mobileNumber, detailedLead.speciality, detailedLead.location, detailedLead.clinicAddress,
          detailedLead.assignedEmployeeName, detailedLead.assignedByEmployeeName, detailedLead.assignedAt, detailedLead.leadStatus?.replace(/_/g, ' '),
          latestVerification?.ageGroup, latestVerification?.existingSip, latestVerification?.profession, latestVerification?.professionDetail, latestVerification?.bestTimeForMeeting,
          meeting?.meetingTitle ?? meeting?.meetingType, meeting?.meetingStatus, meeting?.meetingDate, meeting?.meetingMode, meeting?.leadStatus?.replace(/_/g, ' '), meeting?.aloneWith, meeting?.personName, meeting?.position, meeting?.remarks ?? meeting?.meetingRemarks ?? meeting?.discussion, meeting?.nextMeetingDate,
        ]);
      }))).flat();
      const headers = ['Client Name', 'Mobile Number', 'Speciality', 'Location', 'Clinic Address', 'Sales Person', 'Sales Coordinator', 'Assigned Date', 'Current Lead Status', 'SC Age Group', 'SC Prior Investment', 'SC Profession', 'SC Firm / Clinic', 'SC Best Time', 'Meeting Type', 'Meeting Status', 'Meeting Date', 'Meeting Mode', 'Meeting Lead Status', 'Joined With', 'Person Name', 'Position', 'Meeting Remarks', 'Next Plan Date'];
      const blob = new Blob([`\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
      const salesPersonName = exportNamePart(assignedSalesPersonFilter);
      const from = exportDatePart(assignedDateRange.from);
      const to = exportDatePart(assignedDateRange.to);
      const dateRangeName = from && to ? `${from}-to-${to}` : from ? `from-${from}` : to ? `to-${to}` : 'all-dates';
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `assigned-leads-${salesPersonName}-${dateRangeName}.csv`; link.click(); URL.revokeObjectURL(url);
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
      const [p, v, deferred] = await Promise.all([
        meetingService.getVerificationMeetings('PENDING').then((result) => { setLoadingProgress(40); return result; }),
        meetingService.getVerificationMeetings('VERIFIED').then((result) => { setLoadingProgress(70); return result; }),
        includeDeferredData ? Promise.all([meetingService.getAllMeetingRecords(), loadCoordinatorAssignedLeads()]).then((result) => { setLoadingProgress(90); return result; }) : Promise.resolve(null),
      ]);
      if (generation !== dataGeneration.current) return;
      setLoadingProgress(100); setPending(p); setVerified(v);
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
  const refreshPendingMeetings = useCallback(async () => { if (loadInFlight.current || pendingRefreshInFlight.current || submittingRef.current) return; pendingRefreshInFlight.current = true; try { setPending(await meetingService.getVerificationMeetings('PENDING')); } finally { pendingRefreshInFlight.current = false; nextRefreshAt.current = Date.now() + 10_000; } }, []);
  const refreshVerifiedMeetings = useCallback(async () => { if (loadInFlight.current || verifiedRefreshInFlight.current || submittingRef.current) return; verifiedRefreshInFlight.current = true; try { setVerified(await meetingService.getVerificationMeetings('VERIFIED')); } finally { verifiedRefreshInFlight.current = false; nextVerifiedRefreshAt.current = Date.now() + 5 * 60_000; } }, []);
  const refreshTaskMeetings = useCallback(async () => { if (!hasTaskData.current || loadInFlight.current || taskRefreshInFlight.current || submittingRef.current) return; taskRefreshInFlight.current = true; try { setMeetings(await meetingService.getAllMeetingRecords()); } finally { taskRefreshInFlight.current = false; nextTaskRefreshAt.current = Date.now() + 60 * 60_000; } }, []);
  const refreshAssignedLeads = useCallback(async () => { if (!hasAssignedLeadsData.current || loadInFlight.current || assignedLeadsRefreshInFlight.current || submittingRef.current) return; assignedLeadsRefreshInFlight.current = true; try { setAssignedLeads(await loadCoordinatorAssignedLeads()); } finally { assignedLeadsRefreshInFlight.current = false; nextAssignedLeadsRefreshAt.current = Date.now() + 30 * 60_000; } }, []);
  useEffect(() => { void load(); const todayTimer = setInterval(() => { if (Date.now() >= nextRefreshAt.current) void refreshPendingMeetings(); }, 1000); const verifiedTimer = setInterval(() => void refreshVerifiedMeetings(), 5 * 60_000); const taskTimer = setInterval(() => void refreshTaskMeetings(), 60 * 60_000); const assignedTimer = setInterval(() => void refreshAssignedLeads(), 30 * 60_000); return () => { clearInterval(todayTimer); clearInterval(verifiedTimer); clearInterval(taskTimer); clearInterval(assignedTimer); dataGeneration.current += 1; }; }, [load, refreshAssignedLeads, refreshPendingMeetings, refreshTaskMeetings, refreshVerifiedMeetings]);
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
    const assignedLead = assignedLeads.find((lead) => (
      (meeting.leadId !== undefined && lead.leadId === meeting.leadId)
      || (Boolean(meeting.leadCode) && lead.leadCode === meeting.leadCode)
    ));
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
    return assignedLeads
      .filter((lead) => {
        const status = String(lead.leadStatus ?? '').toUpperCase();
        const keys = [lead.leadId !== undefined ? `id:${lead.leadId}` : '', lead.leadCode ? `code:${lead.leadCode}` : ''].filter(Boolean);
        return !EXCLUDED_TASK_LEAD_STATUSES.has(status) && keys.every((key) => !meetingLeadKeys.has(key));
      })
      .map((lead) => {
        const latestMeetingWithNextPlan = [...meetings, ...pending, ...verified]
          .filter((meeting) => Boolean(meeting.nextMeetingDate) && (
            (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber))
          ))
          .sort((left, right) => String(right.workflowUpdatedAt ?? right.updatedAt ?? right.lastModifiedDate ?? right.meetingDate ?? '').localeCompare(String(left.workflowUpdatedAt ?? left.updatedAt ?? left.lastModifiedDate ?? left.meetingDate ?? '')))[0];
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
      const { assignedAt, ...leadValues } = assignForm;
      const lead = await leadService.assignLead({ ...leadValues, clientName: assignForm.clientName.trim(), mobileNumber: assignForm.mobileNumber.trim(), location: assignForm.location.trim(), clinicAddress: assignForm.clinicAddress.trim(), speciality: assignForm.speciality.trim(), bestTimeForMeeting: assignForm.bestTimeForMeeting as AssignLeadRequest['bestTimeForMeeting'], salesPersonEmployeeCode: assignForm.salesPersonEmployeeCode.trim().toUpperCase(), assignmentDate: assignedAt });
      setAssignForm(emptyAssignForm());
      setAssignMessage({ type: 'success', text: `${lead.clientName ?? 'Lead'} assigned successfully${lead.assignedEmployeeName ? ` to ${lead.assignedEmployeeName}` : ''}.` });
    } catch (e) {
      let text = e instanceof Error ? e.message : 'Lead assignment failed.';
      if (isAlreadyAssignedError(e)) {
        try {
          const salesPersonName = await assignedSalesPersonForMobile(assignForm.mobileNumber);
          text = salesPersonName
            ? `This lead is assigned to ${salesPersonName}.`
            : 'This mobile number already belongs to an existing lead.';
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
    setSubmitError(null); setSelected(meeting);
  };
  const verify = async () => {
    if (!selected?.meetingCode || submittingRef.current) return;
    const notConducted = isNotConductedMeeting(selected);
    if (!form.meetingDate) {
      setSubmitError('Please choose the meeting date.'); return;
    }
    if (!form.meetingTiming) {
      setSubmitError('Please choose the meeting time.'); return;
    }
    if (form.meetingTiming && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(form.meetingTiming)) {
      setSubmitError('Meeting Time must use HH:mm:ss format.'); return;
    }
    if (!notConducted && !form.meetingWith) {
      setSubmitError('Please choose who joined the meeting.'); return;
    }
    if (!notConducted && form.meetingWith === 'SOMEONE_ELSE' && (!form.personName.trim() || !form.position.trim())) {
      setSubmitError('Please enter the person name and position.'); return;
    }
    const visibleValues = Object.fromEntries(
      (notConducted ? NOT_CONDUCTED_FIELDS : FIELDS)
        .filter((field) => isVerificationFieldVisible(field.key, form.meetingWith))
        .map((field) => [field.key, form[field.key].trim()]).filter(([, fieldValue]) => Boolean(fieldValue)),
    ) as MeetingVerificationRequest;
    const payload: MeetingVerificationRequest = notConducted ? visibleValues : {
      ...visibleValues,
      aloneWith: form.meetingWith === 'SELF' ? 'SELF' : 'SOMEONE',
      meetingWith: form.meetingWith,
    };
    submittingRef.current = true; setSubmitting(true); setSubmitError(null);
    dataGeneration.current += 1;
    try {
      await meetingService.verifyMeeting(selected.meetingCode, payload);
      setPending((items) => items.filter((m) => m.meetingCode !== selected.meetingCode));
      setSelected(null);
      void meetingService.getVerificationMeetings('VERIFIED')
        .then(setVerified)
        .catch(() => undefined);
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Meeting verification failed.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  const renderTab = (item: typeof TABS[number]) => {
    const tone = item.key === 'today' ? 'Today' : item.key === 'responses' ? 'Responses' : item.key === 'tasks' ? 'Tasks' : 'Assign';
    const selected = tab === item.key;
    const tabColor = tone === 'Today' ? '#4338CA' : tone === 'Responses' ? '#6D28D9' : tone === 'Tasks' ? '#047857' : '#B45309';
    return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, styles[`tab${tone}`], selected && styles[`tab${tone}Active`]]}><View style={[styles.tabIcon, styles[`tab${tone}Icon`], selected && styles.tabIconActive]}><Icon source={item.icon} size={14} color={selected ? '#FFFFFF' : tabColor} /></View><Text style={[styles.tabText, styles[`tab${tone}Color`], selected && styles.tabTextActive]}>{item.label}</Text>{item.key === 'today' ? <Text style={[styles.badge, styles.badgeToday, selected && styles.badgeActive]}>{pending.length}</Text> : null}</Pressable>;
  };
  const openLeadHistory = async (lead: LeadResponse) => {
    setHistoryLead(lead); setHistoryMeetings([]); setHistoryError(null); setHistoryLoadingProgress(10); setHistoryLoading(true);
    const leadIdentifier = lead.uniqueLeadId ?? (lead.leadId !== undefined ? String(lead.leadId) : '');
    const localMeetings = meetings.filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId) || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode));
    const verifiedMeetings = verified.filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId) || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode));
    try {
      const [detailResult, historyResult] = await Promise.all([
        lead.uniqueLeadId ? leadApi.getLeadDetails(lead.uniqueLeadId).then((result) => { setHistoryLoadingProgress(50); return result; }).catch(() => null) : Promise.resolve(null),
        leadIdentifier ? meetingApi.getHistory(leadIdentifier).then((result) => { setHistoryLoadingProgress(80); return result; }).catch(() => null) : Promise.resolve(null),
      ]);
      const summaries = historyResult?.data ?? [];
      const byCode = new Map<string, MeetingResponse>();
      [...summaries, ...localMeetings, ...verifiedMeetings].forEach((meeting) => { const key = meeting.meetingCode ?? String(meeting.id ?? ''); if (key) byCode.set(key, { ...byCode.get(key), ...meeting }); });
      const detailedMeetings = await Promise.all([...byCode.values()].map(async (meeting) => meeting.meetingCode ? meetingApi.getMeeting(meeting.meetingCode).then((result) => result.data ?? meeting).catch(() => meeting) : meeting));
      setHistoryLoadingProgress(100); setHistoryLead(detailResult?.data ? { ...lead, ...detailResult.data } : lead);
      setHistoryMeetings(detailedMeetings.sort((a, b) => String(b.meetingDate ?? b.createdAt ?? '').localeCompare(String(a.meetingDate ?? a.createdAt ?? ''))));
    } catch (e) { setHistoryError(e instanceof Error ? e.message : 'Lead history could not be loaded.'); setHistoryMeetings(localMeetings); }
    finally { setHistoryLoading(false); }
  };
  const metricsBlock = <View style={styles.metrics}><Metric icon="clock-outline" value={pending.length} label="To review" tone="blue" /><Metric icon="account-outline" value={taskSalesPeople} label="Sales people" tone="orange" /></View>;
  const syncBlock = <View style={[styles.syncControls, compact && styles.syncControlsCompact]}><Pressable disabled={refreshing || submitting} onPress={() => void load(true)} style={({ pressed }) => [styles.syncButton, (refreshing || submitting) && styles.disabled, pressed && styles.pressed]}><Icon source="refresh" size={17} color="#3156C8" /><Text style={styles.refreshText}>Sync data</Text></Pressable><AutoRefreshBadge tab={tab} refreshing={refreshing} submitting={submitting} nextRefreshAt={nextRefreshAt} nextVerifiedRefreshAt={nextVerifiedRefreshAt} nextTaskRefreshAt={nextTaskRefreshAt} nextAssignedLeadsRefreshAt={nextAssignedLeadsRefreshAt} /></View>;
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
            <Text style={styles.contentSubtitle}>{tab === 'today' ? `Showing ${visibleTodayMeetings.length} of ${pending.length} meetings` : tab === 'responses' ? `Showing ${visibleVerifiedMeetings.length} of ${verified.length} verified meetings` : tab === 'tasks' ? `Showing ${filteredTasks.length} of ${taskRecords.length} active tasks` : tab === 'assignedLeads' ? `Showing ${visibleAssignedLeads.length} of ${assignedLeads.length} assigned leads` : 'Create a physical lead and assign it to a sales person'}</Text>
          </View>
          {tab === 'responses' ? <TextInput value={responseSearch} onChangeText={setResponseSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} /> : null}
          {tab === 'tasks' && !loading && !error ? <TaskToolbar header search={taskSearch} onSearch={setTaskSearch} status={statusFilter} onStatus={setStatusFilter} /> : null}
          {tab === 'assignedLeads' ? <View style={[styles.assignedHeaderActions, compact && styles.assignedHeaderActionsCompact]}><HeaderLeadFilters leads={assignedLeads} coordinatorFilter={coordinatorFilter} setCoordinatorFilter={setCoordinatorFilter} salesPersonFilter={assignedSalesPersonFilter} setSalesPersonFilter={setAssignedSalesPersonFilter} dateRange={assignedDateRange} setDateRange={setAssignedDateRange} search={assignedSearch} setSearch={setAssignedSearch} />{assignedSearch || coordinatorFilter || assignedSalesPersonFilter || assignedDateRange.from || assignedDateRange.to ? <Pressable accessibilityLabel="Clear assigned lead filters" onPress={() => { setAssignedSearch(''); setCoordinatorFilter(''); setAssignedSalesPersonFilter(''); setAssignedDateRange({ from: '', to: '' }); }} style={styles.assignedClearButton}><Text style={styles.assignedClearText}>Clear</Text></Pressable> : null}</View> : null}
        </View>
      </View>
    {!compact && !loading && !error && tab === 'today' ? <MeetingTableHeader hideMeetingDate records={pending} filters={todayColumnFilters} onFiltersChange={setTodayColumnFilters} /> : null}
    {tab === 'tasks' ? <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator stickyHeaderIndices={[0]}><View style={styles.taskStickyHeader}>{!compact && !loading && !error && tabLoading !== 'tasks' ? <MeetingTableHeader taskOnly records={taskRecords} filters={taskColumnFilters} onFiltersChange={setTaskColumnFilters} /> : null}</View><View style={styles.taskFullPanel}>{permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}{loading || tabLoading === 'tasks' ? <State loading progress={loading ? loadingProgress : tabLoadingProgress} message="Loading sales person tasks..." /> : error ? <State message={error} /> : null}{!loading && tabLoading !== 'tasks' && !error ? <><Cards taskOnly items={pagedTasks} empty="No meeting tasks match these filters." /><Pagination page={taskPage} total={filteredTasks.length} onPageChange={setTaskPage} /></> : null}</View></ScrollView> : null}
    {tab !== 'tasks' ? <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={tab === 'responses'} stickyHeaderIndices={tab === 'responses' ? [0] : undefined}>
    <View style={tab === 'responses' ? styles.verifiedStickyHeader : undefined}>{!compact && !loading && !error && tab === 'responses' ? <MeetingTableHeader verified records={verified} filters={responseColumnFilters} onFiltersChange={setResponseColumnFilters} /> : null}</View>
    {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
    {loading ? <State loading progress={loadingProgress} message="Loading coordinator workspace..." /> : tabLoading === 'assignedLeads' ? <State loading progress={tabLoadingProgress} message="Loading assigned leads..." /> : error ? <State message={error} /> : null}
    {!loading && !error && tab === 'today' ? <Cards hideMeetingDate items={visibleTodayMeetings} empty="No meetings are pending Process Coordinator verification." action="Verify Details" onOpen={openVerify} /> : null}
    {!loading && !error && tab === 'responses' ? <Cards items={visibleVerifiedMeetings} empty="No meetings have been verified by the Sales Coordinator yet." action="View Response" onOpen={setSelected} verified /> : null}
    {!loading && !error && tab === 'assign' ? <AssignLeadForm compact={compact} form={assignForm} setForm={setAssignForm} assigning={assigning} message={assignMessage} salesPersonNamesByCode={salesPersonNamesByCode} onSubmit={() => void assignLead()} /> : null}
    {!loading && tabLoading !== 'assignedLeads' && !error && tab === 'assignedLeads' ? <><AssignedLeadCards leads={pagedAssignedLeads} coordinatorFilter={coordinatorFilter} setCoordinatorFilter={setCoordinatorFilter} salesPersonFilter={assignedSalesPersonFilter} setSalesPersonFilter={setAssignedSalesPersonFilter} dateRange={assignedDateRange} onOpen={openLeadHistory} /><Pagination page={assignedLeadsPage} total={visibleAssignedLeads.length} onPageChange={setAssignedLeadsPage} /></> : null}
    </ScrollView> : null}
    </View>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text></View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>
        {selected ? <Details meeting={selected} visitOnly={isNotConductedMeeting(selected)} /> : null}
        {tab === 'responses' && selected ? <VerificationDetails meeting={selected} /> : selected ? <View style={[styles.formSection, verificationStyles.section]}>
          <Text style={styles.sectionTitle}>{isNotConductedMeeting(selected) ? 'Verify Location Visit' : 'PC Additional Information'}</Text>
          <Text style={styles.help}>{isNotConductedMeeting(selected) ? 'Confirm only the date and time of this visited-but-not-met record.' : 'Choose the available values below. Blank optional values are omitted; backend validation messages are shown unchanged.'}</Text>
          <View style={styles.formGrid}>{(isNotConductedMeeting(selected) ? NOT_CONDUCTED_FIELDS : FIELDS).map((field) => <VerificationFormField key={field.key} field={field} form={form} setForm={setForm} />)}</View>
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
          <Pressable disabled={submitting} onPress={() => void verify()} style={[styles.submit, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Icon source="check-decagram-outline" size={20} color="#fff" />}<Text style={styles.submitText}>{submitting ? 'Verifying...' : isNotConductedMeeting(selected) ? 'Verify Visit' : 'Verify Meeting'}</Text></Pressable>
        </View> : null}
      </ScrollView>
    </View></View></Modal>
    <Modal transparent visible={Boolean(historyLead)} animationType="fade" onRequestClose={() => setHistoryLead(null)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>LEAD HISTORY</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{historyLead?.clientName ?? 'Lead details'}</Text></View><Pressable onPress={() => setHistoryLead(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>{historyLead ? <LeadHistoryContentStyled lead={historyLead} meetings={historyMeetings} loading={historyLoading} progress={historyLoadingProgress} error={historyError} /> : null}</ScrollView>
    </View></View></Modal>
  </View>;
}

function AutoRefreshBadge({ tab, refreshing, submitting, nextRefreshAt, nextVerifiedRefreshAt, nextTaskRefreshAt, nextAssignedLeadsRefreshAt }: { tab: Tab; refreshing: boolean; submitting: boolean; nextRefreshAt: MutableRefObject<number>; nextVerifiedRefreshAt: MutableRefObject<number>; nextTaskRefreshAt: MutableRefObject<number>; nextAssignedLeadsRefreshAt: MutableRefObject<number> }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => { const update = () => { const next = tab === 'today' ? nextRefreshAt.current : tab === 'responses' ? nextVerifiedRefreshAt.current : tab === 'tasks' ? nextTaskRefreshAt.current : tab === 'assignedLeads' ? nextAssignedLeadsRefreshAt.current : null; setSeconds(next === null ? null : Math.max(0, Math.ceil((next - Date.now()) / 1000))); }; update(); const timer = setInterval(update, 1000); return () => clearInterval(timer); }, [nextAssignedLeadsRefreshAt, nextRefreshAt, nextTaskRefreshAt, nextVerifiedRefreshAt, tab]);
  const label = seconds === null ? 'Ready' : seconds >= 3600 ? `${Math.ceil(seconds / 3600)}h` : seconds >= 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
  return <View style={styles.autoRefreshBadge}><View style={styles.autoRefreshDot} /><Text style={styles.autoRefreshLabel}>{refreshing ? 'Syncing' : submitting ? 'Paused' : tab === 'assign' ? 'On-demand' : 'Auto-refresh'}</Text><View style={styles.countdownBadge}>{refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.countdownText}>{label}</Text>}</View></View>;
}
function Pagination({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE + 1;
  const end = Math.min(total, (safePage + 1) * PAGE_SIZE);
  return <View style={styles.pagination}><Text style={styles.paginationText}>Showing {start}–{end} of {total}</Text><View style={styles.paginationControls}><Pressable disabled={safePage === 0} onPress={() => onPageChange(safePage - 1)} style={[styles.paginationButton, safePage === 0 && styles.disabled]}><Text style={styles.paginationButtonText}>Previous</Text></Pressable><Text style={styles.paginationText}>Page {safePage + 1} of {totalPages}</Text><Pressable disabled={safePage === totalPages - 1} onPress={() => onPageChange(safePage + 1)} style={[styles.paginationButton, safePage === totalPages - 1 && styles.disabled]}><Text style={styles.paginationButtonText}>Next</Text></Pressable></View></View>;
}
function Metric({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'blue' | 'green' | 'orange' }) {
  const toneStyle = tone === 'green' ? styles.metricGreen : tone === 'orange' ? styles.metricOrange : styles.metricBlue;
  const accentStyle = tone === 'green' ? styles.metricAccentGreen : tone === 'orange' ? styles.metricAccentOrange : styles.metricAccentBlue;
  const color = tone === 'green' ? '#15936A' : tone === 'orange' ? '#D97706' : '#3156C8';
  return <View style={[styles.metric, accentStyle]}><View style={[styles.metricIcon, toneStyle]}><Icon source={icon} size={15} color={color} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>;
}

function TaskToolbar({ search, onSearch, status, onStatus, header = false }: { search: string; onSearch: (value: string) => void; status: 'ALL' | 'TODAY' | 'PENDING'; onStatus: (value: 'ALL' | 'TODAY' | 'PENDING') => void; header?: boolean }) {
  return <View style={[styles.taskToolbar, header && styles.taskToolbarHeader]}><TextInput value={search} onChangeText={onSearch} placeholder="Search lead name or number" placeholderTextColor="#94A3B8" style={styles.filterInput} /><View style={styles.chips}>{(['ALL', 'TODAY', 'PENDING'] as const).map((value) => <Pressable key={value} onPress={() => onStatus(value)} style={[styles.chip, status === value && styles.chipActive]}><Text style={[styles.chipText, status === value && styles.chipTextActive]}>{value === 'ALL' ? 'ALL TASKS' : `${value} TASKS`}</Text></Pressable>)}</View></View>;
}

const verificationStyles = StyleSheet.create({
  section: { gap: 6, paddingTop: 7 },
  field: { width: '23%', minWidth: 170, gap: 2 },
  control: { height: Platform.OS === 'web' ? 30 : 36 },
  input: { height: Platform.OS === 'web' ? 30 : 36, paddingVertical: 4, paddingHorizontal: 9, fontSize: 11 },
});

function VerificationFormField({
  field,
  form,
  setForm,
}: {
  field: typeof FIELDS[number];
  form: VerificationForm;
  setForm: React.Dispatch<React.SetStateAction<VerificationForm>>;
}) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const update = (value: string) => setForm((current) => ({
    ...current,
    [field.key]: value,
    ...(field.key === 'meetingWith' && value === 'SELF' ? { personName: '', position: '' } : {}),
  }));
  const tone = field.key === 'meetingTiming' || field.key === 'ageGroup' ? styles.fieldToneBlue : field.key === 'existingSip' || field.key === 'profession' ? styles.fieldToneTeal : field.key === 'professionDetail' || field.key === 'bestTimeForMeeting' ? styles.fieldToneViolet : styles.fieldToneAmber;

  if (!isVerificationFieldVisible(field.key, form.meetingWith)) return null;

  if (field.key === 'meetingDate') {
    return (
      <View style={[styles.field, tone, verificationStyles.field]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <Pressable onPress={() => setDatePickerVisible(true)} style={[styles.assignDatePicker, verificationStyles.control]}>
          <Icon source="calendar-month-outline" size={18} color="#3156C8" />
          <Text style={styles.assignDatePickerText}>{form.meetingDate || field.placeholder}</Text>
          <Icon source="chevron-down" size={18} color="#64748B" />
        </Pressable>
        <CompactAssignmentCalendar
          visible={datePickerVisible}
          value={form.meetingDate}
          onDismiss={() => setDatePickerVisible(false)}
          onSelect={update}
        />
      </View>
    );
  }

  if (field.key === 'meetingTiming') {
    const [selectedHour = ''] = form.meetingTiming.split(':');
    const updateTime = (hour: string) => {
      update(hour ? `${hour}:00:00` : '');
    };
    return (
      <View style={[styles.field, tone, verificationStyles.field]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.timePickerRow}>
          <View style={[styles.pickerShell, styles.timePicker, verificationStyles.control]}><Picker selectedValue={selectedHour} onValueChange={updateTime} style={[styles.picker, verificationStyles.control]}><Picker.Item label="Hour" value="" />{HOURS.map((hour) => <Picker.Item key={hour} label={hour} value={hour} />)}</Picker></View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={[styles.secondsBox, verificationStyles.control]}><Text style={styles.secondsValue}>00</Text></View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={[styles.secondsBox, verificationStyles.control]}><Text style={styles.secondsValue}>00</Text></View>
        </View>
      </View>
    );
  }

  const options = field.key === 'existingSip'
    ? PRIOR_INVESTMENT_OPTIONS
    : field.key === 'bestTimeForMeeting'
      ? BEST_TIME_OPTIONS
      : field.key === 'ageGroup'
        ? AGE_GROUP_OPTIONS
        : field.key === 'profession'
          ? PROFESSION_OPTIONS
          : field.key === 'meetingWith'
            ? MEETING_WITH_OPTIONS
            : field.key === 'position'
              ? POSITION_OPTIONS
              : null;
  if (options) {
    return (
      <View style={[styles.field, tone, verificationStyles.field]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={[styles.pickerShell, verificationStyles.control]}><Picker selectedValue={form[field.key]} onValueChange={update} style={[styles.picker, verificationStyles.control]}><Picker.Item label="Select an option" value="" />{options.map((option) => <Picker.Item key={option} label={field.key === 'ageGroup' ? AGE_GROUP_LABELS[option] : field.key === 'profession' ? PROFESSION_LABELS[option] : field.key === 'meetingWith' ? option === 'SELF' ? 'Self' : 'With someone' : option} value={option} />)}</Picker></View>
      </View>
    );
  }

  return <View style={[styles.field, tone, verificationStyles.field]}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput value={form[field.key]} onChangeText={update} placeholder={field.placeholder} style={[styles.input, verificationStyles.input]} /></View>;
}

function StyledSelect({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: readonly { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={[styles.styledSelectWrap, open && styles.styledSelectWrapOpen]}><Pressable onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.styledSelect, open && styles.styledSelectOpen, pressed && styles.pressed]}><Text numberOfLines={1} style={[styles.styledSelectText, !selected && styles.styledSelectPlaceholder]}>{selected?.label ?? placeholder}</Text><Icon source={open ? 'chevron-up' : 'chevron-down'} size={18} color="#3156C8" /></Pressable>{open ? <View style={styles.selectMenu}><ScrollView style={styles.selectOptions} nestedScrollEnabled>{options.map((option) => <Pressable key={option.value} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.selectOption, value === option.value && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option.value && styles.selectOptionTextActive]}>{option.label}</Text>{value === option.value ? <Icon source="check" size={16} color="#3156C8" /> : null}</Pressable>)}</ScrollView></View> : null}</View>;
}

const FILTER_COLUMNS: { key: keyof MeetingColumnFilter; label: string }[] = [
  { key: 'clientName', label: 'CLIENT NAME' }, { key: 'meetingTitle', label: 'MEETING TYPE' }, { key: 'employeeName', label: 'ASSIGNED TO' }, { key: 'employeeRole', label: 'ROLE' }, { key: 'leadStatus', label: 'LEAD STATUS' }, { key: 'meetingDate', label: 'MEETING DATE' }, { key: 'nextMeetingDate', label: 'NEXT PLAN DATE' }, { key: 'aloneWith', label: 'JOINED' },
];
function InlineCalendar({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const empty = Array.from({ length: (month.getDay() + 6) % 7 });
  const iso = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <View style={styles.inlineCalendar}><View style={styles.calendarHeader}><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><Icon source="chevron-left" size={18} color="#3156C8" /></Pressable><Text style={styles.calendarMonth}>{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><Icon source="chevron-right" size={18} color="#3156C8" /></Pressable></View><View style={styles.calendarGrid}>{['M','T','W','T','F','S','S'].map((day, index) => <Text key={`${day}${index}`} style={styles.calendarWeekday}>{day}</Text>)}{empty.map((_, index) => <View key={`empty${index}`} style={styles.calendarDay} />)}{days.map((day) => <Pressable key={day} onPress={() => onSelect(iso(day))} style={[styles.calendarDay, value === iso(day) && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, value === iso(day) && styles.calendarDayTextSelected]}>{day}</Text></Pressable>)}</View></View>;
}
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
  const openChoices = (key: keyof MeetingColumnFilter) => { if (key === 'meetingDate' && verified) { const [from = '', to = ''] = (filters[key] ?? '').replace('range:', '').split(','); setDateRange({ from, to }); } else setDraftChoices((filters[key] ?? '').split('|').filter(Boolean)); setOpenFilter(key); };
  const dateFilterOpen = openFilter === 'meetingDate' && verified;
  const dateText = (date: Date) => date.toISOString().slice(0, 10);
  return <><View style={[styles.listHeader, styles.verifiedListHeader, styles.desktopRow]}>{columns.map((column, index) => <View key={column.key} style={[styles.headerColumn, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>{dropdownKeys.includes(column.key) ? <View style={styles.headerFilterWrap}><Pressable onPress={() => openChoices(column.key)} style={styles.headerFilterButton}><Text numberOfLines={1} style={[styles.headerFilterText, filters[column.key] && styles.columnLabelFiltered]}>{column.label}</Text><View style={[styles.headerFilterIcon, filters[column.key] && styles.headerFilterIconActive]}><Icon source="filter-variant" size={10} color={filters[column.key] ? '#FFFFFF' : '#536B9F'} /></View></Pressable></View> : <Text numberOfLines={1} style={styles.columnLabel}>{column.label}</Text>}</View>)}{taskOnly && (filters.employeeName || filters.employeeRole) ? <Pressable accessibilityLabel="Clear assignment filters" onPress={() => onFiltersChange((current) => ({ ...current, employeeName: '', employeeRole: '' }))} style={styles.taskFilterClear}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}{!taskOnly ? <Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}</View>{openFilter ? <Modal transparent visible animationType="fade" onRequestClose={() => setOpenFilter(null)}><Pressable style={styles.filterBackdrop} onPress={() => setOpenFilter(null)}><Pressable style={styles.filterPopover} onPress={() => undefined}><View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>{dateFilterOpen ? 'MEETING DATE RANGE' : columns.find((column) => column.key === openFilter)?.label}</Text><Text style={styles.filterPopoverHint}>{dateFilterOpen ? 'Choose a start and end date' : 'Select one or more values'}</Text></View><Pressable onPress={() => setOpenFilter(null)}><Icon source="close" size={18} color="#64748B" /></Pressable></View>{dateFilterOpen ? <View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{dateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar value={dateRange[dateTarget]} onSelect={(value) => { setDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View> : <ScrollView style={styles.filterChoices}>{optionsFor(openFilter).map((option) => { const checked = draftChoices.includes(option); return <Pressable key={option} onPress={() => setDraftChoices((items) => checked ? items.filter((item) => item !== option) : [...items, option])} style={[styles.filterChoice, checked && styles.filterChoiceSelected]}><View style={[styles.filterCheckbox, checked && styles.filterCheckboxSelected]}>{checked ? <Icon source="check" size={13} color="#FFFFFF" /> : null}</View><Text style={[styles.filterChoiceText, checked && styles.filterChoiceTextSelected]}>{option.replace(/_/g, ' ')}</Text></Pressable>; })}</ScrollView>}<View style={styles.filterActions}><Pressable onPress={() => dateFilterOpen ? setDateRange({ from: '', to: '' }) : setDraftChoices([])} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable><Pressable onPress={() => { onFiltersChange((current) => ({ ...current, [openFilter]: dateFilterOpen ? (dateRange.from || dateRange.to ? `range:${dateRange.from},${dateRange.to}` : '') : draftChoices.join('|') })); setOpenFilter(null); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable></View></Pressable></Pressable></Modal> : null}</>;
  return <><View style={[styles.listHeader, styles.desktopRow]}>{columns.map((column, index) => <Text key={column.key} numberOfLines={1} style={[styles.columnLabel, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>{column.label}</Text>)}<View style={styles.desktopActionColumn} /></View><View style={[styles.filterRow, styles.desktopRow]}>{columns.map((column, index) => <View key={column.key} style={[styles.filterCell, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}><Icon source="filter-variant" size={11} color="#64748B" /><TextInput value={filters[column.key] ?? ''} onChangeText={(value) => onFiltersChange((current) => ({ ...current, [column.key]: value }))} placeholder="Filter" placeholderTextColor="#94A3B8" style={styles.columnFilterInput} /></View>)}<Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable></View></>;
}

const baseFields = (m: MeetingResponse) => [['Client Name', m.clientName], ['Mobile Number', maskedMobile(m.mobileNumber)], ['Sales Person', m.employeeName], ['Employee Code', m.employeeCode], ['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['Meeting Mode', m.meetingMode], ['Location', m.meetingLocation ?? m.location ?? m.address]] as const;
function Cards({ items, filters = {}, empty, action, onOpen, verified = false, taskOnly = false, hideMeetingDate = false }: { items: readonly MeetingResponse[]; filters?: MeetingColumnFilter; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean; taskOnly?: boolean; hideMeetingDate?: boolean }) {
  const compact = useWindowDimensions().width < 760;
  const visibleItems = filterMeetingRecords(items, filters);
  if (!visibleItems.length) return <State message={Object.values(filters).some(Boolean) ? 'No meetings match these filters.' : empty} />;
  if (compact) return <View style={styles.list}>{visibleItems.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.mobileRow, i % 2 === 1 && styles.listRowAlternate]}><View style={styles.personCell}><View style={styles.cellCopy}><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(maskedMobile(m.mobileNumber))}</Text></View></View><View style={styles.mobileMeeting}><Text style={styles.cellMain}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.cellSub}>{show(m.meetingDate)} · {show(m.nextMeetingDate)}{verified ? ` · Verified by ${show(m.verifiedBy)}` : ''}</Text></View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.mobileAction}><Icon source="chevron-right" size={16} color="#3156C8" /></Pressable> : null}</View>)}</View>;
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
  return <View style={styles.desktopTable}>{visibleItems.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.listRow, styles.desktopRow, i % 2 === 1 && styles.listRowAlternate]}><View style={[styles.personCell, styles.fluidColumn, styles.clientColumn]}><View style={styles.cellCopy}><Text numberOfLines={1} style={styles.client}>{show(m.clientName)}</Text></View></View>{columns.map(([label, value]) => <View key={label} style={[styles.cell, styles.fluidColumn, label === 'LEAD STATUS' && styles.leadStatusColumn]}><Text numberOfLines={1} style={[styles.cellMain, label === 'LEAD STATUS' && styles.status, label === 'LEAD STATUS' && styles.leadStatusValue, label === 'LEAD STATUS' && m.leadStatus === 'CONVERTED_CLIENT' && styles.statusVerified, label === 'JOINED' && styles.joinedBadge, label === 'ROLE' && styles.roleBadge, label === 'ROLE' && meetingRole(m) === 'RM' && styles.roleBadgeRm]}>{label === 'LEAD STATUS' ? show(value(m)).replace(/_/g, ' ') : show(value(m))}</Text></View>)}{onOpen ? <Pressable onPress={() => onOpen(m)} style={({ pressed }) => [styles.rowAction, styles.desktopActionColumn, pressed && styles.rowActionPressed]}><Text numberOfLines={1} style={styles.rowActionText}>{action}</Text><Icon source="chevron-right" size={13} color="#3156C8" /></Pressable> : taskOnly ? null : <View style={styles.desktopActionColumn} />}</View>)}</View>;
}
function Details({ meeting: m, visitOnly = false }: { meeting: MeetingResponse; visitOnly?: boolean }) {
  const meetingPlace = m.meetingLocation ?? m.location ?? m.address;
  const mapUrl = mapUrlFor(m);
  const overviewFields = visitOnly
    ? [['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Next Plan Date', m.nextMeetingDate]] as const
    : [['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Next Plan Date', m.nextMeetingDate], ['Lead Status', m.leadStatus?.replace(/_/g, ' ')]] as const;
  const employeeLabels = employeeRoleLabels(m);
  const contactFields = visitOnly
    ? [['Mobile Number', maskedMobile(m.mobileNumber)], [employeeLabels.person, m.employeeName], [employeeLabels.id, m.employeeCode], ...(m.meetingCode || m.id ? [['Meeting ID', m.meetingCode ?? m.id] as const] : [])] as const
    : [['Mobile Number', maskedMobile(m.mobileNumber)], [employeeLabels.person, m.employeeName], [employeeLabels.id, m.employeeCode], ...(m.meetingCode || m.id ? [['Meeting ID', m.meetingCode ?? m.id] as const] : []), ['Joined With', m.aloneWith]] as const;
  return <View style={styles.detailsWrap}>
    <View style={styles.overviewGrid}>{overviewFields.map(([label, field], index) => <View key={label} style={[styles.overviewCard, [styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.overviewStatusCard][index]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={[styles.overviewValue, index === 3 && styles.overviewStatusText]}>{show(field)}</Text></View>)}</View>
    <View style={styles.contactGrid}>{contactFields.map(([label, field], index) => <View key={label} style={[styles.contactCard, [styles.toneSlate, styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.toneAmber][index % 5]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={styles.detailValue}>{show(field)}</Text></View>)}</View>
    <View style={styles.contextGrid}>{m.remarks || m.meetingRemarks ? <View style={[styles.contextCard, styles.remarksCard, styles.remarksWide]}><View style={styles.contextHeading}><Icon source="comment-text-outline" size={15} color="#A16207" /><Text style={styles.contextLabel}>REMARKS</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(m.remarks ?? m.meetingRemarks)}</Text></View> : null}{meetingPlace ? <View style={[styles.contextCard, styles.locationCard, styles.locationNarrow]}><View style={styles.contextHeading}><Icon source="map-marker-outline" size={15} color="#0F766E" /><Text style={styles.contextLabel}>MEETING LOCATION</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(meetingPlace)}</Text></View> : null}{mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={[styles.mapButton, styles.mapButtonCompact]}><Icon source="map-marker-radius" size={17} color="#FFFFFF" /><Text style={styles.mapButtonText}>Open in Google Maps</Text></Pressable> : null}</View>
  </View>;
}
function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) { const fields = [['Verified By', m.verifiedBy], ['Verification Date', m.meetingVerificationDate], ...FIELDS.map((field) => [field.label, m[field.key]] as const)]; return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View></View>; }
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
function State({ message, loading = false, progress = 10 }: { message: string; loading?: boolean; progress?: number }) {
  return <View style={styles.state}>
    {loading ? <LoadingProgressBar progress={progress} /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}
    <Text style={styles.stateText}>{message}</Text>
  </View>;
}
function CompactAssignmentCalendar({ visible, value, onDismiss, onSelect }: { visible: boolean; value: string; onDismiss: () => void; onSelect: (value: string) => void }) { const selected = value ? new Date(`${value}T12:00:00`) : new Date(); const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1)); useEffect(() => { if (visible) { const next = value ? new Date(`${value}T12:00:00`) : new Date(); setCursor(new Date(next.getFullYear(), next.getMonth(), 1)); } }, [value, visible]); const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const firstDay = (monthStart.getDay() + 6) % 7; const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate(); const cells = Array.from({ length: firstDay + days }, (_, index) => index < firstDay ? null : index - firstDay + 1); return <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}><View style={styles.dateBackdrop}><View style={styles.datePopover}><View style={styles.datePopoverHeader}><Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={styles.dateNav}><Icon source="chevron-left" size={19} color="#3156C8" /></Pressable><Text style={styles.datePopoverTitle}>{cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Text><View style={styles.datePopoverActions}><Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={styles.dateNav}><Icon source="chevron-right" size={19} color="#3156C8" /></Pressable><Pressable accessibilityLabel="Close calendar" onPress={onDismiss} style={styles.dateClose}><Icon source="close" size={17} color="#64748B" /></Pressable></View></View><View style={styles.dateWeekRow}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <Text key={day} style={styles.dateWeekday}>{day}</Text>)}</View><View style={styles.dateGrid}>{cells.map((day, index) => day === null ? <View key={`blank-${index}`} style={styles.dateCell} /> : <Pressable key={day} onPress={() => { onSelect(calendarDate(new Date(cursor.getFullYear(), cursor.getMonth(), day))); onDismiss(); }} style={({ pressed }) => [styles.dateCell, value === calendarDate(new Date(cursor.getFullYear(), cursor.getMonth(), day)) && styles.dateCellSelected, pressed && styles.pressed]}><Text style={[styles.dateCellText, value === calendarDate(new Date(cursor.getFullYear(), cursor.getMonth(), day)) && styles.dateCellTextSelected]}>{day}</Text></Pressable>)}</View></View></View></Modal>; }
function AssignLeadForm({ compact, form, setForm, assigning, message, salesPersonNamesByCode, onSubmit }: { compact: boolean; form: ReturnType<typeof emptyAssignForm>; setForm: (updater: (current: ReturnType<typeof emptyAssignForm>) => ReturnType<typeof emptyAssignForm>) => void; assigning: boolean; message: { type: 'success' | 'error'; text: string } | null; salesPersonNamesByCode: ReadonlyMap<string, string>; onSubmit: () => void }) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const fields = [['clientName', 'Client Name', 'e.g. Dr. Rajesh Kumar'], ['mobileNumber', 'Mobile Number', '10-digit mobile number'], ['location', 'Location', 'City or area'], ['clinicAddress', 'Clinic Address', 'Complete clinic address'], ['speciality', 'Speciality', 'e.g. Cardiologist'], ['bestTimeForMeeting', 'Best Time to Meet', 'Select best time'], ['salesPersonEmployeeCode', 'Employee Code', 'e.g. EMP000011']] as const;
  return <View style={styles.assignWrap}><View style={styles.assignIntro}><View style={styles.assignIntroIcon}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View><Text style={styles.assignIntroTitle}>Lead information</Text><Text style={styles.assignIntroText}>Enter the client details, meeting preference, assignment date and employee code.</Text></View></View><View style={styles.assignGrid}>{fields.map(([key, label, placeholder]) => <View key={key} style={[styles.assignField, key === 'salesPersonEmployeeCode' && styles.assignEmployeeField, compact && styles.assignFieldCompact]}><Text style={styles.assignLabel}>{label}</Text>{key === 'salesPersonEmployeeCode' ? <View style={styles.assignPickerShell}><Picker selectedValue={form.salesPersonEmployeeCode} onValueChange={(value) => setForm((current) => ({ ...current, salesPersonEmployeeCode: String(value) }))} style={styles.assignPicker}><Picker.Item label="Select employee code" value="" />{SALES_PERSON_CODES.map((code) => <Picker.Item key={code} label={`${code}${salesPersonNamesByCode.get(code) ? ` - ${salesPersonNamesByCode.get(code)}` : ''}`} value={code} />)}</Picker></View> : key === 'bestTimeForMeeting' ? <View style={styles.assignPickerShell}><Picker selectedValue={form.bestTimeForMeeting} onValueChange={(value) => setForm((current) => ({ ...current, bestTimeForMeeting: String(value) }))} style={styles.assignPicker}><Picker.Item label={placeholder} value="" /><Picker.Item label="9:00 AM - 12:00 PM" value="NINE_TO_TWELVE" /><Picker.Item label="12:00 PM - 3:00 PM" value="TWELVE_TO_THREE" /><Picker.Item label="3:00 PM - 6:00 PM" value="THREE_TO_SIX" /><Picker.Item label="6:00 PM - 9:00 PM" value="SIX_TO_NINE" /></Picker></View> : <TextInput value={form[key]} onChangeText={(text) => setForm((current) => ({ ...current, [key]: key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : text }))} placeholder={placeholder} placeholderTextColor="#A1A9B7" autoCapitalize="sentences" keyboardType={key === 'mobileNumber' ? 'phone-pad' : 'default'} style={styles.assignInput} />}</View>)}<View style={[styles.assignField, styles.assignDateField, compact && styles.assignFieldCompact]}><Text style={styles.assignLabel}>Assigned Date</Text><Pressable onPress={() => setDatePickerVisible(true)} style={styles.assignDatePicker}><Icon source="calendar-month-outline" size={18} color="#3156C8" /><Text style={styles.assignDatePickerText}>{form.assignedAt || 'Choose assigned date'}</Text><Icon source="chevron-down" size={18} color="#64748B" /></Pressable></View><View style={[styles.assignActionField, compact && styles.assignFieldCompact]}><Pressable disabled={assigning} onPress={onSubmit} style={({ pressed }) => [styles.assignButton, assigning && styles.disabled, pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={styles.assignButtonText}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View></View>{message ? <View style={[styles.assignFeedback, message.type === 'success' ? styles.assignSuccess : styles.assignError]}><Icon source={message.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={message.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.assignFeedbackText, message.type === 'error' && styles.assignErrorText]}>{message.text}</Text></View> : null}<CompactAssignmentCalendar visible={datePickerVisible} value={form.assignedAt} onDismiss={() => setDatePickerVisible(false)} onSelect={(assignedAt) => setForm((current) => ({ ...current, assignedAt }))} /></View>;
}
function HeaderLeadFilters({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter, dateRange, setDateRange, search, setSearch }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void; dateRange: AssignedDateRange; setDateRange: (value: AssignedDateRange) => void; search: string; setSearch: (value: string) => void }) {
  const compact = useWindowDimensions().width < 760;
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState<AssignedDateRange>(dateRange);
  const [dateTarget, setDateTarget] = useState<'from' | 'to' | null>(null);
  const coordinators = [...new Set(leads.map((lead) => lead.assignedByEmployeeName).filter(Boolean))] as string[];
  const salesPeople = [...new Set(leads.filter((lead) => !coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter).map((lead) => lead.assignedEmployeeName).filter(Boolean))] as string[];
  const rangeLabel = dateRange.from || dateRange.to ? `${dateRange.from || '...'} to ${dateRange.to || '...'}` : 'All assigned dates';
  const openDateRange = () => { setDraftDateRange(dateRange); setDateTarget(null); setDatePickerVisible(true); };
  return <><View style={[styles.headerLeadFilters, compact && styles.headerLeadFiltersCompact]}><TextInput value={search} onChangeText={setSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} /><View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Pressable onPress={openDateRange} style={[styles.headerLeadDatePicker, compact && styles.headerLeadPickerCompact]}><Icon source="calendar-month-outline" size={15} color="#BFD1FF" /><Text numberOfLines={1} style={styles.headerLeadDateText}>{rangeLabel}</Text>{dateRange.from || dateRange.to ? <Pressable accessibilityLabel="Clear assigned date range" hitSlop={8} onPress={() => setDateRange({ from: '', to: '' })}><Icon source="close-circle" size={15} color="#BFD1FF" /></Pressable> : <Icon source="chevron-down" size={15} color="#BFD1FF" />}</Pressable></View><View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Icon source="account-tie-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker selectedValue={coordinatorFilter} onValueChange={(value) => { setCoordinatorFilter(String(value)); setSalesPersonFilter(''); }} style={styles.headerLeadPickerControl}><Picker.Item label="All Coordinators" value="" />{coordinators.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View><View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact, !coordinatorFilter && styles.headerLeadPickerDisabled]}><Icon source="account-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker enabled={Boolean(coordinatorFilter)} selectedValue={salesPersonFilter} onValueChange={(value) => setSalesPersonFilter(String(value))} style={styles.headerLeadPickerControl}><Picker.Item label={coordinatorFilter ? 'All Sales Persons' : 'Choose salesperson'} value="" />{salesPeople.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View></View><Modal transparent visible={datePickerVisible} animationType="fade" onRequestClose={() => setDatePickerVisible(false)}><Pressable style={styles.filterBackdrop} onPress={() => setDatePickerVisible(false)}><Pressable style={styles.filterPopover} onPress={() => undefined}><View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>ASSIGNED DATE RANGE</Text><Text style={styles.filterPopoverHint}>Choose a start and end date</Text></View><Pressable onPress={() => setDatePickerVisible(false)}><Icon source="close" size={18} color="#64748B" /></Pressable></View><View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{draftDateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar key={`${dateTarget}-${draftDateRange[dateTarget]}`} value={draftDateRange[dateTarget]} onSelect={(value) => { setDraftDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View><View style={styles.filterActions}><Pressable onPress={() => { setDraftDateRange({ from: '', to: '' }); setDateTarget(null); }} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable><Pressable onPress={() => { setDateRange(draftDateRange); setDatePickerVisible(false); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable></View></Pressable></Pressable></Modal></>;
}
function AssignedLeadCards({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter, dateRange, onOpen }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void; dateRange: AssignedDateRange; onOpen: (lead: LeadResponse) => void }) {
  const compact = useWindowDimensions().width < 760;
  const visible = leads.filter((lead) => (!coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter) && (!salesPersonFilter || lead.assignedEmployeeName === salesPersonFilter) && matchesAssignedDate(lead.assignedAt, dateRange));
  return <View style={[styles.assignedLeadWrap, compact && styles.assignedLeadWrapCompact]}><View style={[styles.assignedLeadGrid, compact && styles.assignedLeadGridCompact]}>{visible.length ? visible.map((lead) => <Pressable key={lead.leadId ?? lead.leadCode} onPress={() => void onOpen(lead)} style={({ pressed }) => [styles.assignedLeadCard, compact && styles.assignedLeadCardCompact, [styles.leadToneBlue, styles.leadToneTeal, styles.leadToneViolet, styles.leadToneAmber][leadCardTone(lead)], pressed && styles.pressed]}><View style={styles.assignedLeadTop}><View style={styles.assignedLeadCopy}><Text numberOfLines={1} style={styles.assignedLeadName}>{show(lead.clientName)}</Text><Text style={styles.assignedLeadMeta}>{leadRole(lead)}</Text></View><View style={styles.leadStatusPill}><Text style={styles.leadStatusPillText}>{show(lead.leadStatus).replace(/_/g, ' ')}</Text></View></View><View style={styles.assignedLeadDivider} /><View style={[styles.assignedLeadDetails, compact && styles.assignedLeadDetailsCompact]}><View><Text style={styles.assignLabel}>ASSIGNED TO</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedEmployeeName)}</Text></View><View><Text style={styles.assignLabel}>ASSIGNED DATE</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedAt)}</Text></View><View><Text style={styles.assignLabel}>LAST MEETING / VERIFIED</Text><Text style={styles.assignedLeadValue}>{show(lead.audit?.updatedAt)}</Text></View></View></Pressable>) : <State message="No assigned leads match these filters." />}</View></View>;
}
function LeadHistoryContent({ lead, meetings, loading, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; error: string | null }) { const assignment = [['Assigned by', lead.assignedByEmployeeName], ['Assigned to', lead.assignedEmployeeName], ['Assigned at', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]]; const details = [['Mobile number', maskedMobile(lead.mobileNumber)], ['Location', lead.location], ['Clinic address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead code', lead.leadCode], ['Remarks', lead.remarks]]; return <View style={styles.historyWrap}><Text style={styles.sectionTitle}>Assignment</Text><View style={styles.detailGrid}>{assignment.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View><Text style={styles.sectionTitle}>Lead details</Text><View style={styles.detailGrid}>{details.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View><View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading…' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <State loading message="Loading lead history…" /> : meetings.length ? <View style={styles.timeline}>{meetings.map((meeting, index) => <View key={meeting.meetingCode ?? `${meeting.id ?? index}`} style={styles.timelineItem}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < meetings.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCard}><View style={styles.timelineTop}><Text style={styles.timelineTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={styles.timelineStatus}>{show(meeting.meetingStatus ?? meeting.leadStatus).replace(/_/g, ' ')}</Text></View><Text style={styles.timelineMeta}>{show(meeting.meetingDate)}{meeting.meetingTime ? ` · ${timeText(meeting.meetingTime)}` : ''}{meeting.employeeName ? ` · ${meeting.employeeName}` : ''}</Text><Text style={styles.timelineValue}>Remarks: {show(meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion)}</Text><Text style={styles.timelineValue}>Location: {show(meeting.meetingLocation ?? meeting.location ?? meeting.address)}</Text>{meeting.nextMeetingDate ? <Text style={styles.timelineValue}>Next plan: {meeting.nextMeetingDate}</Text> : null}{meeting.verifiedBy ? <Text style={styles.timelineValue}>Verified by: {meeting.verifiedBy}{meeting.meetingVerificationDate ? ` · ${meeting.meetingVerificationDate}` : ''}</Text> : null}</View></View>)}</View> : <State message="No meeting history is available for this lead yet." />}</View>; }
function LeadHistoryContentEnhanced({ lead, meetings, loading, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; error: string | null }) {
  const assignment = [['Assigned by', lead.assignedByEmployeeName], ['Assigned to', lead.assignedEmployeeName], ['Assigned at', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const latest = meetings.find((meeting) => ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()) && (meeting.remarks || meeting.meetingRemarks || meeting.discussion));
  const details = [['Mobile number', maskedMobile(lead.mobileNumber)], ['Location', lead.location], ['Clinic address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead code', lead.leadCode], ['Latest remarks', latest?.remarks ?? latest?.meetingRemarks ?? latest?.discussion ?? lead.remarks]];
  return <View style={styles.historyWrap}><Text style={styles.sectionTitle}>Assignment</Text><View style={styles.detailGrid}>{assignment.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View><Text style={styles.sectionTitle}>Lead details</Text><View style={styles.detailGrid}>{details.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View><View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <State loading message="Loading lead history..." /> : meetings.length ? <View style={styles.timeline}>{meetings.map((meeting, index) => { const completed = ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()); const remark = meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion; const fields = [['Meeting ID', meeting.meetingCode], ['Mode', meeting.meetingMode], ['Lead status', meeting.leadStatus?.replace(/_/g, ' ')], ['Next plan date', meeting.nextMeetingDate], ['Joined with', meeting.aloneWith], ['Person name', meeting.personName], ['Position', meeting.position], ['Verified by', meeting.verifiedBy], ['Verification date', meeting.meetingVerificationDate], ['Verification remarks', meeting.verificationRemarks], ['PC meeting time', meeting.meetingTiming], ['Age group', meeting.ageGroup], ['Prior investment', meeting.existingSip], ['Profession', meeting.profession], ['Firm / clinic', meeting.professionDetail], ['Best time', meeting.bestTimeForMeeting], ['Meeting with', meeting.meetingWith]].filter(([, value]) => value !== undefined && value !== null && value !== ''); const mapUrl = mapUrlFor(meeting); return <View key={meeting.meetingCode ?? `${meeting.id ?? index}`} style={styles.timelineItem}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < meetings.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCard}><View style={styles.timelineTop}><Text style={styles.timelineTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={styles.timelineStatus}>{show(meeting.meetingStatus ?? meeting.leadStatus).replace(/_/g, ' ')}</Text></View><Text style={styles.timelineMeta}>{show(meeting.meetingDate)}{meeting.meetingTime ? ` · ${timeText(meeting.meetingTime)}` : ''}{meeting.employeeName ? ` · ${meeting.employeeName}` : ''}</Text>{completed && remark ? <View style={styles.timelineRemark}><Text style={styles.timelineRemarkLabel}>MEETING REMARKS</Text><Text style={styles.timelineValue}>{remark}</Text></View> : null}<View style={styles.timelineInfo}>{fields.map(([label, value]) => <View key={label} style={styles.timelineInfoCell}><Text style={styles.label}>{label}</Text><Text style={styles.timelineValue}>{show(value)}</Text></View>)}</View>{(meeting.meetingLocation || meeting.location || meeting.address || mapUrl) ? <View style={styles.timelineLocation}><Text style={styles.label}>LIVE MEETING LOCATION</Text><Text style={styles.timelineValue}>{show(meeting.meetingLocation ?? meeting.location ?? meeting.address)}</Text>{meeting.latitude != null && meeting.longitude != null ? <Text style={styles.timelineValue}>Coordinates: {meeting.latitude}, {meeting.longitude}</Text> : null}{meeting.locationAccuracy != null ? <Text style={styles.timelineValue}>Accuracy: {meeting.locationAccuracy} m</Text> : null}{mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.historyMapButton}><Icon source="map-marker-radius" size={15} color="#FFFFFF" /><Text style={styles.historyMapButtonText}>Open map</Text></Pressable> : null}</View> : null}</View></View>; })}</View> : <State message="No meeting history is available for this lead yet." />}</View>;
}
function LeadHistoryContentCompact({ lead, meetings, loading, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; error: string | null }) {
  const verifiedMeeting = meetings.find((meeting) => meeting.verificationStatus === 'VERIFIED' || Boolean(meeting.verifiedBy)); const latestRemark = meetings.find((meeting) => ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()) && (meeting.remarks || meeting.meetingRemarks || meeting.discussion));
  const leadFields = [['Mobile number', maskedMobile(lead.mobileNumber)], ['Location', lead.location], ['Clinic address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead code', lead.leadCode], ['Latest remarks', latestRemark?.remarks ?? latestRemark?.meetingRemarks ?? latestRemark?.discussion ?? lead.remarks]];
  const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Sales coordinator', lead.assignedByEmployeeName], ['SC ID', lead.assignedByEmployeeCode], ['Assigned date', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting], ['Person name', verifiedMeeting.personName], ['Position', verifiedMeeting.position]].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const section = (title: string, fields: (string | undefined)[][]) => <><Text style={styles.sectionTitle}>{title}</Text><View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail]}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View></>;
  return <View style={styles.historyWrap}>{section('Lead details', leadFields)}{section('Assignment details', assignmentFields)}<Text style={styles.sectionTitle}>SC verification details</Text>{scFields.length ? <View style={styles.compactDetailGrid}>{scFields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail]}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View> : <Text style={styles.historyEmpty}>SC verification details are not available yet.</Text>}<View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <State loading message="Loading lead history..." /> : meetings.length ? <View style={styles.compactTimeline}>{meetings.map((meeting, index) => { const completed = ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()); const remark = completed ? meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion : null; return <View key={meeting.meetingCode ?? `${meeting.id ?? index}`} style={styles.compactTimelineCard}><View style={styles.timelineTop}><View><Text style={styles.timelineTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={styles.timelineMeta}>{show(meeting.meetingDate)}</Text></View><Text style={styles.timelineStatus}>{show(meeting.meetingStatus ?? meeting.leadStatus).replace(/_/g, ' ')}</Text></View>{remark ? <Text style={styles.compactRemark}>{remark}</Text> : null}</View>; })}</View> : <State message="No meeting history is available for this lead yet." />}</View>;
}
function LeadHistoryContentPretty({ lead, meetings, loading, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; error: string | null }) {
  const verifiedMeeting = meetings.find((meeting) => meeting.verificationStatus === 'VERIFIED' || Boolean(meeting.verifiedBy) || Boolean(meeting.meetingVerificationDate) || Boolean(meeting.ageGroup) || Boolean(meeting.profession));
  const latest = meetings.find((meeting) => ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()) && (meeting.remarks || meeting.meetingRemarks || meeting.discussion));
  const latestRemarks = latest?.remarks ?? latest?.meetingRemarks ?? latest?.discussion ?? lead.remarks;
  const liveLocationUrl = meetings.map(mapUrlFor).find(Boolean);
  const leadFields = [['Mobile number', maskedMobile(lead.mobileNumber)], ['Location', lead.location], ['Clinic address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead code', lead.leadCode]];
  const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Sales coordinator', lead.assignedByEmployeeName], ['SC ID', lead.assignedByEmployeeCode], ['Assigned date', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['PC meeting time', verifiedMeeting.meetingTiming], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting], ['Meeting with', verifiedMeeting.meetingWith], ['Person name', verifiedMeeting.personName], ['Position', verifiedMeeting.position]].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const section = (title: string, icon: string, fields: (string | undefined)[][], tone: 'lead' | 'assignment' | 'verification') => <View style={[styles.historySection, tone === 'lead' ? styles.historyLeadSection : tone === 'assignment' ? styles.historyAssignmentSection : styles.historyVerificationSection]}><View style={styles.historySectionTitle}><View style={styles.historySectionIcon}><Icon source={icon} size={15} color={tone === 'lead' ? '#3156C8' : tone === 'assignment' ? '#0F766E' : '#7C3AED'} /></View><Text style={styles.historySectionText}>{title}</Text></View><View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, styles.historyDetail]}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View></View>;
  return <View style={styles.historyWrap}>{section('Lead details', 'account-details-outline', leadFields, 'lead')}{section('Assignment details', 'account-arrow-right-outline', assignmentFields, 'assignment')}<View style={[styles.historySection, styles.historyVerificationSection]}><View style={styles.historySectionTitle}><View style={styles.historySectionIcon}><Icon source="clipboard-check-outline" size={15} color="#7C3AED" /></View><Text style={styles.historySectionText}>SC verification details</Text></View>{scFields.length ? <View style={styles.compactDetailGrid}>{scFields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, styles.historyDetail]}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View> : <Text style={styles.historyEmpty}>SC verification details are not available yet.</Text>}</View><View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <State loading message="Loading lead history..." /> : meetings.length ? <View style={styles.compactTimeline}>{meetings.map((meeting, index) => { const completed = ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()); const remark = completed ? meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion : null; return <View key={meeting.meetingCode ?? `${meeting.id ?? index}`} style={[styles.compactTimelineCard, index % 2 === 1 && styles.compactTimelineCardAlt]}><View style={styles.timelineTop}><View><Text style={styles.timelineTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={styles.timelineMeta}>{show(meeting.meetingDate)}</Text></View><Text style={styles.timelineStatus}>{show(meeting.meetingStatus ?? meeting.leadStatus).replace(/_/g, ' ')}</Text></View>{meeting.meetingTiming ? <Text style={styles.compactMeetingField}>Meeting time: {meeting.meetingTiming}</Text> : null}{meeting.meetingWith ? <Text style={styles.compactMeetingField}>Joined with: {meeting.meetingWith.replace(/_/g, ' ')}</Text> : null}{remark ? <Text style={styles.compactRemark}>{remark}</Text> : null}</View>; })}</View> : <State message="No meeting history is available for this lead yet." />}</View>;
}
function LeadHistoryContentStable({ lead, meetings, loading, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; error: string | null }) {
  const verifiedMeeting = meetings.find((meeting) => meeting.verificationStatus === 'VERIFIED' || Boolean(meeting.verifiedBy) || Boolean(meeting.meetingVerificationDate) || Boolean(meeting.ageGroup) || Boolean(meeting.profession));
  const latest = meetings.find((meeting) => ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()) && (meeting.remarks || meeting.meetingRemarks || meeting.discussion));
  const latestRemarks = latest?.remarks ?? latest?.meetingRemarks ?? latest?.discussion ?? lead.remarks;
  const liveLocationUrl = meetings.map(mapUrlFor).find(Boolean);
  const leadFields = [['Mobile number', maskedMobile(lead.mobileNumber)], ['Location', lead.location], ['Clinic address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead code', lead.leadCode]];
  const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Sales coordinator', lead.assignedByEmployeeName], ['SC ID', lead.assignedByEmployeeCode], ['Assigned date', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting], ['Person name', verifiedMeeting.personName], ['Position', verifiedMeeting.position]].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const section = (title: string, fields: (string | undefined)[][], tone: 'lead' | 'assignment' | 'verification') => <View style={[historyStyles.section, tone === 'lead' ? historyStyles.leadSection : tone === 'assignment' ? historyStyles.assignmentSection : historyStyles.verificationSection]}><Text style={historyStyles.sectionTitle}>{title}</Text><View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, historyStyles.detail]}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View>{tone === 'lead' ? <View style={historyStyles.latestRow}><View style={historyStyles.latestRemarks}><Text style={styles.label}>LATEST REMARKS</Text><Text numberOfLines={2} style={styles.detailValue}>{show(latestRemarks)}</Text></View><Pressable disabled={!liveLocationUrl} onPress={() => { if (liveLocationUrl) void Linking.openURL(liveLocationUrl); }} style={[historyStyles.liveLocationButton, !liveLocationUrl && historyStyles.liveLocationDisabled]}><Icon source="map-marker-radius" size={16} color="#FFFFFF" /><Text style={historyStyles.liveLocationText}>Live location</Text></Pressable></View> : null}</View>;
  return <View style={styles.historyWrap}>{section('Lead details', leadFields, 'lead')}{section('Assignment details', assignmentFields, 'assignment')}{section('SC verification details', scFields, 'verification')}<View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <State loading message="Loading lead history..." /> : meetings.length ? <View style={historyStyles.meetingList}>{meetings.map((meeting, index) => { const completed = ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()); const remark = completed ? meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion : null; return <View key={meeting.meetingCode ?? `${meeting.id ?? index}`} style={[historyStyles.meetingRow, index % 2 === 1 && historyStyles.meetingRowAlt]}><View style={historyStyles.meetingTitleBlock}><Text style={historyStyles.meetingTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={historyStyles.meetingDate}>{show(meeting.meetingDate)}</Text></View><Text style={historyStyles.meetingField}>{meeting.meetingTiming ? `Time: ${meeting.meetingTiming}` : ''}</Text><Text style={historyStyles.meetingField}>{meeting.meetingWith ? `Joined: ${meeting.meetingWith.replace(/_/g, ' ')}` : ''}</Text><Text style={historyStyles.meetingStatus}>{show(meeting.meetingStatus ?? meeting.leadStatus).replace(/_/g, ' ')}</Text>{remark ? <Text numberOfLines={1} style={historyStyles.meetingRemark}>{remark}</Text> : null}</View>; })}</View> : <State message="No meeting history is available for this lead yet." />}</View>;
}
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
  return (
    <View style={[historyStyles.meetingCard, alternate && historyStyles.meetingCardAlt]}>
      <View style={historyStyles.meetingCardTop}>
        <View style={historyStyles.meetingTitleBlock}>
          <Text style={historyStyles.meetingTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text>
          <Text style={historyStyles.meetingDate}>{show(meeting.meetingDate)}</Text>
        </View>
        <Text style={[historyStyles.meetingStatus, statusStyle]}>{status}</Text>
      </View>
      {tags.length ? (
        <View style={historyStyles.meetingTagsRow}>
          {tags.map((tag) => (
            <View key={tag.key} style={[historyStyles.meetingTag, tag.style]}>
              <Icon source={tag.icon} size={11} color={tag.color} />
              <Text style={[historyStyles.meetingTagText, { color: tag.color }]}>{tag.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {remark ? (
        <View style={historyStyles.meetingRemarkBlock}>
          <Text style={historyStyles.meetingRemarkLabel}>REMARKS</Text>
          <Text style={historyStyles.meetingRemarkText}>{remark}</Text>
        </View>
      ) : null}
    </View>
  );
}
function LeadHistoryContentStyled({ lead, meetings, loading, progress, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; progress: number; error: string | null }) { const verifiedMeeting = meetings.find((meeting) => meeting.verificationStatus === 'VERIFIED' || Boolean(meeting.verifiedBy) || Boolean(meeting.meetingVerificationDate) || Boolean(meeting.ageGroup) || Boolean(meeting.profession)); const latest = meetings.find((meeting) => ['COMPLETED', 'VERIFIED'].includes(String(meeting.meetingStatus ?? meeting.verificationStatus ?? '').toUpperCase()) && (meeting.remarks || meeting.meetingRemarks || meeting.discussion)); const latestRemarks = latest?.remarks ?? latest?.meetingRemarks ?? latest?.discussion ?? lead.remarks; const liveLocationUrl = meetings.map(mapUrlFor).find(Boolean); const leadFields = [['Mobile number', maskedMobile(lead.mobileNumber)], ['Location', lead.location], ['Clinic address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead code', lead.leadCode]]; const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Sales coordinator', lead.assignedByEmployeeName], ['SC ID', lead.assignedByEmployeeCode], ['Assigned date', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]]; const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting]].filter(([, value]) => value !== undefined && value !== null && value !== '') : []; const section = (title: string, fields: (string | undefined)[][], tone: 'lead' | 'assignment' | 'verification') => <View style={[historyStyles.section, tone === 'lead' ? historyStyles.leadSection : tone === 'assignment' ? historyStyles.assignmentSection : historyStyles.verificationSection]}><Text style={historyStyles.sectionTitle}>{title}</Text><View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, historyStyles.detail]}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View>{tone === 'lead' ? <View style={historyStyles.latestRow}><View style={historyStyles.latestRemarks}><Text style={styles.label}>LATEST REMARKS</Text><Text numberOfLines={2} style={styles.detailValue}>{show(latestRemarks)}</Text></View><Pressable disabled={!liveLocationUrl} onPress={() => { if (liveLocationUrl) void Linking.openURL(liveLocationUrl); }} style={[historyStyles.liveLocationButton, !liveLocationUrl && historyStyles.liveLocationDisabled]}><Icon source="map-marker-radius" size={16} color="#FFFFFF" /><Text style={historyStyles.liveLocationText}>Live location</Text></Pressable></View> : null}</View>; return <View style={styles.historyWrap}>{section('Lead details', leadFields, 'lead')}{section('Assignment details', assignmentFields, 'assignment')}{section('SC verification details', scFields, 'verification')}<View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <State loading progress={progress} message="Loading lead history..." /> : meetings.length ? <View style={historyStyles.meetingList}>{meetings.map((meeting, index) => <MeetingHistoryRow key={meeting.meetingCode ?? `${meeting.id ?? index}`} meeting={meeting} alternate={index % 2 === 1} />)}</View> : <State message="No meeting history is available for this lead yet." />}</View>; }
const historyStyles = StyleSheet.create({
  section: { gap: 5, padding: 7, borderWidth: 1, borderRadius: 10 },
  leadSection: { borderColor: '#D6E3FC', backgroundColor: '#F5F8FF' },
  assignmentSection: { borderColor: '#CDECE5', backgroundColor: '#F2FCF9' },
  verificationSection: { borderColor: '#E4DAFC', backgroundColor: '#F9F7FF' },
  sectionTitle: { color: '#1E3A8A', fontSize: 10, fontWeight: '900' },
  detail: { width: undefined, minWidth: 0, flexBasis: 0, flexGrow: 1, paddingHorizontal: 7, paddingVertical: 4, borderColor: '#E1E8F3', backgroundColor: 'rgba(255,255,255,0.76)' },
  latestRow: { flexDirection: 'row', gap: 7 },
  latestRemarks: { flex: 70, minWidth: 0, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#E1E8F3', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.76)' },
  liveLocationButton: { flex: 30, minWidth: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#0F766E' },
  liveLocationDisabled: { opacity: 0.48 },
  liveLocationText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  meetingList: { gap: 5 },
  meetingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#DCE5F3', borderRadius: 10, backgroundColor: '#F7F9FE' },
  meetingRowAlt: { borderColor: '#D8EDE7', backgroundColor: '#F4FBF8' },
  meetingMain: { minWidth: 0, flex: 66, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  meetingMainFull: { flex: 1 },
  meetingTitleBlock: { minWidth: 120, marginRight: 2 },
  meetingTitle: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' },
  meetingDate: { color: '#64748B', fontSize: 8, fontWeight: '700' },
  meetingField: { color: '#475569', fontSize: 8, fontWeight: '800' },
  timePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, color: '#1D4ED8', backgroundColor: '#EAF1FF' },
  joinPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, color: '#0F766E', backgroundColor: '#E7F8F3' },
  personPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, color: '#7C3AED', backgroundColor: '#F1EAFE' },
  positionPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, color: '#9A3412', backgroundColor: '#FFF0E7' },
  meetingStatus: { marginLeft: 0, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, fontSize: 7, fontWeight: '900' },
  statusCompleted: { color: '#15803D', backgroundColor: '#DCFCE7' },
  statusScheduled: { color: '#2563EB', backgroundColor: '#DBEAFE' },
  statusPending: { color: '#B45309', backgroundColor: '#FEF3C7' },
  meetingRemarkSide: { minWidth: 0, flex: 34, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#D8E1EE' },
  meetingRemarkLabel: { color: '#64748B', fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  meetingRemark: { marginTop: 2, color: '#334155', fontSize: 9, fontWeight: '600', lineHeight: 12 },
  meetingCard: { gap: 9, padding: 12, borderWidth: 1, borderColor: '#DCE5F3', borderRadius: 12, backgroundColor: '#F7F9FE' },
  meetingCardAlt: { borderColor: '#D8EDE7', backgroundColor: '#F4FBF8' },
  meetingCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  meetingTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meetingTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  tagTime: { backgroundColor: '#EAF1FF' },
  tagJoin: { backgroundColor: '#E7F8F3' },
  tagPerson: { backgroundColor: '#F1EAFE' },
  tagPosition: { backgroundColor: '#FFF0E7' },
  meetingTagText: { fontSize: 8, fontWeight: '800' },
  meetingRemarkBlock: { gap: 3, padding: 9, borderRadius: 9, backgroundColor: '#FFF8E8' },
  meetingRemarkText: { color: '#334155', fontSize: 9.5, fontWeight: '600', lineHeight: 14 },
});
const styles = StyleSheet.create({
  taskToolbarWrap: { flexShrink: 0, paddingHorizontal: 10, paddingTop: 10, backgroundColor: '#FFFFFF' }, headerSearch: { width: 155, height: 32, paddingHorizontal: 10, borderWidth: 1, borderColor: '#91A7E0', borderRadius: 7, color: '#FFFFFF', fontSize: 9, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.12)' }, headerSearchCompact: { width: '100%', height: 38, fontSize: 11 },
  assignedHeaderActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 9 }, assignedHeaderActionsCompact: { width: '100%', flexDirection: 'column', alignItems: 'stretch' }, headerLeadFilters: { flexDirection: 'row', gap: 7 }, headerLeadFiltersCompact: { width: '100%', flexDirection: 'column', gap: 7 }, headerLeadFilter: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5 }, headerLeadFilterCompact: { width: '100%' }, headerLeadPicker: { width: 140, height: 34, overflow: 'hidden', borderWidth: 1, borderColor: '#D9E4FF', borderRadius: 10, backgroundColor: '#FFFFFF' }, headerLeadPickerCompact: { flex: 1, width: undefined }, headerLeadPickerDisabled: { opacity: 0.5 }, headerLeadPickerControl: { height: 34, color: '#1E3A8A', fontSize: 9, fontWeight: '800' }, headerLeadDatePicker: { width: 190, height: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#BFD1FF', borderRadius: 10, backgroundColor: '#F9FBFF' }, headerLeadDateText: { minWidth: 0, flex: 1, color: '#1E3A8A', fontSize: 9, fontWeight: '900' },
  leadToneBlue: { borderTopColor: '#3156C8', borderLeftColor: '#3156C8' }, leadToneTeal: { borderTopColor: '#0F8C7F', borderLeftColor: '#0F8C7F' }, leadToneViolet: { borderTopColor: '#7C3AED', borderLeftColor: '#7C3AED' }, leadToneAmber: { borderTopColor: '#D97706', borderLeftColor: '#D97706' },
  assignedLeadWrap: { gap: 10, padding: 12 }, assignedLeadWrapCompact: { padding: 10 }, coordinatorFilterCard: { display: 'none', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderWidth: 1, borderColor: '#D8E3FB', borderRadius: 12, backgroundColor: '#F6F8FF' }, coordinatorFilterIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E3EBFF' }, coordinatorFilterCopy: { minWidth: 0, flex: 1 }, coordinatorFilterTitle: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' }, coordinatorFilterHint: { marginTop: 2, color: '#71809A', fontSize: 8, fontWeight: '700' }, coordinatorPicker: { width: 220, height: 40, overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 9, backgroundColor: '#FFFFFF' }, coordinatorPickerDisabled: { opacity: 0.5, backgroundColor: '#F1F5F9' }, assignedLeadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, assignedLeadGridCompact: { flexDirection: 'column', flexWrap: 'nowrap', gap: 10 }, assignedLeadCard: { width: '32.5%', minWidth: 0, flexGrow: 0, gap: 8, padding: 11, borderWidth: 1, borderTopWidth: 2, borderTopColor: '#3156C8', borderLeftWidth: 4, borderLeftColor: '#3156C8', borderColor: '#DCE3ED', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, assignedLeadCardCompact: { width: '100%', minHeight: 128, padding: 13 }, assignedLeadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, assignedLeadAvatar: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E8EEFF' }, assignedLeadAvatarText: { color: '#3156C8', fontSize: 11, fontWeight: '900' }, assignedLeadCopy: { minWidth: 0, flex: 1 }, assignedLeadName: { color: '#28447F', fontSize: 11, fontWeight: '800' }, assignedLeadMeta: { marginTop: 3, color: '#71809A', fontSize: 8, fontWeight: '600' }, assignedLeadValue: { marginTop: 3, color: '#42536F', fontSize: 9, fontWeight: '700' }, assignedLeadDivider: { height: 1, backgroundColor: '#E8EDF4' }, assignedLeadDetails: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, assignedLeadDetailsCompact: { flexDirection: 'column', gap: 7 }, leadStatusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: '#FFF7E8' }, leadStatusPillText: { color: '#A95A08', fontSize: 7, fontWeight: '900' },
  assignPickerShell: { height: 42, overflow: 'hidden', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' },
  assignPicker: { height: 42, color: '#172033', fontSize: 11, fontWeight: '700' },
  detailsWrap: { gap: 11 }, historyWrap: { gap: 9 }, historySection: { gap: 8, padding: 10, borderWidth: 1, borderRadius: 12 }, historyLeadSection: { borderColor: '#D6E3FC', backgroundColor: '#F5F8FF' }, historyAssignmentSection: { borderColor: '#CDECE5', backgroundColor: '#F2FCF9' }, historyVerificationSection: { borderColor: '#E4DAFC', backgroundColor: '#F9F7FF' }, historySectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 }, historySectionIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FFFFFF' }, historySectionText: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' }, compactDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, compactDetail: { width: '23%', minWidth: 130, flexGrow: 1, paddingHorizontal: 8, paddingVertical: 6 }, historyDetail: { borderColor: '#E1E8F3', backgroundColor: 'rgba(255,255,255,0.76)' }, historyEmpty: { color: '#64748B', fontSize: 9, fontWeight: '700' }, historyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, historyCount: { color: '#64748B', fontSize: 9, fontWeight: '800' }, compactTimeline: { gap: 5 }, compactTimelineCard: { position: 'relative', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2, paddingHorizontal: 9, paddingVertical: 6, paddingRight: 96, borderWidth: 1, borderColor: '#DCE5F3', borderRadius: 10, backgroundColor: '#F7F9FE' }, compactTimelineCardAlt: { borderColor: '#D8EDE7', backgroundColor: '#F4FBF8' }, compactMeetingField: { color: '#475569', fontSize: 8, fontWeight: '800' }, compactRemark: { width: '100%', color: '#334155', fontSize: 9, fontWeight: '600', lineHeight: 12 }, timeline: { gap: 0 }, timelineItem: { flexDirection: 'row', minHeight: 92 }, timelineRail: { width: 24, alignItems: 'center' }, timelineDot: { width: 11, height: 11, marginTop: 12, borderRadius: 6, backgroundColor: '#3156C8', borderWidth: 3, borderColor: '#DBEAFE' }, timelineLine: { width: 2, flex: 1, marginVertical: 3, backgroundColor: '#D6E1F7' }, timelineCard: { minWidth: 0, flex: 1, gap: 7, marginBottom: 10, padding: 11, borderWidth: 1, borderColor: '#DCE5F3', borderRadius: 12, backgroundColor: '#F8FAFF' }, timelineTop: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, timelineTitle: { minWidth: 0, flex: 1, color: '#1E3A8A', fontSize: 11, fontWeight: '900' }, timelineStatus: { position: 'absolute', top: 8, right: 9, maxWidth: '46%', paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', borderRadius: 99, color: '#A95A08', fontSize: 7, fontWeight: '900', backgroundColor: '#FFF7E8' }, timelineMeta: { color: '#64748B', fontSize: 7, fontWeight: '700' }, timelineValue: { color: '#334155', fontSize: 9, fontWeight: '600', lineHeight: 13 }, timelineRemark: { gap: 3, padding: 8, borderRadius: 8, backgroundColor: '#FFF8E8' }, timelineRemarkLabel: { color: '#A95A08', fontSize: 7, fontWeight: '900', letterSpacing: 0.45 }, timelineInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, timelineInfoCell: { minWidth: 135, flex: 1, gap: 2, padding: 7, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' }, timelineLocation: { gap: 3, padding: 8, borderWidth: 1, borderColor: '#BEE8DE', borderRadius: 8, backgroundColor: '#F0FDFA' }, historyMapButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: '#0F766E' }, historyMapButtonText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  toneBlue: { borderColor: '#DCE3ED', backgroundColor: '#F8FAFC' }, toneViolet: { borderColor: '#DCE3ED', backgroundColor: '#F8FAFC' }, toneTeal: { borderColor: '#DCE3ED', backgroundColor: '#F8FAFC' }, toneAmber: { borderColor: '#DCE3ED', backgroundColor: '#F8FAFC' }, toneSlate: { borderColor: '#DCE3ED', backgroundColor: '#F8FAFC' },
  fieldToneBlue: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }, fieldToneTeal: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }, fieldToneViolet: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }, fieldToneAmber: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  overviewCard: { minWidth: 145, flex: 1, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#D7E0FA', borderRadius: 10, backgroundColor: '#F3F6FF' },
  overviewStatusCard: { borderColor: '#F5D9AA', backgroundColor: '#FFF8EC' },
  overviewValue: { marginTop: 3, color: '#1E3A8A', fontSize: 10, fontWeight: '900' },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  contactCard: { minWidth: 130, flex: 1, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, backgroundColor: '#F8FAFC' },
  meetingOverview: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 11, backgroundColor: '#F2F5FF' },
  overviewIcon: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#DFE7FF' },
  overviewCopy: { minWidth: 0, flex: 1 },
  overviewTitle: { color: '#172554', fontSize: 12, fontWeight: '900' },
  overviewSub: { marginTop: 2, color: '#62718C', fontSize: 8, fontWeight: '700' },
  overviewStatus: { maxWidth: 170, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: '#F7D6A4', borderRadius: 99, backgroundColor: '#FFF7E8' },
  overviewStatusText: { color: '#A95A08', fontSize: 9, fontWeight: '900' },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contextCard: { minWidth: 220, flex: 1, gap: 4, padding: 9, borderRadius: 10 },
  remarksWide: { flex: 50, minWidth: 280 },
  locationNarrow: { flex: 35, minWidth: 210 },
  locationCard: { borderWidth: 1, borderColor: '#BEE8DE', backgroundColor: '#F0FDFA' },
  remarksCard: { borderWidth: 1, borderColor: '#F5DEB5', backgroundColor: '#FFFBEB' },
  contextHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contextLabel: { color: '#66758E', fontSize: 7, fontWeight: '900', letterSpacing: 0.45 },
  contextValue: { color: '#1E293B', fontSize: 9, fontWeight: '700', lineHeight: 13 },
  locationSection: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  locationTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  locationHint: { color: '#8190A8', fontSize: 8, fontWeight: '700' },
  mapButton: { minWidth: 190, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#0F766E' },
  mapButtonCompact: { minWidth: 145, flex: 15, flexGrow: 0, paddingHorizontal: 8 },
  mapButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  contentHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, contentHeadingRowCompact: { alignItems: 'stretch', flexDirection: 'column', gap: 9 },
  exportButton: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 8, backgroundColor: '#15803D', shadowColor: '#14532D', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, exportButtonCompact: { minHeight: 38, alignSelf: 'stretch', justifyContent: 'center' },
  assignedExportButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15803D', borderWidth: 2, borderColor: '#DCFCE7', shadowColor: '#14532D', shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  assignedClearButton: { height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FFF1F2' },
  assignedClearText: { color: '#DC2626', fontSize: 8, fontWeight: '900' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFF' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  paginationText: { color: '#52627C', fontSize: 10, fontWeight: '800' },
  paginationButton: { minWidth: 68, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#BFD0FF', borderRadius: 8, backgroundColor: '#FFFFFF' },
  paginationButtonText: { color: '#3156C8', fontSize: 10, fontWeight: '900' },
  exportButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  leadStatusColumn: { flex: 1.26 },
  leadStatusValue: { marginLeft: -5 },
  filterRow: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#F0F4FF' },
  filterCell: { height: 24, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, borderWidth: 1, borderColor: '#D9E2F4', borderRadius: 5, backgroundColor: '#FFFFFF' },
  columnFilterInput: { minWidth: 0, flex: 1, height: 22, padding: 0, color: '#334155', fontSize: 8, fontWeight: '600' },
  columnFilterPicker: { minWidth: 0, flex: 1, height: 24, color: '#334155', fontSize: 8 },
  verifiedListHeader: { height: 44, backgroundColor: '#EEF3FF' },
  headerColumn: { minWidth: 0, justifyContent: 'center' },
  headerFilterWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerFilterButton: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, paddingVertical: 3, borderRadius: 5 },
  headerFilterClear: { width: 18, height: 18, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#E24B4A' },
  taskFilterClear: { position: 'absolute', top: 13, right: 14, width: 58, height: 18, alignItems: 'center', justifyContent: 'center' },
  headerFilterText: { minWidth: 0, flexGrow: 0, flexShrink: 1, color: '#4B6093', fontSize: 7, fontWeight: '800', letterSpacing: 0.6 },
  headerFilterIcon: { width: 19, height: 19, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E1E9FC' },
  headerFilterIconActive: { backgroundColor: '#4F46E5' },
  columnLabelFiltered: { color: '#4F46E5' },
  filterBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.22)' },
  filterPopover: { width: '100%', maxWidth: 290, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  filterPopoverTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  filterPopoverTitleText: { color: '#1E3A8A', fontSize: 12, fontWeight: '900' },
  filterPopoverHint: { marginTop: 2, color: '#7C8AA5', fontSize: 8, fontWeight: '700' }, filterChoices: { maxHeight: 260, marginHorizontal: -4 }, filterChoice: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderRadius: 8 }, filterChoiceSelected: { backgroundColor: '#EEF3FF' }, filterCheckbox: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BCC9DF', borderRadius: 5, backgroundColor: '#FFFFFF' }, filterCheckboxSelected: { borderColor: '#3156C8', backgroundColor: '#3156C8' }, filterChoiceText: { color: '#334155', fontSize: 10, fontWeight: '700' }, filterChoiceTextSelected: { color: '#1E3A8A', fontWeight: '900' }, filterActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8EDF4' }, filterReset: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7, backgroundColor: '#F1F5F9' }, filterResetText: { color: '#475569', fontSize: 9, fontWeight: '900' }, filterApply: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7, backgroundColor: '#3156C8' }, filterApplyText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  dateRangeFields: { gap: 9, paddingVertical: 4 }, dateRangeInput: { height: 40, paddingHorizontal: 11, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, color: '#1E293B', fontSize: 10, fontWeight: '700', backgroundColor: '#F0F4FF' },
  dateRangeLabel: { marginBottom: 4, color: '#475569', fontSize: 9, fontWeight: '800' }, datePickerButton: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, backgroundColor: '#F0F4FF' }, datePickerText: { color: '#1E293B', fontSize: 10, fontWeight: '800' }, inlineCalendar: { marginTop: 3, padding: 9, borderWidth: 1, borderColor: '#D7E2F7', borderRadius: 10, backgroundColor: '#FFFFFF' }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }, calendarMonth: { color: '#1E3A8A', fontSize: 10, fontWeight: '900' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, calendarWeekday: { width: '14.28%', paddingVertical: 4, color: '#8290A8', fontSize: 8, fontWeight: '900', textAlign: 'center' }, calendarDay: { width: '14.28%', height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, calendarDaySelected: { backgroundColor: '#3156C8' }, calendarDayText: { color: '#334155', fontSize: 9, fontWeight: '700' }, calendarDayTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  filterPopoverPicker: { overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 9, backgroundColor: '#F0F4FF' },
  clearFilters: { width: 128, alignItems: 'center', justifyContent: 'center' },
  clearFiltersText: { color: '#DC2626', fontSize: 8, fontWeight: '900' },
  workspaceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderWidth: 1, borderColor: '#D8E1F0', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, mobileHeaderTopRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 4 }, mobileTabRow: { width: '100%', flexDirection: 'row', gap: 4 },
  workspaceHeaderCompact: { flexDirection: 'column', alignItems: 'stretch' },
  joinedBadge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, color: '#0F766E', backgroundColor: '#DFF5EF', fontSize: 8, fontWeight: '700' },
  roleBadge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, color: '#1D4ED8', backgroundColor: '#DBEAFE', fontSize: 8, fontWeight: '900' },
  roleBadgeRm: { color: '#6D28D9', backgroundColor: '#EDE9FE' },
  syncControls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: '#A7DFD7', backgroundColor: '#ECFDF8' },
  syncControlsCompact: { minWidth: 0, flex: 1, justifyContent: 'space-between', gap: 3, paddingHorizontal: 6 },
  syncButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 4 },
  autoRefreshBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#B6E4DA' },
  autoRefreshDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  autoRefreshLabel: { fontSize: 10, fontWeight: '700', color: '#0F766E' },
  countdownBadge: { minWidth: 34, height: 28, borderRadius: 8, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  assignWrap: { width: '100%', maxWidth: 980, alignSelf: 'center', gap: 14, padding: 22 },
  assignIntro: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E7EAF0' },
  assignIntroIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EEF3FF' },
  assignIntroTitle: { color: '#16213A', fontSize: 16, fontWeight: '900' },
  assignIntroText: { marginTop: 2, color: '#7C879A', fontSize: 10, fontWeight: '600' },
  assignGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  assignField: { width: '31%', minWidth: 240, flexGrow: 1, gap: 5 },
  assignEmployeeField: { width: '20%', minWidth: 200, flexGrow: 0 },
  assignDateField: { width: '24%', minWidth: 220, flexGrow: 0 },
  assignActionField: { minWidth: 170, flexGrow: 1, alignSelf: 'flex-end' },
  assignFieldCompact: { width: '100%', minWidth: 0 },
  assignLabel: { color: '#44516A', fontSize: 9, fontWeight: '900' },
  assignInput: { height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, color: '#172033', fontSize: 11, fontWeight: '700', backgroundColor: '#FFFFFF' },
  assignDatePicker: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' },
  assignDatePickerText: { minWidth: 0, flex: 1, color: '#172033', fontSize: 11, fontWeight: '700' },
  dateBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(15,23,42,0.26)' },
  datePopover: { width: '100%', maxWidth: 330, padding: 13, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  datePopoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  datePopoverTitle: { color: '#1E3A8A', fontSize: 13, fontWeight: '900' },
  datePopoverActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateNav: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#EEF4FF' },
  dateClose: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  dateWeekRow: { flexDirection: 'row', marginBottom: 3 },
  dateWeekday: { width: '14.285%', color: '#71809A', textAlign: 'center', fontSize: 8, fontWeight: '900' },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: '14.285%', height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dateCellSelected: { backgroundColor: '#3156C8' },
  dateCellText: { color: '#334155', fontSize: 10, fontWeight: '800' },
  dateCellTextSelected: { color: '#FFFFFF' },
  pickerShell: { height: 36, justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#D4DCE8', borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.035, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  picker: { height: 36, color: '#1F2937', fontSize: 11, fontWeight: '600' },
  styledSelect: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#D4DCE8', borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.035, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  styledSelectWrap: { position: 'relative', zIndex: 1 }, styledSelectWrapOpen: { zIndex: 50 }, styledSelectOpen: { borderColor: '#7895E9', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  styledSelectText: { minWidth: 0, flex: 1, color: '#1F2937', fontSize: 11, fontWeight: '700' }, styledSelectPlaceholder: { color: '#64748B' },
  selectBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.24)' },
  selectMenu: { position: 'absolute', top: 35, left: 0, right: 0, maxHeight: 250, overflow: 'hidden', borderWidth: 1, borderColor: '#7895E9', borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  selectMenuTitle: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8EDF4', color: '#1E3A8A', fontSize: 11, fontWeight: '900' }, selectOptions: { maxHeight: 250 },
  selectOption: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' }, selectOptionActive: { backgroundColor: '#F1F5FF' }, selectOptionText: { color: '#334155', fontSize: 11, fontWeight: '600' }, selectOptionTextActive: { color: '#3156C8', fontWeight: '900' },
  assignWarning: { color: '#B45309', fontSize: 9, fontWeight: '700' },
  assignFeedback: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 8 },
  assignSuccess: { backgroundColor: '#ECFDF3' },
  assignError: { backgroundColor: '#FEF2F2' },
  assignFeedbackText: { color: '#15803D', fontSize: 9, fontWeight: '800' },
  assignErrorText: { color: '#B91C1C' },
  assignButton: { minWidth: 170, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 20, borderRadius: 9, backgroundColor: '#4F46E5', shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  assignButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  desktopRow: { gap: 6, paddingHorizontal: 5 },
  fluidColumn: { width: 'auto', minWidth: 0, flex: 1 },
  clientColumn: { flex: 1.38 },
  desktopActionColumn: { width: 128, flexShrink: 0 },
  tableScroll: { flexGrow: 1 },
  desktopTable: { width: '100%' },
  mobileRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#DAE1F3', backgroundColor: '#EEF0FF' },
  mobileMeeting: { minWidth: 90, flex: 1 },
  mobileAction: { width: 30, height: 32, borderRadius: 8, backgroundColor: '#E9EEFF', alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, minHeight: 0, gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F7F8FA' }, pageCompact: { gap: 7, padding: 8 }, topSection: { flexShrink: 0, gap: 6 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, pageHeaderCompact: { alignItems: 'flex-start', flexDirection: 'column' },
  hero: { minHeight: 150 }, heroCompact: { minHeight: 0 }, heroCopy: { flex: 1 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#60A5FA' }, eyebrow: { color: '#3156C8', fontSize: 9, fontWeight: '900', letterSpacing: 1.35 }, title: { marginTop: 8, color: '#161F33', fontSize: 27, fontWeight: '900', letterSpacing: -0.6 }, titleCompact: { fontSize: 23 }, subtitle: { marginTop: 5, color: '#7B8495', fontSize: 12, fontWeight: '600', lineHeight: 19 },
  heroAside: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heroAsideCompact: { justifyContent: 'space-between', gap: 6 }, heroStat: { minWidth: 60 }, heroStatValue: { color: '#111827', fontSize: 16, fontWeight: '900' }, heroStatLabel: { color: '#64748B', fontSize: 8, fontWeight: '700' }, heroDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB' }, refresh: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderWidth: 1, borderColor: '#DDE3EE', borderRadius: 8, backgroundColor: '#FFFFFF' }, refreshText: { color: '#3156C8', fontSize: 9, fontWeight: '900' }, pressed: { opacity: 0.7 },
  metrics: { minWidth: 0, flexDirection: 'row', gap: 5 }, metricsCompact: { flexWrap: 'wrap' }, metric: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E3E8F0', borderLeftWidth: 3, borderRadius: 8, backgroundColor: '#FFFFFF' }, metricAccentBlue: { borderLeftColor: '#4F46E5', borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }, metricAccentGreen: { borderLeftColor: '#20A878' }, metricAccentOrange: { borderLeftColor: '#F59E0B', borderColor: '#FDE0AE', backgroundColor: '#FFF7E8' }, metricIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, metricBlue: { backgroundColor: '#DCE4FF' }, metricGreen: { backgroundColor: '#ECF9F4' }, metricOrange: { backgroundColor: '#FFE7BD' }, metricValue: { color: '#172033', fontSize: 13, fontWeight: '900' }, metricLabel: { color: '#727E91', fontSize: 8, fontWeight: '700' },
  workspace: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, workspaceCompact: { flexDirection: 'column', alignItems: 'stretch' }, contentPanel: { minWidth: 0, minHeight: 0, flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, contentHeading: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 11, borderLeftWidth: 4, borderLeftColor: '#38BDF8', backgroundColor: '#22356F' }, contentTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.15 }, contentSubtitle: { marginTop: 3, color: '#CBD9FF', fontSize: 9, fontWeight: '500' }, resultsScroll: { flex: 1, minHeight: 0 }, resultsView: { flex: 1, minHeight: 0 }, resultsContent: { flexGrow: 1 },
  tabs: { width: '100%', height: 36, flexDirection: 'row', gap: 5, padding: 3, borderWidth: 1, borderColor: '#DFE4ED', borderRadius: 9, backgroundColor: '#FFFFFF' }, workspaceTabs: { minWidth: 360, flex: 1, width: undefined, height: 36, borderWidth: 0, backgroundColor: '#F5F7FC' }, tabsCompact: { height: 'auto', flexDirection: 'column' }, tabsLabel: { color: '#A1A9B7', fontSize: 8, fontWeight: '900' }, tab: { minHeight: 28, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7, borderWidth: 1, borderRadius: 7 }, tabToday: { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }, tabTodayActive: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' }, tabResponses: { borderColor: '#DDD6FE', backgroundColor: '#F5F3FF' }, tabResponsesActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' }, tabTasks: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }, tabTasksActive: { borderColor: '#059669', backgroundColor: '#059669' }, tabAssign: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }, tabAssignActive: { borderColor: '#D97706', backgroundColor: '#D97706' }, tabIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 5 }, tabTodayIcon: { backgroundColor: '#DBEAFE' }, tabResponsesIcon: { backgroundColor: '#EDE9FE' }, tabTasksIcon: { backgroundColor: '#D1FAE5' }, tabAssignIcon: { backgroundColor: '#FEF3C7' }, tabIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' }, tabText: { fontSize: 9, fontWeight: '800' }, tabTodayColor: { color: '#4338CA' }, tabResponsesColor: { color: '#6D28D9' }, tabTasksColor: { color: '#047857' }, tabAssignColor: { color: '#B45309' }, tabTextActive: { color: '#FFFFFF', fontWeight: '900' }, badge: { minWidth: 18, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden', borderRadius: 9, textAlign: 'center', fontSize: 7, fontWeight: '900' }, badgeToday: { color: '#4338CA', backgroundColor: '#DDE5FF' }, badgeActive: { color: '#2949B6', backgroundColor: '#FFFFFF' }, permission: { color: '#64748B', fontSize: 8, fontWeight: '600' },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, backgroundColor: '#FFFFFF' }, loadingProgressWrap: { width: '100%', maxWidth: 250, flexDirection: 'row', alignItems: 'center', gap: 8 }, loadingProgressTrack: { flex: 1, height: 7, overflow: 'hidden', borderRadius: 99, backgroundColor: '#E0E7FF' }, loadingProgressFill: { height: '100%', borderRadius: 99, backgroundColor: '#4F46E5' }, loadingProgressValue: { width: 32, color: '#4F46E5', fontSize: 9, fontWeight: '900', textAlign: 'right' }, stateText: { color: '#64748B', textAlign: 'center', fontSize: 9, fontWeight: '700' }, list: { width: '100%' }, listHeader: { position: 'relative', height: 29, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#EAF0FD' }, listHeaderCompact: { display: 'none' }, columnLabel: { width: 120, color: '#4B6093', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }, personColumn: { width: 200 }, personColumnCompact: { width: '100%' }, actionColumn: { width: 150 }, listRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#DAE1F3', backgroundColor: '#EEF0FF' }, listRowAlternate: { backgroundColor: '#E9F7F3' }, listRowCompact: { height: 'auto', minHeight: 74, flexWrap: 'wrap', paddingVertical: 8 }, personCell: { flexDirection: 'row', alignItems: 'center', gap: 0 }, avatar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 10, backgroundColor: '#E0E7FF' }, avatarText: { color: '#4338CA', fontSize: 11, fontWeight: '800' }, cellCopy: { minWidth: 0, flex: 1 }, cell: { width: 120 }, cellCompact: { width: '30%', flexGrow: 1 }, cellMain: { color: '#334155', fontSize: 10, fontWeight: '600' }, cellSub: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, client: { color: '#142039', fontSize: 10, fontWeight: '900' }, code: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, status: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#F3DFC1', borderRadius: 99, color: '#A95A08', fontSize: 8, fontWeight: '900', letterSpacing: 0.25, backgroundColor: '#FFF7EA' }, statusVerified: { color: '#117A54', borderColor: '#CDEBDE', backgroundColor: '#EAF8F1' }, rowAction: { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 7, backgroundColor: '#E9EEFF', borderWidth: 1, borderColor: '#CFDAFF' }, rowActionCompact: { flexGrow: 1 }, rowActionPressed: { backgroundColor: '#EDF2FF' }, rowActionText: { color: '#2D52C7', fontSize: 9, fontWeight: '900' }, label: { color: '#8390A6', fontSize: 7, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  taskDashboard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10 }, taskDashboardCompact: { flexDirection: 'column' }, taskSummaryPanel: { width: 310, flexShrink: 0 }, taskListPanel: { minWidth: 0, flex: 1, gap: 8 }, summaries: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, summary: { width: '48.8%', minWidth: 0, flexGrow: 0, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#DDE7FF', borderRadius: 9, backgroundColor: '#F7F9FF' }, summaryCompact: { width: '48%', minWidth: 0, flexGrow: 0 }, summaryName: { color: '#1E3A8A', fontSize: 12, fontWeight: '900' }, summaryCounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }, summaryLine: { color: '#64748B', fontSize: 8, fontWeight: '700' }, summaryCount: { color: '#1E3A8A', fontWeight: '900' }, overdueCount: { color: '#C2410C' }, filters: { flexDirection: 'row', alignItems: 'center', gap: 8 }, filtersCompact: { flexDirection: 'column', alignItems: 'stretch' }, filterInput: { minWidth: 220, height: 34, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D4E0FF', borderRadius: 10, backgroundColor: '#F9FBFF', color: '#172033', fontSize: 9, fontWeight: '800' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, chip: { minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#D4E0FF', borderRadius: 10, backgroundColor: '#F1F5FF' }, chipActive: { borderColor: '#6B8AFF', backgroundColor: '#3156C8', shadowColor: '#0F2C7A', shadowOpacity: 0.24, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, chipText: { color: '#44577E', fontSize: 8, fontWeight: '900' }, chipTextActive: { color: '#FFFFFF' }, taskList: { gap: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#DCE5FA', borderRadius: 10 },
  taskListJoined: { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }, taskFullPanel: { gap: 0 }, taskStickyHeader: { overflow: 'hidden', backgroundColor: '#FFFFFF' }, verifiedStickyHeader: { overflow: 'hidden', backgroundColor: '#FFFFFF' }, taskToolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, padding: 10, borderWidth: 1, borderColor: '#DCE5FA', borderRadius: 10, backgroundColor: '#F8FAFF' }, taskToolbarHeader: { minWidth: 0, flex: 1, justifyContent: 'flex-end', padding: 0, borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' }, taskSalesPicker: { width: 190, height: 34, flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D4E0FF', borderRadius: 10, backgroundColor: '#F9FBFF' }, taskSalesPickerControl: { minWidth: 0, flex: 1, height: 34, color: '#1E3A8A', fontSize: 9, fontWeight: '900' }, taskSummaryPanelCompact: { width: '100%' }, taskResultsContent: { flex: 1, minHeight: 0 }, taskDashboardFill: { flex: 1, minHeight: 0 }, taskListFill: { flex: 1, minHeight: 0 }, taskRowsScroll: { flex: 1, minHeight: 0 }, taskRowsContent: { flexGrow: 0 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' }, modal: { width: '100%', maxWidth: 900, maxHeight: '94%', overflow: 'hidden', borderRadius: 21, backgroundColor: '#fff' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }, modalHeaderCopy: { minWidth: 0, flex: 1 }, modalEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, modalEyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6366F1' }, modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, modalTitle: { marginTop: 3, color: '#0F172A', fontSize: 18, fontWeight: '900' }, modalMeta: { marginTop: 2, color: '#70809B', fontSize: 8, fontWeight: '700' }, close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#E2E8F0' }, modalBody: { gap: 13, padding: 15 }, sectionTitle: { marginBottom: 6, color: '#172554', fontSize: 13, fontWeight: '900' }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, detail: { width: '30%', minWidth: 150, flexGrow: 1, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, backgroundColor: '#F8FAFC' }, detailValue: { marginTop: 3, color: '#0F172A', fontSize: 9, fontWeight: '700' }, formSection: { gap: 9, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#E2E8F0' }, help: { color: '#64748B', fontSize: 9, fontWeight: '600' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 30, elevation: 30 }, field: { width: '31%', minWidth: 190, flexGrow: 1, gap: 3 }, fieldLabel: { color: '#334155', fontSize: 10, fontWeight: '800' }, input: { paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, color: '#0F172A' }, timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, timePicker: { width: 112, minWidth: 0, flexGrow: 0, flexShrink: 1 }, timeSeparator: { color: '#64748B', fontSize: 14, fontWeight: '900' }, secondsBox: { width: 42, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#F1F5F9' }, secondsValue: { color: '#475569', fontSize: 10, fontWeight: '900' }, error: { color: '#DC2626', fontSize: 10, fontWeight: '800' }, submit: { zIndex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#4F46E5' }, disabled: { opacity: .6 }, submitText: { color: '#fff', fontWeight: '900' },
});
