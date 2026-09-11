import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Icon } from 'react-native-paper';
import { leadService } from '../services/LeadService';
import { meetingService } from '../services/MeetingService';
import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';
import { theme } from '../theme/theme';
import { createMeetingVerificationForm } from './meetingVerificationForm';

type Tab = 'today' | 'responses' | 'tasks' | 'assign';
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
  { key: 'responses', label: 'PC Meeting Response', icon: 'clipboard-check-outline' },
  { key: 'tasks', label: 'Sales Person Tasks', icon: 'account-group-outline' },
  { key: 'assign', label: 'Assign New Lead', icon: 'account-plus-outline' },
];
const emptyAssignForm = () => ({ clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', salesPersonEmployeeCode: '' });
const FIELDS: readonly { key: VerificationField; label: string; placeholder: string }[] = [
  { key: 'meetingTiming', label: 'Meeting Time', placeholder: 'HH:mm:ss' },
  { key: 'ageGroup', label: 'Age Group', placeholder: 'Backend code, e.g. AGE_25_35' },
  { key: 'existingSip', label: 'Any Prior Investment', placeholder: 'Backend value, e.g. YES' },
  { key: 'profession', label: 'Profession', placeholder: 'Backend code, e.g. DOCTOR' },
  { key: 'professionDetail', label: 'Clinic / Company / Firm Name', placeholder: 'Profession details' },
  { key: 'bestTimeForMeeting', label: 'Best Time for Meeting', placeholder: 'Backend code, e.g. EVENING' },
  { key: 'meetingWith', label: 'Meeting With', placeholder: 'Backend code, e.g. SOMEONE_ELSE' },
  { key: 'personName', label: 'Person / Joined Person Name', placeholder: 'Person name' },
  { key: 'position', label: 'Position', placeholder: 'Position' },
];
const emptyForm = (): VerificationForm => ({ meetingTiming: '', ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '', meetingWith: '', personName: '', position: '' });
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
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
const POSITION_OPTIONS = ['Sales person', 'Team Leader', 'Admin', 'Super Admin'] as const;
const SALES_PERSON_CODES = ['RK1507', 'AS0108', 'AK0107', 'RG1108', 'HP0605', 'AK0108', 'SM2403', 'GK0902', 'AS1909', 'US2601'] as const;
const show = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const timeText = (v?: { hour?: number; minute?: number; second?: number } | string) => typeof v === 'string' ? v : v?.hour === undefined ? '—' : [v.hour, v.minute ?? 0, v.second ?? 0].map((n) => String(n).padStart(2, '0')).join(':');
const mapUrlFor = (meeting: MeetingResponse) => meeting.googleMapsUrl || (meeting.latitude != null && meeting.longitude != null ? `https://www.google.com/maps?q=${meeting.latitude},${meeting.longitude}` : null);
const filterMeetingRecords = (items: readonly MeetingResponse[], filters: MeetingColumnFilter) => items.filter((meeting) => Object.entries(filters).every(([key, filter]) => !filter || String(key === 'meetingTitle' ? meeting.meetingTitle ?? meeting.meetingType ?? '' : meeting[key as keyof MeetingResponse] ?? '').toLowerCase().includes(filter.toLowerCase())));
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODAY' | 'PENDING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      const [p, v, all] = await Promise.all([meetingService.getVerificationMeetings('PENDING'), meetingService.getVerificationMeetings('VERIFIED'), meetingService.getAllMeetingRecords()]);
      if (generation !== dataGeneration.current) return;
      setPending(p); setVerified(v); setMeetings(all);
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
          return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, styles[`tab${tone}`], selected && styles[`tab${tone}Active`]]}><View style={[styles.tabIcon, styles[`tab${tone}Icon`], selected && styles.tabIconActive]}><Icon source={item.icon} size={14} color={selected ? '#FFFFFF' : styles[`tab${tone}Color`].color} /></View><Text style={[styles.tabText, styles[`tab${tone}Color`], selected && styles.tabTextActive]}>{item.label}</Text>{item.key === 'today' ? <Text style={[styles.badge, styles.badgeToday, selected && styles.badgeActive]}>{pending.length}</Text> : null}</Pressable>;
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
    <View style={styles.contentPanel}><View style={styles.contentHeading}><View style={styles.contentHeadingRow}><View><Text style={styles.contentTitle}>{TABS.find((item) => item.key === tab)?.label}</Text><Text style={styles.contentSubtitle}>{tab === 'today' ? `${pending.length} meetings waiting for verification` : tab === 'responses' ? `${verified.length} meetings already verified by the Sales Coordinator` : tab === 'assign' ? 'Create a physical lead and assign it to a sales person' : 'Track ownership and meeting progress'}</Text></View>{(tab === 'today' || tab === 'responses') ? <Pressable onPress={exportCurrentList} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}><Icon source="file-excel-outline" size={15} color="#FFFFFF" /><Text style={styles.exportButtonText}>Export Excel</Text></Pressable> : null}</View></View>
    {!compact && !loading && !error && tab !== 'assign' && tab !== 'tasks' ? <MeetingTableHeader verified={tab === 'responses'} records={tab === 'responses' ? verified : pending} filters={tab === 'responses' ? responseColumnFilters : todayColumnFilters} onFiltersChange={tab === 'responses' ? setResponseColumnFilters : setTodayColumnFilters} /> : null}
    <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
    {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
    {loading ? <State loading message="Loading coordinator workspace..." /> : error ? <State message={error} /> : null}
    {!loading && !error && tab === 'today' ? <Cards items={pending} filters={todayColumnFilters} empty="No meetings are pending Process Coordinator verification." action="Verify / Update Details" onOpen={openVerify} /> : null}
    {!loading && !error && tab === 'responses' ? <Cards items={verified} filters={responseColumnFilters} empty="No meetings have been verified by the Sales Coordinator yet." action="View Complete Response" onOpen={setSelected} verified /> : null}
    {!loading && !error && tab === 'assign' ? <View style={styles.assignWrap}><View style={styles.assignIntro}><View style={styles.assignIntroIcon}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View><Text style={styles.assignIntroTitle}>Lead information</Text><Text style={styles.assignIntroText}>Enter the client details and the employee code that should own this lead.</Text></View></View><View style={styles.assignGrid}>{([['clientName', 'Client Name', 'e.g. Dr. Rajesh Kumar'], ['mobileNumber', 'Mobile Number', '10-digit mobile number'], ['location', 'Location', 'City or area'], ['clinicAddress', 'Clinic Address', 'Complete clinic address'], ['speciality', 'Speciality', 'e.g. Cardiologist'], ['salesPersonEmployeeCode', 'Employee Code', 'e.g. EMP000011']] as const).map(([key, label, placeholder]) => <View key={key} style={[styles.assignField, compact && styles.assignFieldCompact]}><Text style={styles.assignLabel}>{label}</Text>{key === 'salesPersonEmployeeCode' ? <View style={styles.assignPickerShell}><Picker selectedValue={assignForm.salesPersonEmployeeCode} onValueChange={(value) => setAssignForm((current) => ({ ...current, salesPersonEmployeeCode: String(value) }))} style={styles.assignPicker}><Picker.Item label="Select employee code" value="" />{SALES_PERSON_CODES.map((code) => <Picker.Item key={code} label={code} value={code} />)}</Picker></View> : <TextInput value={assignForm[key]} onChangeText={(text) => setAssignForm((current) => ({ ...current, [key]: key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : text }))} placeholder={placeholder} placeholderTextColor="#A1A9B7" autoCapitalize="sentences" keyboardType={key === 'mobileNumber' ? 'phone-pad' : 'default'} style={styles.assignInput} />}</View>)}</View>{assignMessage ? <View style={[styles.assignFeedback, assignMessage.type === 'success' ? styles.assignSuccess : styles.assignError]}><Icon source={assignMessage.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={assignMessage.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.assignFeedbackText, assignMessage.type === 'error' && styles.assignErrorText]}>{assignMessage.text}</Text></View> : null}<Pressable disabled={assigning} onPress={() => void assignLead()} style={({ pressed }) => [styles.assignButton, assigning && styles.disabled, pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={styles.assignButtonText}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View> : null}
    {!loading && !error && tab === 'tasks' ? <View style={styles.taskSection}>
      <View style={styles.summaries}>{Object.entries(summaries).map(([key, row]) => <View key={key} style={styles.summary}><Text style={styles.summaryName}>{row.name}</Text><Text style={styles.summaryLine}>Today {row.TODAY} · Pending {row.PENDING}</Text><Text style={styles.summaryLine}>Overdue {row.OVERDUE} · Completed {row.COMPLETED}</Text></View>)}</View>
      <View style={[styles.filters, compact && styles.filtersCompact]}><TextInput value={employeeFilter} onChangeText={setEmployeeFilter} placeholder="Filter by sales person" style={styles.filterInput} /><ScrollView horizontal contentContainerStyle={styles.chips}>{(['ALL', 'TODAY', 'PENDING', 'OVERDUE', 'COMPLETED'] as const).map((s) => <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.chip, statusFilter === s && styles.chipActive]}><Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text></Pressable>)}</ScrollView></View>
      <Cards items={filteredTasks} empty="No meeting tasks match these client-side filters." />
    </View> : null}
    </ScrollView>
    </View>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text>{selected ? <Text style={styles.modalMeta}>{show(selected.meetingTitle ?? selected.meetingType)} · {show(selected.meetingDate)} · {show(selected.employeeName)}</Text> : null}</View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
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

  if (!isVerificationFieldVisible(field.key, form.meetingWith)) return null;

  if (field.key === 'meetingTiming') {
    const [selectedHour = ''] = form.meetingTiming.split(':');
    const updateTime = (hour: string) => {
      update(hour ? `${hour}:00:00` : '');
    };
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.timePickerRow}>
          <View style={[styles.pickerShell, styles.timePicker]}>
            <Picker selectedValue={selectedHour} onValueChange={updateTime} style={styles.picker}>
              <Picker.Item label="Hour" value="" />
              {HOURS.map((hour) => <Picker.Item key={hour} label={hour} value={hour} />)}
            </Picker>
          </View>
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
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <View style={styles.pickerShell}>
          <Picker selectedValue={form[field.key]} onValueChange={update} style={styles.picker}>
            <Picker.Item label="Select an option" value="" />
            {options.map((option) => <Picker.Item key={option} label={field.key === 'ageGroup' ? AGE_GROUP_LABELS[option] : field.key === 'profession' ? PROFESSION_LABELS[option] : option} value={option} />)}
          </Picker>
        </View>
      </View>
    );
  }

  return <View style={styles.field}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput value={form[field.key]} onChangeText={update} placeholder={field.placeholder} style={styles.input} /></View>;
}

