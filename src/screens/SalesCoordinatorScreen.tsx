import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Icon } from 'react-native-paper';
import { leadService } from '../services/LeadService';
import { leadSearchApi } from '../api/leadSearch';
import type { LeadResponse } from '../types/lead';
import { meetingService } from '../services/MeetingService';
import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';
import { theme } from '../theme/theme';
import { createMeetingVerificationForm } from './meetingVerificationForm';

type Tab = 'today' | 'responses' | 'tasks' | 'assign' | 'assignedLeads';
type VerificationField = NonNullable<keyof MeetingVerificationRequest>;
type VerificationForm = Record<VerificationField, string>;
type MeetingColumnFilter = Partial<Record<'clientName' | 'mobileNumber' | 'meetingTitle' | 'employeeName' | 'leadStatus' | 'meetingDate' | 'nextMeetingDate' | 'aloneWith' | 'verifiedBy', string>>;
const isVerificationFieldVisible = (field: VerificationField, meetingWith: string) => {
  if (field !== 'personName' && field !== 'position') return true;
  return ['SOMEONE', 'SOMEONE_ELSE', 'WITH_SOMEONE'].includes(
    meetingWith.trim().toUpperCase().replace(/\s+/g, '_'),
  );
};
const TABS: readonly { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today Meetings', icon: 'calendar-check-outline' },
  { key: 'responses', label: 'Verified Meetings', icon: 'clipboard-check-outline' },
  { key: 'tasks', label: 'Sales Person Tasks', icon: 'account-group-outline' },
  { key: 'assign', label: 'Assign New Lead', icon: 'account-plus-outline' },
  { key: 'assignedLeads', label: 'Assigned Leads', icon: 'account-arrow-right-outline' },
];
const emptyAssignForm = () => ({ clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', salesPersonEmployeeCode: '' });
const FIELDS: readonly { key: VerificationField; label: string; placeholder: string }[] = [
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
const emptyForm = (): VerificationForm => ({ meetingTiming: '', ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '', meetingWith: '', personName: '', position: '' });
const HOURS = Array.from({ length: 14 }, (_, index) => String(index + 9).padStart(2, '0'));
const PRIOR_INVESTMENT_OPTIONS = ['YES', 'NO'] as const;
const BEST_TIME_OPTIONS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
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
const POSITION_OPTIONS = ['Sales person', 'Team Leader', 'RM', 'Admin', 'Super Admin'] as const;
const SALES_PERSON_CODES = ['RK1507', 'AS0108', 'AK0107', 'RG1108', 'HP0605', 'AK0108', 'SM2403', 'GK0902', 'AS1909', 'US2601'] as const;
const show = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const timeText = (v?: { hour?: number; minute?: number; second?: number } | string) => typeof v === 'string' ? v : v?.hour === undefined ? '—' : [v.hour, v.minute ?? 0, v.second ?? 0].map((n) => String(n).padStart(2, '0')).join(':');
const mapUrlFor = (meeting: MeetingResponse) => meeting.googleMapsUrl || (meeting.latitude != null && meeting.longitude != null ? `https://www.google.com/maps?q=${meeting.latitude},${meeting.longitude}` : null);
const matchesSearch = (value: unknown, query: string) => !query.trim() || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase());
const leadCardTone = (lead: LeadResponse) => [...String(lead.assignedByEmployeeCode ?? lead.assignedByEmployeeName ?? '')].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
const filterMeetingRecords = (items: readonly MeetingResponse[], filters: MeetingColumnFilter) => items.filter((meeting) => Object.entries(filters).every(([key, filter]) => { if (key === 'meetingDate' && filter?.startsWith('range:')) { const [from, to] = filter.slice(6).split(','); const date = String(meeting.meetingDate ?? ''); return (!from || date >= from) && (!to || date <= to); } const choices = filter?.split('|').filter(Boolean) ?? []; const current = String(key === 'meetingTitle' ? meeting.meetingTitle ?? meeting.meetingType ?? '' : meeting[key as keyof MeetingResponse] ?? '').toLowerCase(); return !choices.length || choices.some((choice) => current.includes(choice.toLowerCase())); }));
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
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

export function SalesCoordinatorScreen({ permissions }: { permissions?: readonly string[] | null }) {
  const compact = useWindowDimensions().width < 760;
  const [tab, setTab] = useState<Tab>('today');
  const [pending, setPending] = useState<MeetingResponse[]>([]);
  const [verified, setVerified] = useState<MeetingResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(10);
  const nextRefreshAt = useRef(Date.now() + 10_000);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loadInFlight = useRef(false);
  const dataGeneration = useRef(0);
  const hasLoaded = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MeetingResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [todayColumnFilters, setTodayColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseColumnFilters, setResponseColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseSearch, setResponseSearch] = useState(''); const [assignedSearch, setAssignedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODAY' | 'PENDING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignedLeads, setAssignedLeads] = useState<LeadResponse[]>([]);
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [assignedSalesPersonFilter, setAssignedSalesPersonFilter] = useState('');

  const exportCurrentList = () => {
    const responseTab = tab === 'responses';
    const records = responseTab ? verified : pending;
    const filters = responseTab ? responseColumnFilters : todayColumnFilters;
    exportMeetingCsv(filterMeetingRecords(records, filters), responseTab ? 'pc-meeting-response' : 'today-meetings', responseTab);
  };

  const load = useCallback(async () => {
    if (loadInFlight.current || submittingRef.current) return;
    loadInFlight.current = true;
    const generation = dataGeneration.current;
    if (!hasLoaded.current) setLoading(true);
    setRefreshing(true);
    try {
      const [p, v, all, leadResult] = await Promise.all([meetingService.getVerificationMeetings('PENDING'), meetingService.getVerificationMeetings('VERIFIED'), meetingService.getAllMeetingRecords(), leadSearchApi.search({ page: 0, size: 200 })]);
      if (generation !== dataGeneration.current) return;
      setPending(p); setVerified(v); setMeetings(all); setAssignedLeads((leadResult.data?.content ?? []).filter((lead) => lead.assignmentSource === 'SALES_COORDINATOR' || lead.assignedByCoordinator));
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
      setRefreshSeconds(10);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (loadInFlight.current || submittingRef.current) return;
      const seconds = Math.max(0, Math.ceil((nextRefreshAt.current - Date.now()) / 1000));
      setRefreshSeconds(seconds);
      if (seconds === 0) void load();
    }, 1000);
    return () => { clearInterval(timer); dataGeneration.current += 1; };
  }, [load]);

  const taskStatus = (m: MeetingResponse) => m.meetingStatus === 'COMPLETED' ? 'COMPLETED' : m.meetingDate === localToday() ? 'TODAY' : (m.meetingDate ?? '') < localToday() ? 'OVERDUE' : 'PENDING';
  const filteredTasks = useMemo(() => meetings.filter((m) => {
    const q = employeeFilter.trim().toLowerCase();
    const employeeMatch = !q || m.employeeName?.toLowerCase().includes(q) || m.employeeCode?.toLowerCase().includes(q);
    return employeeMatch && (statusFilter === 'ALL' || taskStatus(m) === statusFilter);
  }), [employeeFilter, meetings, statusFilter]);
  const summaries = useMemo(() => meetings.reduce<Record<string, { name: string; TODAY: number; PENDING: number; OVERDUE: number; COMPLETED: number }>>((result, m) => {
    const key = m.employeeCode ?? m.employeeName; if (!key) return result;
    const row = result[key] ?? { name: m.employeeName ?? key, TODAY: 0, PENDING: 0, OVERDUE: 0, COMPLETED: 0 };
    row[taskStatus(m)] += 1; result[key] = row; return result;
  }, {}), [meetings]);
  const assignLead = async () => {
    const values = Object.values(assignForm).map((value) => value.trim());
    if (values.some((value) => !value)) { setAssignMessage({ type: 'error', text: 'Please complete all fields, including the employee code.' }); return; }
    if (!/^\d{10}$/.test(assignForm.mobileNumber.trim())) { setAssignMessage({ type: 'error', text: 'Mobile number must contain exactly 10 digits.' }); return; }
    setAssigning(true); setAssignMessage(null);
    try {
      const lead = await leadService.assignLead({ ...assignForm, clientName: assignForm.clientName.trim(), mobileNumber: assignForm.mobileNumber.trim(), location: assignForm.location.trim(), clinicAddress: assignForm.clinicAddress.trim(), speciality: assignForm.speciality.trim(), salesPersonEmployeeCode: assignForm.salesPersonEmployeeCode.trim().toUpperCase() });
      setAssignForm(emptyAssignForm());
      setAssignMessage({ type: 'success', text: `${lead.clientName ?? 'Lead'} assigned successfully${lead.assignedEmployeeName ? ` to ${lead.assignedEmployeeName}` : ''}.` });
    } catch (e) { setAssignMessage({ type: 'error', text: e instanceof Error ? e.message : 'Lead assignment failed.' }); }
    finally { setAssigning(false); }
  };

  const openVerify = (meeting: MeetingResponse) => {
    setForm(createMeetingVerificationForm(meeting, verified));
    setSubmitError(null); setSelected(meeting);
  };
  const verify = async () => {
    if (!selected?.meetingCode || submittingRef.current) return;
    if (form.meetingTiming && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(form.meetingTiming)) {
      setSubmitError('Meeting Time must use HH:mm:ss format.'); return;
    }
    const payload = Object.fromEntries(
      FIELDS.filter((field) => isVerificationFieldVisible(field.key, form.meetingWith))
        .map((field) => [field.key, form[field.key].trim()]).filter(([, fieldValue]) => Boolean(fieldValue)),
    ) as MeetingVerificationRequest;
    submittingRef.current = true; setSubmitting(true); setSubmitError(null);
    dataGeneration.current += 1;
    try {
      await meetingService.verifyMeeting(selected.meetingCode, payload);
      setPending((items) => items.filter((m) => m.meetingCode !== selected.meetingCode));
      setVerified(await meetingService.getVerificationMeetings('VERIFIED'));
      setSelected(null);
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Meeting verification failed.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  return <View style={[styles.page, compact && styles.pageCompact]}>
    <View style={styles.topSection}>
      <View style={[styles.workspaceHeader, compact && styles.workspaceHeaderCompact]}>
        <View style={[styles.metrics, compact && styles.metricsCompact]}>
          <Metric icon="clock-outline" value={pending.length} label="Awaiting review" tone="blue" />
          <Metric icon="account-outline" value={Object.keys(summaries).length} label="Sales people" tone="orange" />
        </View>
        <View style={[styles.tabs, styles.workspaceTabs, compact && styles.tabsCompact]}>{TABS.map((item) => {
          const tone = item.key === 'today' ? 'Today' : item.key === 'responses' ? 'Responses' : item.key === 'tasks' ? 'Tasks' : 'Assign';
          const selected = tab === item.key;
          const tabColor = tone === 'Today' ? '#4338CA' : tone === 'Responses' ? '#6D28D9' : tone === 'Tasks' ? '#047857' : '#B45309';
          return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, styles[`tab${tone}`], selected && styles[`tab${tone}Active`]]}><View style={[styles.tabIcon, styles[`tab${tone}Icon`], selected && styles.tabIconActive]}><Icon source={item.icon} size={14} color={selected ? '#FFFFFF' : tabColor} /></View><Text style={[styles.tabText, styles[`tab${tone}Color`], selected && styles.tabTextActive]}>{item.label}</Text>{item.key === 'today' ? <Text style={[styles.badge, styles.badgeToday, selected && styles.badgeActive]}>{pending.length}</Text> : null}</Pressable>;
        })}</View>
        <View style={[styles.syncControls, compact && styles.syncControlsCompact]}>
          <Pressable disabled={refreshing || submitting} onPress={() => void load()} style={({ pressed }) => [styles.syncButton, (refreshing || submitting) && styles.disabled, pressed && styles.pressed]}>
            <Icon source="refresh" size={17} color="#3156C8" />
            <Text style={styles.refreshText}>Sync data</Text>
          </Pressable>
          <View style={styles.autoRefreshBadge}>
            <View style={styles.autoRefreshDot} />
            <Text style={styles.autoRefreshLabel}>{refreshing ? 'Syncing' : submitting ? 'Paused' : 'Auto-refresh'}</Text>
            <View style={styles.countdownBadge}>
              {refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.countdownText}>{refreshSeconds}s</Text>}
            </View>
          </View>
        </View>
      </View>
      {refreshError ? <Text style={styles.error}>Sync failed. Retrying automatically in 10 seconds.</Text> : null}
    </View>
    <View style={styles.contentPanel}>
      <View style={styles.contentHeading}>
        <View style={[styles.contentHeadingRow, compact && styles.contentHeadingRowCompact]}>
          <View>
            <Text style={styles.contentTitle}>{TABS.find((item) => item.key === tab)?.label}</Text>
            <Text style={styles.contentSubtitle}>{tab === 'today' ? `${pending.length} meetings waiting for verification` : tab === 'responses' ? `${verified.length} meetings already verified by the Sales Coordinator` : tab === 'assign' ? 'Create a physical lead and assign it to a sales person' : 'Track ownership and meeting progress'}</Text>
          </View>
          {tab === 'responses' ? <TextInput value={responseSearch} onChangeText={setResponseSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} /> : null}
          {tab === 'assignedLeads' ? <HeaderLeadFilters leads={assignedLeads} coordinatorFilter={coordinatorFilter} setCoordinatorFilter={setCoordinatorFilter} salesPersonFilter={assignedSalesPersonFilter} setSalesPersonFilter={setAssignedSalesPersonFilter} search={assignedSearch} setSearch={setAssignedSearch} /> : (tab === 'today' || tab === 'responses') ? <Pressable onPress={exportCurrentList} style={({ pressed }) => [styles.exportButton, compact && styles.exportButtonCompact, pressed && styles.pressed]}><Icon source="file-excel-outline" size={15} color="#FFFFFF" /><Text style={styles.exportButtonText}>Export Excel</Text></Pressable> : null}
        </View>
      </View>
    {!compact && !loading && !error && tab !== 'assign' && tab !== 'tasks' && tab !== 'assignedLeads' ? <MeetingTableHeader verified={tab === 'responses'} records={tab === 'responses' ? verified : pending} filters={tab === 'responses' ? responseColumnFilters : todayColumnFilters} onFiltersChange={tab === 'responses' ? setResponseColumnFilters : setTodayColumnFilters} /> : null}
    <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
    {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
    {loading ? <State loading message="Loading coordinator workspace..." /> : error ? <State message={error} /> : null}
    {!loading && !error && tab === 'today' ? <Cards items={pending} filters={todayColumnFilters} empty="No meetings are pending Process Coordinator verification." action="Verify Details" onOpen={openVerify} /> : null}
    {!loading && !error && tab === 'responses' ? <Cards items={verified.filter((meeting) => matchesSearch(meeting.clientName, responseSearch) || matchesSearch(meeting.mobileNumber, responseSearch))} filters={responseColumnFilters} empty="No meetings have been verified by the Sales Coordinator yet." action="View Response" onOpen={setSelected} verified /> : null}
    {!loading && !error && tab === 'assign' ? <View style={styles.assignWrap}><View style={styles.assignIntro}><View style={styles.assignIntroIcon}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View><Text style={styles.assignIntroTitle}>Lead information</Text><Text style={styles.assignIntroText}>Enter the client details and the employee code that should own this lead.</Text></View></View><View style={styles.assignGrid}>{([['clientName', 'Client Name', 'e.g. Dr. Rajesh Kumar'], ['mobileNumber', 'Mobile Number', '10-digit mobile number'], ['location', 'Location', 'City or area'], ['clinicAddress', 'Clinic Address', 'Complete clinic address'], ['speciality', 'Speciality', 'e.g. Cardiologist'], ['salesPersonEmployeeCode', 'Employee Code', 'e.g. EMP000011']] as const).map(([key, label, placeholder]) => <View key={key} style={[styles.assignField, compact && styles.assignFieldCompact]}><Text style={styles.assignLabel}>{label}</Text>{key === 'salesPersonEmployeeCode' ? <View style={styles.assignPickerShell}><Picker selectedValue={assignForm.salesPersonEmployeeCode} onValueChange={(value) => setAssignForm((current) => ({ ...current, salesPersonEmployeeCode: String(value) }))} style={styles.assignPicker}><Picker.Item label="Select employee code" value="" />{SALES_PERSON_CODES.map((code) => <Picker.Item key={code} label={code} value={code} />)}</Picker></View> : <TextInput value={assignForm[key]} onChangeText={(text) => setAssignForm((current) => ({ ...current, [key]: key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : text }))} placeholder={placeholder} placeholderTextColor="#A1A9B7" autoCapitalize="sentences" keyboardType={key === 'mobileNumber' ? 'phone-pad' : 'default'} style={styles.assignInput} />}</View>)}</View>{assignMessage ? <View style={[styles.assignFeedback, assignMessage.type === 'success' ? styles.assignSuccess : styles.assignError]}><Icon source={assignMessage.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={assignMessage.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.assignFeedbackText, assignMessage.type === 'error' && styles.assignErrorText]}>{assignMessage.text}</Text></View> : null}<Pressable disabled={assigning} onPress={() => void assignLead()} style={({ pressed }) => [styles.assignButton, assigning && styles.disabled, pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={styles.assignButtonText}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View> : null}
    {!loading && !error && tab === 'assignedLeads' ? <AssignedLeadCards leads={assignedLeads.filter((lead) => matchesSearch(lead.clientName, assignedSearch) || matchesSearch(lead.mobileNumber, assignedSearch))} coordinatorFilter={coordinatorFilter} setCoordinatorFilter={setCoordinatorFilter} salesPersonFilter={assignedSalesPersonFilter} setSalesPersonFilter={setAssignedSalesPersonFilter} /> : null}
    {!loading && !error && tab === 'tasks' ? <View style={styles.taskSection}>
      <View style={styles.summaries}>{Object.entries(summaries).map(([key, row]) => <View key={key} style={styles.summary}><Text style={styles.summaryName}>{row.name}</Text><Text style={styles.summaryLine}>Today {row.TODAY} · Pending {row.PENDING}</Text><Text style={styles.summaryLine}>Overdue {row.OVERDUE} · Completed {row.COMPLETED}</Text></View>)}</View>
      <View style={[styles.filters, compact && styles.filtersCompact]}><TextInput value={employeeFilter} onChangeText={setEmployeeFilter} placeholder="Filter by sales person" style={styles.filterInput} /><ScrollView horizontal contentContainerStyle={styles.chips}>{(['ALL', 'TODAY', 'PENDING', 'OVERDUE', 'COMPLETED'] as const).map((s) => <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.chip, statusFilter === s && styles.chipActive]}><Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text></Pressable>)}</ScrollView></View>
      <Cards items={filteredTasks} empty="No meeting tasks match these client-side filters." />
    </View> : null}
    </ScrollView>
    </View>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text></View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>{selected ? <Details meeting={selected} /> : null}{tab === 'responses' && selected ? <VerificationDetails meeting={selected} /> : selected ? <View style={styles.formSection}><Text style={styles.sectionTitle}>PC Additional Information</Text><Text style={styles.help}>Choose the available values below. Blank optional values are omitted; backend validation messages are shown unchanged.</Text><View style={styles.formGrid}>{FIELDS.map((field) => <VerificationFormField key={field.key} field={field} form={form} setForm={setForm} />)}</View>{submitError ? <Text style={styles.error}>{submitError}</Text> : null}<Pressable disabled={submitting} onPress={() => void verify()} style={[styles.submit, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Icon source="check-decagram-outline" size={20} color="#fff" />}<Text style={styles.submitText}>{submitting ? 'Verifying...' : 'Verify Meeting'}</Text></Pressable></View> : null}</ScrollView>
    </View></View></Modal>
  </View>;
}

function Metric({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'blue' | 'green' | 'orange' }) {
  const toneStyle = tone === 'green' ? styles.metricGreen : tone === 'orange' ? styles.metricOrange : styles.metricBlue;
  const accentStyle = tone === 'green' ? styles.metricAccentGreen : tone === 'orange' ? styles.metricAccentOrange : styles.metricAccentBlue;
  const color = tone === 'green' ? '#15936A' : tone === 'orange' ? '#D97706' : '#3156C8';
  return <View style={[styles.metric, accentStyle]}><View style={[styles.metricIcon, toneStyle]}><Icon source={icon} size={15} color={color} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>;
}

function VerificationFormField({
  field,
  form,
  setForm,
}: {
  field: typeof FIELDS[number];
  form: VerificationForm;
  setForm: React.Dispatch<React.SetStateAction<VerificationForm>>;
}) {
  const update = (value: string) => setForm((current) => ({ ...current, [field.key]: value }));
  const tone = field.key === 'meetingTiming' || field.key === 'ageGroup' ? styles.fieldToneBlue : field.key === 'existingSip' || field.key === 'profession' ? styles.fieldToneTeal : field.key === 'professionDetail' || field.key === 'bestTimeForMeeting' ? styles.fieldToneViolet : styles.fieldToneAmber;

  if (!isVerificationFieldVisible(field.key, form.meetingWith)) return null;

  if (field.key === 'meetingTiming') {
    const [selectedHour = ''] = form.meetingTiming.split(':');
    const updateTime = (hour: string) => {
      update(hour ? `${hour}:00:00` : '');
    };
    return (
      <View style={[styles.field, tone]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.timePickerRow}>
          <View style={[styles.pickerShell, styles.timePicker]}><Picker selectedValue={selectedHour} onValueChange={updateTime} style={styles.picker}><Picker.Item label="Hour" value="" />{HOURS.map((hour) => <Picker.Item key={hour} label={hour} value={hour} />)}</Picker></View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={styles.secondsBox}><Text style={styles.secondsValue}>00</Text></View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={styles.secondsBox}><Text style={styles.secondsValue}>00</Text></View>
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
          : field.key === 'position'
            ? POSITION_OPTIONS
            : null;
  if (options) {
    return (
      <View style={[styles.field, tone]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.pickerShell}><Picker selectedValue={form[field.key]} onValueChange={update} style={styles.picker}><Picker.Item label="Select an option" value="" />{options.map((option) => <Picker.Item key={option} label={field.key === 'ageGroup' ? AGE_GROUP_LABELS[option] : field.key === 'profession' ? PROFESSION_LABELS[option] : option} value={option} />)}</Picker></View>
      </View>
    );
  }

  return <View style={[styles.field, tone]}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput value={form[field.key]} onChangeText={update} placeholder={field.placeholder} style={styles.input} /></View>;
}

function StyledSelect({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: readonly { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={[styles.styledSelectWrap, open && styles.styledSelectWrapOpen]}><Pressable onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.styledSelect, open && styles.styledSelectOpen, pressed && styles.pressed]}><Text numberOfLines={1} style={[styles.styledSelectText, !selected && styles.styledSelectPlaceholder]}>{selected?.label ?? placeholder}</Text><Icon source={open ? 'chevron-up' : 'chevron-down'} size={18} color="#3156C8" /></Pressable>{open ? <View style={styles.selectMenu}><ScrollView style={styles.selectOptions} nestedScrollEnabled>{options.map((option) => <Pressable key={option.value} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.selectOption, value === option.value && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option.value && styles.selectOptionTextActive]}>{option.label}</Text>{value === option.value ? <Icon source="check" size={16} color="#3156C8" /> : null}</Pressable>)}</ScrollView></View> : null}</View>;
}

const FILTER_COLUMNS: { key: keyof MeetingColumnFilter; label: string }[] = [
  { key: 'clientName', label: 'CLIENT NAME' }, { key: 'mobileNumber', label: 'NUMBER' }, { key: 'meetingTitle', label: 'MEETING TYPE' }, { key: 'employeeName', label: 'SALES PERSON' }, { key: 'leadStatus', label: 'LEAD STATUS' }, { key: 'meetingDate', label: 'MEETING DATE' }, { key: 'nextMeetingDate', label: 'NEXT PLAN DATE' }, { key: 'aloneWith', label: 'JOINED' },
];
function InlineCalendar({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const empty = Array.from({ length: month.getDay() });
  const iso = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <View style={styles.inlineCalendar}><View style={styles.calendarHeader}><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><Icon source="chevron-left" size={18} color="#3156C8" /></Pressable><Text style={styles.calendarMonth}>{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><Icon source="chevron-right" size={18} color="#3156C8" /></Pressable></View><View style={styles.calendarGrid}>{['S','M','T','W','T','F','S'].map((day, index) => <Text key={`${day}${index}`} style={styles.calendarWeekday}>{day}</Text>)}{empty.map((_, index) => <View key={`empty${index}`} />)}{days.map((day) => <Pressable key={day} onPress={() => onSelect(iso(day))} style={[styles.calendarDay, value === iso(day) && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, value === iso(day) && styles.calendarDayTextSelected]}>{day}</Text></Pressable>)}</View></View>;
}
function MeetingTableHeader({ verified = false, records, filters, onFiltersChange }: { verified?: boolean; records: readonly MeetingResponse[]; filters: MeetingColumnFilter; onFiltersChange: React.Dispatch<React.SetStateAction<MeetingColumnFilter>> }) {
  const [openFilter, setOpenFilter] = useState<keyof MeetingColumnFilter | null>(null);
  const [draftChoices, setDraftChoices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [dateTarget, setDateTarget] = useState<'from' | 'to' | null>(null);
  const columns = verified ? [...FILTER_COLUMNS, { key: 'verifiedBy' as const, label: 'VERIFIED BY' }] : FILTER_COLUMNS;
  const dropdownKeys: (keyof MeetingColumnFilter)[] = verified
    ? ['employeeName', 'verifiedBy', 'meetingTitle', 'leadStatus', 'meetingDate']
    : ['employeeName', 'meetingTitle', 'leadStatus'];
  const optionsFor = (key: keyof MeetingColumnFilter) => [...new Set(records.map((record) => String(key === 'meetingTitle' ? record.meetingTitle ?? record.meetingType ?? '' : record[key as keyof MeetingResponse] ?? '')).filter(Boolean))].sort();
  const openChoices = (key: keyof MeetingColumnFilter) => { if (key === 'meetingDate' && verified) { const [from = '', to = ''] = (filters[key] ?? '').replace('range:', '').split(','); setDateRange({ from, to }); } else setDraftChoices((filters[key] ?? '').split('|').filter(Boolean)); setOpenFilter(key); };
  const dateFilterOpen = openFilter === 'meetingDate' && verified;
  const dateText = (date: Date) => date.toISOString().slice(0, 10);
  return <><View style={[styles.listHeader, styles.verifiedListHeader, styles.desktopRow]}>{columns.map((column, index) => <View key={column.key} style={[styles.headerColumn, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>{dropdownKeys.includes(column.key) ? <Pressable onPress={() => openChoices(column.key)} style={styles.headerFilterButton}><Text numberOfLines={1} style={[styles.headerFilterText, filters[column.key] && styles.columnLabelFiltered]}>{column.label}</Text><View style={[styles.headerFilterIcon, filters[column.key] && styles.headerFilterIconActive]}><Icon source="filter-variant" size={10} color={filters[column.key] ? '#FFFFFF' : '#536B9F'} /></View></Pressable> : <Text numberOfLines={1} style={styles.columnLabel}>{column.label}</Text>}</View>)}<Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable></View>{openFilter ? <Modal transparent visible animationType="fade" onRequestClose={() => setOpenFilter(null)}><Pressable style={styles.filterBackdrop} onPress={() => setOpenFilter(null)}><Pressable style={styles.filterPopover} onPress={() => undefined}><View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>{dateFilterOpen ? 'MEETING DATE RANGE' : columns.find((column) => column.key === openFilter)?.label}</Text><Text style={styles.filterPopoverHint}>{dateFilterOpen ? 'Choose a start and end date' : 'Select one or more values'}</Text></View><Pressable onPress={() => setOpenFilter(null)}><Icon source="close" size={18} color="#64748B" /></Pressable></View>{dateFilterOpen ? <View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{dateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar value={dateRange[dateTarget]} onSelect={(value) => { setDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View> : <ScrollView style={styles.filterChoices}>{optionsFor(openFilter).map((option) => { const checked = draftChoices.includes(option); return <Pressable key={option} onPress={() => setDraftChoices((items) => checked ? items.filter((item) => item !== option) : [...items, option])} style={[styles.filterChoice, checked && styles.filterChoiceSelected]}><View style={[styles.filterCheckbox, checked && styles.filterCheckboxSelected]}>{checked ? <Icon source="check" size={13} color="#FFFFFF" /> : null}</View><Text style={[styles.filterChoiceText, checked && styles.filterChoiceTextSelected]}>{option.replace(/_/g, ' ')}</Text></Pressable>; })}</ScrollView>}<View style={styles.filterActions}><Pressable onPress={() => dateFilterOpen ? setDateRange({ from: '', to: '' }) : setDraftChoices([])} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable><Pressable onPress={() => { onFiltersChange((current) => ({ ...current, [openFilter]: dateFilterOpen ? (dateRange.from || dateRange.to ? `range:${dateRange.from},${dateRange.to}` : '') : draftChoices.join('|') })); setOpenFilter(null); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable></View></Pressable></Pressable></Modal> : null}</>;
  return <><View style={[styles.listHeader, styles.desktopRow]}>{columns.map((column, index) => <Text key={column.key} numberOfLines={1} style={[styles.columnLabel, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>{column.label}</Text>)}<View style={styles.desktopActionColumn} /></View><View style={[styles.filterRow, styles.desktopRow]}>{columns.map((column, index) => <View key={column.key} style={[styles.filterCell, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}><Icon source="filter-variant" size={11} color="#64748B" /><TextInput value={filters[column.key] ?? ''} onChangeText={(value) => onFiltersChange((current) => ({ ...current, [column.key]: value }))} placeholder="Filter" placeholderTextColor="#94A3B8" style={styles.columnFilterInput} /></View>)}<Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable></View></>;
}

const baseFields = (m: MeetingResponse) => [['Client Name', m.clientName], ['Mobile Number', m.mobileNumber], ['Sales Person', m.employeeName], ['Employee Code', m.employeeCode], ['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['Meeting Mode', m.meetingMode], ['Location', m.meetingLocation ?? m.location ?? m.address]] as const;
function Cards({ items, filters = {}, empty, action, onOpen, verified = false }: { items: readonly MeetingResponse[]; filters?: MeetingColumnFilter; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean }) {
  const compact = useWindowDimensions().width < 760;
  const visibleItems = filterMeetingRecords(items, filters);
  if (!visibleItems.length) return <State message={Object.values(filters).some(Boolean) ? 'No meetings match these filters.' : empty} />;
  if (compact) return <View style={styles.list}>{visibleItems.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.mobileRow, i % 2 === 1 && styles.listRowAlternate]}><View style={styles.personCell}><View style={styles.cellCopy}><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(m.mobileNumber)}</Text></View></View><View style={styles.mobileMeeting}><Text style={styles.cellMain}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.cellSub}>{show(m.meetingDate)} · {show(m.nextMeetingDate)}{verified ? ` · Verified by ${show(m.verifiedBy)}` : ''}</Text></View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.mobileAction}><Icon source="chevron-right" size={16} color="#3156C8" /></Pressable> : null}</View>)}</View>;
  const columns = [
    ['NUMBER', (m: MeetingResponse) => m.mobileNumber],
    ['MEETING TYPE', (m: MeetingResponse) => m.meetingTitle ?? m.meetingType],
    ['SALES PERSON', (m: MeetingResponse) => m.employeeName],
    ['LEAD STATUS', (m: MeetingResponse) => m.leadStatus],
    ['MEETING DATE', (m: MeetingResponse) => m.meetingDate],
    ['NEXT PLAN DATE', (m: MeetingResponse) => m.nextMeetingDate],
    ['JOINED', (m: MeetingResponse) => m.aloneWith],
    ...(verified ? [['VERIFIED BY', (m: MeetingResponse) => m.verifiedBy] as const] : []),
  ] as const;
  return <View style={styles.desktopTable}>{visibleItems.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.listRow, styles.desktopRow, i % 2 === 1 && styles.listRowAlternate]}><View style={[styles.personCell, styles.fluidColumn, styles.clientColumn]}><View style={styles.cellCopy}><Text numberOfLines={1} style={styles.client}>{show(m.clientName)}</Text></View></View>{columns.map(([label, value]) => <View key={label} style={[styles.cell, styles.fluidColumn, label === 'LEAD STATUS' && styles.leadStatusColumn]}><Text numberOfLines={1} style={[styles.cellMain, label === 'LEAD STATUS' && styles.status, label === 'LEAD STATUS' && styles.leadStatusValue, label === 'LEAD STATUS' && m.leadStatus === 'CONVERTED_CLIENT' && styles.statusVerified, label === 'JOINED' && styles.joinedBadge]}>{label === 'LEAD STATUS' ? show(value(m)).replace(/_/g, ' ') : show(value(m))}</Text></View>)}{onOpen ? <Pressable onPress={() => onOpen(m)} style={({ pressed }) => [styles.rowAction, styles.desktopActionColumn, pressed && styles.rowActionPressed]}><Text numberOfLines={1} style={styles.rowActionText}>{action}</Text><Icon source="chevron-right" size={13} color="#3156C8" /></Pressable> : <View style={styles.desktopActionColumn} />}</View>)}</View>;
}
function Details({ meeting: m }: { meeting: MeetingResponse }) {
  const meetingPlace = m.meetingLocation ?? m.location ?? m.address;
  const mapUrl = mapUrlFor(m);
  const overviewFields = [['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Next Plan Date', m.nextMeetingDate], ['Lead Status', m.leadStatus?.replace(/_/g, ' ')]] as const;
  const contactFields = [['Mobile Number', m.mobileNumber], ['Sales Person', m.employeeName], ['Sales Person ID', m.employeeCode], ...(m.meetingCode || m.id ? [['Meeting ID', m.meetingCode ?? m.id] as const] : []), ['Joined With', m.aloneWith]] as const;
  return <View style={styles.detailsWrap}>
    <View style={styles.overviewGrid}>{overviewFields.map(([label, field], index) => <View key={label} style={[styles.overviewCard, [styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.overviewStatusCard][index]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={[styles.overviewValue, index === 3 && styles.overviewStatusText]}>{show(field)}</Text></View>)}</View>
    <View style={styles.contactGrid}>{contactFields.map(([label, field], index) => <View key={label} style={[styles.contactCard, [styles.toneSlate, styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.toneAmber][index % 5]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={styles.detailValue}>{show(field)}</Text></View>)}</View>
    <View style={styles.contextGrid}>{m.remarks || m.meetingRemarks ? <View style={[styles.contextCard, styles.remarksCard, styles.remarksWide]}><View style={styles.contextHeading}><Icon source="comment-text-outline" size={15} color="#A16207" /><Text style={styles.contextLabel}>REMARKS</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(m.remarks ?? m.meetingRemarks)}</Text></View> : null}{meetingPlace ? <View style={[styles.contextCard, styles.locationCard, styles.locationNarrow]}><View style={styles.contextHeading}><Icon source="map-marker-outline" size={15} color="#0F766E" /><Text style={styles.contextLabel}>MEETING LOCATION</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(meetingPlace)}</Text></View> : null}{mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={[styles.mapButton, styles.mapButtonCompact]}><Icon source="map-marker-radius" size={17} color="#FFFFFF" /><Text style={styles.mapButtonText}>Open in Google Maps</Text></Pressable> : null}</View>
  </View>;
}
function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) { const fields = [['Verified By', m.verifiedBy], ['Verification Date', m.meetingVerificationDate], ...FIELDS.map((field) => [field.label, m[field.key]] as const)]; return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View></View>; }
function State({ message, loading = false }: { message: string; loading?: boolean }) { return <View style={styles.state}>{loading ? <ActivityIndicator color="#4F46E5" /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}<Text style={styles.stateText}>{message}</Text></View>; }
function HeaderLeadFilters({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter, search, setSearch }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void; search: string; setSearch: (value: string) => void }) { const compact = useWindowDimensions().width < 760; const coordinators = [...new Set(leads.map((lead) => lead.assignedByEmployeeName).filter(Boolean))] as string[]; const salesPeople = [...new Set(leads.filter((lead) => !coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter).map((lead) => lead.assignedEmployeeName).filter(Boolean))] as string[]; return <View style={[styles.headerLeadFilters, compact && styles.headerLeadFiltersCompact]}><TextInput value={search} onChangeText={setSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} /><View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Icon source="account-tie-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker selectedValue={coordinatorFilter} onValueChange={(value) => { setCoordinatorFilter(String(value)); setSalesPersonFilter(''); }} style={styles.headerLeadPickerControl}><Picker.Item label="All Coordinators" value="" />{coordinators.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View><View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact, !coordinatorFilter && styles.headerLeadPickerDisabled]}><Icon source="account-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker enabled={Boolean(coordinatorFilter)} selectedValue={salesPersonFilter} onValueChange={(value) => setSalesPersonFilter(String(value))} style={styles.headerLeadPickerControl}><Picker.Item label={coordinatorFilter ? 'All Sales Persons' : 'Select coordinator first'} value="" />{salesPeople.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View></View>; }
function AssignedLeadCards({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void }) { const compact = useWindowDimensions().width < 760; const visible = leads.filter((lead) => (!coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter) && (!salesPersonFilter || lead.assignedEmployeeName === salesPersonFilter)); return <View style={[styles.assignedLeadWrap, compact && styles.assignedLeadWrapCompact]}><View style={[styles.assignedLeadGrid, compact && styles.assignedLeadGridCompact]}>{visible.length ? visible.map((lead) => <View key={lead.leadId ?? lead.leadCode} style={[styles.assignedLeadCard, compact && styles.assignedLeadCardCompact, [styles.leadToneBlue, styles.leadToneTeal, styles.leadToneViolet, styles.leadToneAmber][leadCardTone(lead)]]}><View style={styles.assignedLeadTop}><View style={styles.assignedLeadCopy}><Text numberOfLines={1} style={styles.assignedLeadName}>{show(lead.clientName)}</Text><Text style={styles.assignedLeadMeta}>{show(lead.mobileNumber)}</Text></View><View style={styles.leadStatusPill}><Text style={styles.leadStatusPillText}>{show(lead.leadStatus).replace(/_/g, ' ')}</Text></View></View><View style={styles.assignedLeadDivider} /><View style={[styles.assignedLeadDetails, compact && styles.assignedLeadDetailsCompact]}><View><Text style={styles.assignLabel}>SALES PERSON</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedEmployeeName)}</Text></View><View><Text style={styles.assignLabel}>ASSIGNED DATE</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedAt)}</Text></View><View><Text style={styles.assignLabel}>LAST MEETING / VERIFIED</Text><Text style={styles.assignedLeadValue}>{show(lead.audit?.updatedAt)}</Text></View></View></View>) : <State message="No assigned leads match these filters." />}</View></View>; }
const styles = StyleSheet.create({
  headerSearch: { width: 190, height: 32, paddingHorizontal: 10, borderWidth: 1, borderColor: '#91A7E0', borderRadius: 7, color: '#FFFFFF', fontSize: 9, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.12)' }, headerSearchCompact: { width: '100%', height: 38, fontSize: 11 },
  headerLeadFilters: { flexDirection: 'row', gap: 8 }, headerLeadFiltersCompact: { width: '100%', flexDirection: 'column', gap: 7 }, headerLeadFilter: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6 }, headerLeadFilterCompact: { width: '100%' }, headerLeadPicker: { width: 190, height: 36, overflow: 'hidden', borderRadius: 8, backgroundColor: '#FFFFFF' }, headerLeadPickerCompact: { flex: 1, width: undefined }, headerLeadPickerDisabled: { opacity: 0.5 }, headerLeadPickerControl: { height: 36, color: '#1E3A8A', fontSize: 9, fontWeight: '800' },
  leadToneBlue: { borderTopColor: '#3156C8', borderLeftColor: '#3156C8' }, leadToneTeal: { borderTopColor: '#0F8C7F', borderLeftColor: '#0F8C7F' }, leadToneViolet: { borderTopColor: '#7C3AED', borderLeftColor: '#7C3AED' }, leadToneAmber: { borderTopColor: '#D97706', borderLeftColor: '#D97706' },
  assignedLeadWrap: { gap: 10, padding: 12 }, assignedLeadWrapCompact: { padding: 10 }, coordinatorFilterCard: { display: 'none', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderWidth: 1, borderColor: '#D8E3FB', borderRadius: 12, backgroundColor: '#F6F8FF' }, coordinatorFilterIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E3EBFF' }, coordinatorFilterCopy: { minWidth: 0, flex: 1 }, coordinatorFilterTitle: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' }, coordinatorFilterHint: { marginTop: 2, color: '#71809A', fontSize: 8, fontWeight: '700' }, coordinatorPicker: { width: 220, height: 40, overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 9, backgroundColor: '#FFFFFF' }, coordinatorPickerDisabled: { opacity: 0.5, backgroundColor: '#F1F5F9' }, assignedLeadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, assignedLeadGridCompact: { flexDirection: 'column', flexWrap: 'nowrap', gap: 10 }, assignedLeadCard: { width: '32.5%', minWidth: 0, flexGrow: 0, gap: 8, padding: 11, borderWidth: 1, borderTopWidth: 2, borderTopColor: '#3156C8', borderLeftWidth: 4, borderLeftColor: '#3156C8', borderColor: '#DCE3ED', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, assignedLeadCardCompact: { width: '100%', minHeight: 128, padding: 13 }, assignedLeadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, assignedLeadAvatar: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E8EEFF' }, assignedLeadAvatarText: { color: '#3156C8', fontSize: 11, fontWeight: '900' }, assignedLeadCopy: { minWidth: 0, flex: 1 }, assignedLeadName: { color: '#28447F', fontSize: 11, fontWeight: '800' }, assignedLeadMeta: { marginTop: 3, color: '#71809A', fontSize: 8, fontWeight: '600' }, assignedLeadValue: { marginTop: 3, color: '#42536F', fontSize: 9, fontWeight: '700' }, assignedLeadDivider: { height: 1, backgroundColor: '#E8EDF4' }, assignedLeadDetails: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, assignedLeadDetailsCompact: { flexDirection: 'column', gap: 7 }, leadStatusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: '#FFF7E8' }, leadStatusPillText: { color: '#A95A08', fontSize: 7, fontWeight: '900' },
  assignPickerShell: { height: 42, overflow: 'hidden', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' },
  assignPicker: { height: 42, color: '#172033', fontSize: 11, fontWeight: '700' },
  detailsWrap: { gap: 11 },
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
  exportButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  leadStatusColumn: { flex: 1.26 },
  leadStatusValue: { marginLeft: -5 },
  filterRow: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#F0F4FF' },
  filterCell: { height: 24, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, borderWidth: 1, borderColor: '#D9E2F4', borderRadius: 5, backgroundColor: '#FFFFFF' },
  columnFilterInput: { minWidth: 0, flex: 1, height: 22, padding: 0, color: '#334155', fontSize: 8, fontWeight: '600' },
  columnFilterPicker: { minWidth: 0, flex: 1, height: 24, color: '#334155', fontSize: 8 },
  verifiedListHeader: { height: 44, backgroundColor: '#EEF3FF' },
  headerColumn: { minWidth: 0, justifyContent: 'center' },
  headerFilterButton: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, paddingVertical: 3, borderRadius: 5 },
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
  workspaceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderWidth: 1, borderColor: '#D8E1F0', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  workspaceHeaderCompact: { flexDirection: 'column', alignItems: 'stretch' },
  joinedBadge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, color: '#0F766E', backgroundColor: '#DFF5EF', fontSize: 8, fontWeight: '700' },
  syncControls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: '#A7DFD7', backgroundColor: '#ECFDF8' },
  syncControlsCompact: { width: '100%', justifyContent: 'space-between' },
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
  assignFieldCompact: { width: '100%', minWidth: 0 },
  assignLabel: { color: '#44516A', fontSize: 9, fontWeight: '900' },
  assignInput: { height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, color: '#172033', fontSize: 11, fontWeight: '700', backgroundColor: '#FFFFFF' },
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
  assignButton: { minWidth: 170, height: 42, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 20, borderRadius: 9, backgroundColor: '#4F46E5', shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
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
  metrics: { flexDirection: 'row', gap: 5 }, metricsCompact: { flexWrap: 'wrap' }, metric: { minWidth: 118, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E3E8F0', borderLeftWidth: 3, borderRadius: 8, backgroundColor: '#FFFFFF' }, metricAccentBlue: { borderLeftColor: '#4F46E5', borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }, metricAccentGreen: { borderLeftColor: '#20A878' }, metricAccentOrange: { borderLeftColor: '#F59E0B', borderColor: '#FDE0AE', backgroundColor: '#FFF7E8' }, metricIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, metricBlue: { backgroundColor: '#DCE4FF' }, metricGreen: { backgroundColor: '#ECF9F4' }, metricOrange: { backgroundColor: '#FFE7BD' }, metricValue: { color: '#172033', fontSize: 13, fontWeight: '900' }, metricLabel: { color: '#727E91', fontSize: 8, fontWeight: '700' },
  workspace: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, workspaceCompact: { flexDirection: 'column', alignItems: 'stretch' }, contentPanel: { minWidth: 0, minHeight: 0, flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, contentHeading: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 11, borderLeftWidth: 4, borderLeftColor: '#38BDF8', borderBottomWidth: 1, borderBottomColor: '#293D7C', backgroundColor: '#22356F' }, contentTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.15 }, contentSubtitle: { marginTop: 3, color: '#CBD9FF', fontSize: 9, fontWeight: '500' }, resultsScroll: { flex: 1, minHeight: 0 }, resultsContent: { flexGrow: 1 },
  tabs: { width: '100%', height: 36, flexDirection: 'row', gap: 5, padding: 3, borderWidth: 1, borderColor: '#DFE4ED', borderRadius: 9, backgroundColor: '#FFFFFF' }, workspaceTabs: { minWidth: 360, flex: 1, width: undefined, height: 36, borderWidth: 0, backgroundColor: '#F5F7FC' }, tabsCompact: { height: 'auto', flexDirection: 'column' }, tabsLabel: { color: '#A1A9B7', fontSize: 8, fontWeight: '900' }, tab: { minHeight: 28, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7, borderWidth: 1, borderRadius: 7 }, tabToday: { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }, tabTodayActive: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' }, tabResponses: { borderColor: '#DDD6FE', backgroundColor: '#F5F3FF' }, tabResponsesActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' }, tabTasks: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }, tabTasksActive: { borderColor: '#059669', backgroundColor: '#059669' }, tabAssign: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }, tabAssignActive: { borderColor: '#D97706', backgroundColor: '#D97706' }, tabIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 5 }, tabTodayIcon: { backgroundColor: '#DBEAFE' }, tabResponsesIcon: { backgroundColor: '#EDE9FE' }, tabTasksIcon: { backgroundColor: '#D1FAE5' }, tabAssignIcon: { backgroundColor: '#FEF3C7' }, tabIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' }, tabText: { fontSize: 9, fontWeight: '800' }, tabTodayColor: { color: '#4338CA' }, tabResponsesColor: { color: '#6D28D9' }, tabTasksColor: { color: '#047857' }, tabAssignColor: { color: '#B45309' }, tabTextActive: { color: '#FFFFFF', fontWeight: '900' }, badge: { minWidth: 18, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden', borderRadius: 9, textAlign: 'center', fontSize: 7, fontWeight: '900' }, badgeToday: { color: '#4338CA', backgroundColor: '#DDE5FF' }, badgeActive: { color: '#2949B6', backgroundColor: '#FFFFFF' }, permission: { color: '#64748B', fontSize: 8, fontWeight: '600' },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, backgroundColor: '#FFFFFF' }, stateText: { color: '#64748B', textAlign: 'center', fontSize: 9, fontWeight: '700' }, list: { width: '100%' }, listHeader: { height: 29, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#EAF0FD' }, listHeaderCompact: { display: 'none' }, columnLabel: { width: 120, color: '#4B6093', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }, personColumn: { width: 200 }, personColumnCompact: { width: '100%' }, actionColumn: { width: 150 }, listRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#DAE1F3', backgroundColor: '#EEF0FF' }, listRowAlternate: { backgroundColor: '#E9F7F3' }, listRowCompact: { height: 'auto', minHeight: 74, flexWrap: 'wrap', paddingVertical: 8 }, personCell: { flexDirection: 'row', alignItems: 'center', gap: 0 }, avatar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 10, backgroundColor: '#E0E7FF' }, avatarText: { color: '#4338CA', fontSize: 11, fontWeight: '800' }, cellCopy: { minWidth: 0, flex: 1 }, cell: { width: 120 }, cellCompact: { width: '30%', flexGrow: 1 }, cellMain: { color: '#334155', fontSize: 10, fontWeight: '600' }, cellSub: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, client: { color: '#142039', fontSize: 10, fontWeight: '900' }, code: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, status: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#F3DFC1', borderRadius: 99, color: '#A95A08', fontSize: 8, fontWeight: '900', letterSpacing: 0.25, backgroundColor: '#FFF7EA' }, statusVerified: { color: '#117A54', borderColor: '#CDEBDE', backgroundColor: '#EAF8F1' }, rowAction: { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 7, backgroundColor: '#E9EEFF', borderWidth: 1, borderColor: '#CFDAFF' }, rowActionCompact: { flexGrow: 1 }, rowActionPressed: { backgroundColor: '#EDF2FF' }, rowActionText: { color: '#2D52C7', fontSize: 9, fontWeight: '900' }, label: { color: '#8390A6', fontSize: 7, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  taskSection: { gap: 16 }, summaries: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, summary: { minWidth: 210, flexGrow: 1, padding: 15, borderWidth: 1, borderColor: '#DDE7FF', borderRadius: 15, backgroundColor: '#F4F7FF' }, summaryName: { color: '#1E3A8A', fontWeight: '900' }, summaryLine: { marginTop: 4, color: '#58667D', fontSize: 10, fontWeight: '700' }, filters: { flexDirection: 'row', alignItems: 'center', gap: 10 }, filtersCompact: { flexDirection: 'column', alignItems: 'stretch' }, filterInput: { minWidth: 240, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: '#D7DDE8', borderRadius: 12, backgroundColor: '#FFFFFF' }, chips: { gap: 6 }, chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: '#E9EDF5' }, chipActive: { backgroundColor: '#3156C8' }, chipText: { color: '#536078', fontSize: 9, fontWeight: '900' }, chipTextActive: { color: '#FFFFFF' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' }, modal: { width: '100%', maxWidth: 900, maxHeight: '94%', overflow: 'hidden', borderRadius: 21, backgroundColor: '#fff' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }, modalHeaderCopy: { minWidth: 0, flex: 1 }, modalEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, modalEyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6366F1' }, modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, modalTitle: { marginTop: 3, color: '#0F172A', fontSize: 18, fontWeight: '900' }, modalMeta: { marginTop: 2, color: '#70809B', fontSize: 8, fontWeight: '700' }, close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#E2E8F0' }, modalBody: { gap: 13, padding: 15 }, sectionTitle: { marginBottom: 6, color: '#172554', fontSize: 13, fontWeight: '900' }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, detail: { width: '30%', minWidth: 150, flexGrow: 1, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, backgroundColor: '#F8FAFC' }, detailValue: { marginTop: 3, color: '#0F172A', fontSize: 9, fontWeight: '700' }, formSection: { gap: 9, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#E2E8F0' }, help: { color: '#64748B', fontSize: 9, fontWeight: '600' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 30, elevation: 30 }, field: { width: '31%', minWidth: 190, flexGrow: 1, gap: 3 }, fieldLabel: { color: '#334155', fontSize: 10, fontWeight: '800' }, input: { paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, color: '#0F172A' }, timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, timePicker: { width: 112, minWidth: 0, flexGrow: 0, flexShrink: 1 }, timeSeparator: { color: '#64748B', fontSize: 14, fontWeight: '900' }, secondsBox: { width: 42, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#F1F5F9' }, secondsValue: { color: '#475569', fontSize: 10, fontWeight: '900' }, error: { color: '#DC2626', fontSize: 10, fontWeight: '800' }, submit: { zIndex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#4F46E5' }, disabled: { opacity: .6 }, submitText: { color: '#fff', fontWeight: '900' },
});