const FILTER_COLUMNS: { key: keyof MeetingColumnFilter; label: string }[] = [
  { key: 'clientName', label: 'CLIENT NAME' }, { key: 'mobileNumber', label: 'NUMBER' }, { key: 'meetingTitle', label: 'MEETING TYPE' }, { key: 'employeeName', label: 'SALES PERSON' }, { key: 'leadStatus', label: 'LEAD STATUS' }, { key: 'meetingDate', label: 'MEETING DATE' }, { key: 'nextMeetingDate', label: 'NEXT PLAN DATE' }, { key: 'aloneWith', label: 'JOINED' },
];
function MeetingTableHeader({ verified = false, records, filters, onFiltersChange }: { verified?: boolean; records: readonly MeetingResponse[]; filters: MeetingColumnFilter; onFiltersChange: React.Dispatch<React.SetStateAction<MeetingColumnFilter>> }) {
  const [openFilter, setOpenFilter] = useState<keyof MeetingColumnFilter | null>(null);
  const columns = verified ? [...FILTER_COLUMNS, { key: 'verifiedBy' as const, label: 'VERIFIED BY' }] : FILTER_COLUMNS;
  const dropdownKeys: (keyof MeetingColumnFilter)[] = verified
    ? ['employeeName', 'verifiedBy', 'meetingTitle', 'leadStatus']
    : ['employeeName', 'meetingTitle', 'leadStatus'];
  const optionsFor = (key: keyof MeetingColumnFilter) => [...new Set(records.map((record) => String(key === 'meetingTitle' ? record.meetingTitle ?? record.meetingType ?? '' : record[key as keyof MeetingResponse] ?? '')).filter(Boolean))].sort();
  return <><View style={[styles.listHeader, styles.verifiedListHeader, styles.desktopRow]}>{columns.map((column, index) => <View key={column.key} style={[styles.headerColumn, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>{dropdownKeys.includes(column.key) ? <Pressable onPress={() => setOpenFilter(column.key)} style={styles.headerFilterButton}><Text numberOfLines={1} style={[styles.headerFilterText, filters[column.key] && styles.columnLabelFiltered]}>{column.label}</Text><View style={[styles.headerFilterIcon, filters[column.key] && styles.headerFilterIconActive]}><Icon source="filter-variant" size={10} color={filters[column.key] ? '#FFFFFF' : '#536B9F'} /></View></Pressable> : <Text numberOfLines={1} style={styles.columnLabel}>{column.label}</Text>}</View>)}<Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable></View>{openFilter ? <Modal transparent visible animationType="fade" onRequestClose={() => setOpenFilter(null)}><Pressable style={styles.filterBackdrop} onPress={() => setOpenFilter(null)}><Pressable style={styles.filterPopover} onPress={() => undefined}><View style={styles.filterPopoverTitle}><Text style={styles.filterPopoverTitleText}>{columns.find((column) => column.key === openFilter)?.label}</Text><Pressable onPress={() => setOpenFilter(null)}><Icon source="close" size={16} color="#64748B" /></Pressable></View><View style={styles.filterPopoverPicker}><Picker selectedValue={filters[openFilter] ?? ''} onValueChange={(value) => { onFiltersChange((current) => ({ ...current, [openFilter]: String(value) })); setOpenFilter(null); }}><Picker.Item label="All values" value="" />{optionsFor(openFilter).map((option) => <Picker.Item key={option} label={option.replace(/_/g, ' ')} value={option} />)}</Picker></View></Pressable></Pressable></Modal> : null}</>;
  return <><View style={[styles.listHeader, styles.desktopRow]}>{columns.map((column, index) => <Text key={column.key} numberOfLines={1} style={[styles.columnLabel, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}>{column.label}</Text>)}<View style={styles.desktopActionColumn} /></View><View style={[styles.filterRow, styles.desktopRow]}>{columns.map((column, index) => <View key={column.key} style={[styles.filterCell, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn]}><Icon source="filter-variant" size={11} color="#64748B" /><TextInput value={filters[column.key] ?? ''} onChangeText={(value) => onFiltersChange((current) => ({ ...current, [column.key]: value }))} placeholder="Filter" placeholderTextColor="#94A3B8" style={styles.columnFilterInput} /></View>)}<Pressable onPress={() => onFiltersChange({})} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable></View></>;
}

const baseFields = (m: MeetingResponse) => [['Client Name', m.clientName], ['Mobile Number', m.mobileNumber], ['Sales Person', m.employeeName], ['Employee Code', m.employeeCode], ['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['Meeting Mode', m.meetingMode], ['Location', m.meetingLocation ?? m.location ?? m.address]] as const;
function Cards({ items, filters = {}, empty, action, onOpen, verified = false }: { items: readonly MeetingResponse[]; filters?: MeetingColumnFilter; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean }) {
  const compact = useWindowDimensions().width < 760;
  const visibleItems = filterMeetingRecords(items, filters);
  if (!visibleItems.length) return <State message={Object.values(filters).some(Boolean) ? 'No meetings match these filters.' : empty} />;
  if (compact) return <View style={styles.list}>{visibleItems.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.mobileRow, i % 2 === 1 && styles.listRowAlternate]}><View style={styles.personCell}><View style={styles.avatar}><Text style={styles.avatarText}>{String(m.clientName ?? '?').slice(0, 1).toUpperCase()}</Text></View><View style={styles.cellCopy}><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(m.mobileNumber)}</Text></View></View><View style={styles.mobileMeeting}><Text style={styles.cellMain}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.cellSub}>{show(m.meetingDate)} · {show(m.nextMeetingDate)}{verified ? ` · Verified by ${show(m.verifiedBy)}` : ''}</Text></View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.mobileAction}><Icon source="chevron-right" size={16} color="#3156C8" /></Pressable> : null}</View>)}</View>;
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
  return <View style={styles.desktopTable}>{visibleItems.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.listRow, styles.desktopRow, i % 2 === 1 && styles.listRowAlternate]}><View style={[styles.personCell, styles.fluidColumn, styles.clientColumn]}><View style={styles.avatar}><Text style={styles.avatarText}>{String(m.clientName ?? '?').slice(0, 1).toUpperCase()}</Text></View><View style={styles.cellCopy}><Text numberOfLines={1} style={styles.client}>{show(m.clientName)}</Text></View></View>{columns.map(([label, value]) => <View key={label} style={[styles.cell, styles.fluidColumn, label === 'LEAD STATUS' && styles.leadStatusColumn]}><Text numberOfLines={1} style={[styles.cellMain, label === 'LEAD STATUS' && styles.status, label === 'LEAD STATUS' && styles.leadStatusValue, label === 'LEAD STATUS' && m.leadStatus === 'CONVERTED_CLIENT' && styles.statusVerified, label === 'JOINED' && styles.joinedBadge]}>{label === 'LEAD STATUS' ? show(value(m)).replace(/_/g, ' ') : show(value(m))}</Text></View>)}{onOpen ? <Pressable onPress={() => onOpen(m)} style={({ pressed }) => [styles.rowAction, styles.desktopActionColumn, pressed && styles.rowActionPressed]}><Text numberOfLines={1} style={styles.rowActionText}>{action}</Text><Icon source="chevron-right" size={13} color="#3156C8" /></Pressable> : <View style={styles.desktopActionColumn} />}</View>)}</View>;
}
function Details({ meeting: m }: { meeting: MeetingResponse }) {
  const meetingPlace = m.meetingLocation ?? m.location ?? m.address;
  const mapUrl = mapUrlFor(m);
  const primaryFields = [['Mobile Number', m.mobileNumber], ['Sales Person', m.employeeName], ['Employee Code', m.employeeCode], ['Meeting Mode', m.meetingMode], ['Meeting Time', timeText(m.meetingTime)], ['Joined With', m.aloneWith], ['Person Name', m.personName]] as const;
  return <View style={styles.detailsWrap}>
    <View style={styles.meetingOverview}>
      <View style={styles.overviewIcon}><Icon source="calendar-check-outline" size={20} color="#3156C8" /></View>
      <View style={styles.overviewCopy}><Text style={styles.overviewTitle}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.overviewSub}>{show(m.meetingDate)} · Next follow-up: {show(m.nextMeetingDate)}</Text></View>
      <View style={styles.overviewStatus}><Text style={styles.overviewStatusText}>{show(m.leadStatus).replace(/_/g, ' ')}</Text></View>
    </View>
    <View><Text style={styles.sectionTitle}>Meeting details</Text><View style={styles.detailGrid}>{primaryFields.map(([label, field]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(field)}</Text></View>)}</View></View>
    {(meetingPlace || m.remarks || m.meetingRemarks) ? <View style={styles.contextGrid}>{meetingPlace ? <View style={[styles.contextCard, styles.locationCard]}><View style={styles.contextHeading}><Icon source="map-marker-outline" size={15} color="#0F766E" /><Text style={styles.contextLabel}>MEETING LOCATION</Text></View><Text style={styles.contextValue}>{show(meetingPlace)}</Text></View> : null}{m.remarks || m.meetingRemarks ? <View style={[styles.contextCard, styles.remarksCard]}><View style={styles.contextHeading}><Icon source="comment-text-outline" size={15} color="#A16207" /><Text style={styles.contextLabel}>REMARKS</Text></View><Text style={styles.contextValue}>{show(m.remarks ?? m.meetingRemarks)}</Text></View> : null}</View> : null}
    {(m.latitude != null || m.longitude != null || mapUrl) ? <View style={styles.locationSection}><View style={styles.locationTitleRow}><Text style={styles.sectionTitle}>Live location</Text><Text style={styles.locationHint}>Captured during meeting</Text></View><View style={styles.detailGrid}><View style={styles.detail}><Text style={styles.label}>LATITUDE</Text><Text style={styles.detailValue}>{show(m.latitude)}</Text></View><View style={styles.detail}><Text style={styles.label}>LONGITUDE</Text><Text style={styles.detailValue}>{show(m.longitude)}</Text></View>{mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapButton}><Icon source="map-marker-radius" size={17} color="#FFFFFF" /><Text style={styles.mapButtonText}>Open in Google Maps</Text></Pressable> : null}</View></View> : null}
  </View>;
}
function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) { const fields = [['Verified By', m.verifiedBy], ['Verification Date', m.meetingVerificationDate], ...FIELDS.map((field) => [field.label, m[field.key]] as const)]; return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View></View>; }
function State({ message, loading = false }: { message: string; loading?: boolean }) { return <View style={styles.state}>{loading ? <ActivityIndicator color="#4F46E5" /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}<Text style={styles.stateText}>{message}</Text></View>; }

const styles = StyleSheet.create({
  assignPickerShell: { height: 42, overflow: 'hidden', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' },
  assignPicker: { height: 42, color: '#172033', fontSize: 11, fontWeight: '700' },
  detailsWrap: { gap: 16 },
  meetingOverview: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 13, backgroundColor: '#F2F5FF' },
  overviewIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#DFE7FF' },
  overviewCopy: { minWidth: 0, flex: 1 },
  overviewTitle: { color: '#172554', fontSize: 13, fontWeight: '900' },
  overviewSub: { marginTop: 3, color: '#62718C', fontSize: 9, fontWeight: '700' },
  overviewStatus: { maxWidth: 170, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: '#F7D6A4', borderRadius: 99, backgroundColor: '#FFF7E8' },
  overviewStatusText: { color: '#A95A08', fontSize: 8, fontWeight: '900', textAlign: 'center' },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contextCard: { minWidth: 240, flex: 1, gap: 6, padding: 11, borderRadius: 10 },
  locationCard: { borderWidth: 1, borderColor: '#BEE8DE', backgroundColor: '#F0FDFA' },
  remarksCard: { borderWidth: 1, borderColor: '#F5DEB5', backgroundColor: '#FFFBEB' },
  contextHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contextLabel: { color: '#66758E', fontSize: 7, fontWeight: '900', letterSpacing: 0.45 },
  contextValue: { color: '#1E293B', fontSize: 10, fontWeight: '700', lineHeight: 15 },
  locationSection: { gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  locationTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  locationHint: { color: '#8190A8', fontSize: 8, fontWeight: '700' },
  mapButton: { minWidth: 190, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#0F766E' },
  mapButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  contentHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  exportButton: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 8, backgroundColor: '#15803D', shadowColor: '#14532D', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  exportButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  leadStatusColumn: { flex: 1.26 },
  leadStatusValue: { marginLeft: -5 },
  filterRow: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#F8FAFF' },
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
  filterPopoverPicker: { overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 9, backgroundColor: '#F8FAFF' },
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
  pickerShell: { height: 42, justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' },
  picker: { height: 42, color: '#172033', fontSize: 11 },
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
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, backgroundColor: '#FFFFFF' }, stateText: { color: '#64748B', textAlign: 'center', fontSize: 9, fontWeight: '700' }, list: { width: '100%' }, listHeader: { height: 29, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#EAF0FD' }, listHeaderCompact: { display: 'none' }, columnLabel: { width: 120, color: '#4B6093', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }, personColumn: { width: 200 }, personColumnCompact: { width: '100%' }, actionColumn: { width: 150 }, listRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#DAE1F3', backgroundColor: '#EEF0FF' }, listRowAlternate: { backgroundColor: '#E9F7F3' }, listRowCompact: { height: 'auto', minHeight: 74, flexWrap: 'wrap', paddingVertical: 8 }, personCell: { flexDirection: 'row', alignItems: 'center', gap: 8 }, avatar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 10, backgroundColor: '#E0E7FF' }, avatarText: { color: '#4338CA', fontSize: 11, fontWeight: '800' }, cellCopy: { minWidth: 0, flex: 1 }, cell: { width: 120 }, cellCompact: { width: '30%', flexGrow: 1 }, cellMain: { color: '#334155', fontSize: 10, fontWeight: '600' }, cellSub: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, client: { color: '#142039', fontSize: 10, fontWeight: '900' }, code: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, status: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#F3DFC1', borderRadius: 99, color: '#A95A08', fontSize: 8, fontWeight: '900', letterSpacing: 0.25, backgroundColor: '#FFF7EA' }, statusVerified: { color: '#117A54', borderColor: '#CDEBDE', backgroundColor: '#EAF8F1' }, rowAction: { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 7, backgroundColor: '#E9EEFF', borderWidth: 1, borderColor: '#CFDAFF' }, rowActionCompact: { flexGrow: 1 }, rowActionPressed: { backgroundColor: '#EDF2FF' }, rowActionText: { color: '#2D52C7', fontSize: 9, fontWeight: '900' }, label: { color: '#8390A6', fontSize: 7, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  taskSection: { gap: 16 }, summaries: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, summary: { minWidth: 210, flexGrow: 1, padding: 15, borderWidth: 1, borderColor: '#DDE7FF', borderRadius: 15, backgroundColor: '#F4F7FF' }, summaryName: { color: '#1E3A8A', fontWeight: '900' }, summaryLine: { marginTop: 4, color: '#58667D', fontSize: 10, fontWeight: '700' }, filters: { flexDirection: 'row', alignItems: 'center', gap: 10 }, filtersCompact: { flexDirection: 'column', alignItems: 'stretch' }, filterInput: { minWidth: 240, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: '#D7DDE8', borderRadius: 12, backgroundColor: '#FFFFFF' }, chips: { gap: 6 }, chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: '#E9EDF5' }, chipActive: { backgroundColor: '#3156C8' }, chipText: { color: '#536078', fontSize: 9, fontWeight: '900' }, chipTextActive: { color: '#FFFFFF' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' }, modal: { width: '100%', maxWidth: 900, maxHeight: '92%', overflow: 'hidden', borderRadius: 21, backgroundColor: '#fff' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 19, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }, modalHeaderCopy: { minWidth: 0, flex: 1 }, modalEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, modalEyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6366F1' }, modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, modalTitle: { marginTop: 5, color: '#0F172A', fontSize: 20, fontWeight: '900' }, modalMeta: { marginTop: 4, color: '#70809B', fontSize: 9, fontWeight: '700' }, close: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#E2E8F0' }, modalBody: { gap: 20, padding: 19 }, sectionTitle: { marginBottom: 9, color: '#172554', fontSize: 14, fontWeight: '900' }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, detail: { width: '30%', minWidth: 170, flexGrow: 1, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, detailValue: { marginTop: 5, color: '#0F172A', fontSize: 10, fontWeight: '700' }, formSection: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }, help: { color: '#64748B', fontSize: 10, fontWeight: '600' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, field: { width: '47%', minWidth: 230, flexGrow: 1, gap: 5 }, fieldLabel: { color: '#334155', fontSize: 10, fontWeight: '800' }, input: { padding: 11, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, color: '#0F172A' }, timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, timePicker: { width: 112, minWidth: 0, flexGrow: 0, flexShrink: 1 }, timeSeparator: { color: '#64748B', fontSize: 14, fontWeight: '900' }, secondsBox: { width: 46, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#F1F5F9' }, secondsValue: { color: '#475569', fontSize: 10, fontWeight: '900' }, error: { color: '#DC2626', fontSize: 10, fontWeight: '800' }, submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 11, backgroundColor: '#4F46E5' }, disabled: { opacity: .6 }, submitText: { color: '#fff', fontWeight: '900' },
});
