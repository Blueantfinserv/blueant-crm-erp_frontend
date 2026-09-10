import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
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
const show = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);
const dateOnly = (v?: string) => { const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const localToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const timeText = (v?: { hour?: number; minute?: number; second?: number } | string) => typeof v === 'string' ? v : v?.hour === undefined ? '—' : [v.hour, v.minute ?? 0, v.second ?? 0].map((n) => String(n).padStart(2, '0')).join(':');
const inCurrentWeek = (v?: string) => {
  const d = dateOnly(v); if (!d) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return d >= monday && d <= sunday;
};

export function SalesCoordinatorScreen({ permissions }: { permissions?: readonly string[] | null }) {
  const compact = useWindowDimensions().width < 760;
  const [tab, setTab] = useState<Tab>('today');
  const [pending, setPending] = useState<MeetingResponse[]>([]);
  const [verified, setVerified] = useState<MeetingResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MeetingResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODAY' | 'PENDING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p, v, all] = await Promise.all([meetingService.getVerificationMeetings('PENDING'), meetingService.getVerificationMeetings('VERIFIED'), meetingService.getAllMeetingRecords()]);
      setPending(p); setVerified(v); setMeetings(all);
    } catch (e) { setError(e instanceof Error ? e.message : 'Coordinator data could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const weekResponses = useMemo(() => verified.filter((m) => inCurrentWeek(
    m.meetingVerificationDate ?? m.workflowUpdatedAt ?? m.updatedAt ?? m.lastModifiedDate,
  )), [verified]);
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
      <View style={[styles.metrics, compact && styles.metricsCompact]}><Metric icon="clock-outline" value={pending.length} label="Awaiting review" tone="blue" /><Metric icon="check-circle-outline" value={weekResponses.length} label="Verified this week" tone="green" /><Metric icon="account-outline" value={Object.keys(summaries).length} label="Sales people" tone="orange" /><Pressable onPress={() => void load()} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}><Icon source="refresh" size={17} color="#3156C8" /><Text style={styles.refreshText}>Sync data</Text></Pressable></View>
      <View style={[styles.tabs, compact && styles.tabsCompact]}>{TABS.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}><View style={[styles.tabIcon, tab === item.key && styles.tabIconActive]}><Icon source={item.icon} size={14} color={tab === item.key ? '#FFFFFF' : '#7C879B'} /></View><Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>{item.key === 'today' ? <Text style={[styles.badge, tab === item.key && styles.badgeActive]}>{pending.length}</Text> : null}</Pressable>)}</View>
    </View>
    <View style={styles.contentPanel}><View style={styles.contentHeading}><View><Text style={styles.contentTitle}>{TABS.find((item) => item.key === tab)?.label}</Text><Text style={styles.contentSubtitle}>{tab === 'today' ? `${pending.length} meetings waiting for verification` : tab === 'responses' ? `${verified.length} meetings already verified by the Sales Coordinator` : tab === 'assign' ? 'Create a physical lead and assign it to a sales person' : 'Track ownership and meeting progress'}</Text></View></View>
    {!compact && !loading && !error && tab !== 'assign' && tab !== 'tasks' ? <MeetingTableHeader /> : null}
    <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
    {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
    {loading ? <State loading message="Loading coordinator workspace..." /> : error ? <State message={error} /> : null}
    {!loading && !error && tab === 'today' ? <Cards items={pending} empty="No meetings are pending Process Coordinator verification." action="Verify / Update Details" onOpen={openVerify} /> : null}
    {!loading && !error && tab === 'responses' ? <Cards items={verified} empty="No meetings have been verified by the Sales Coordinator yet." action="View Complete Response" onOpen={setSelected} verified /> : null}
    {!loading && !error && tab === 'assign' ? <View style={styles.assignWrap}><View style={styles.assignIntro}><View style={styles.assignIntroIcon}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View><Text style={styles.assignIntroTitle}>Lead information</Text><Text style={styles.assignIntroText}>Enter the client details and the employee code that should own this lead.</Text></View></View><View style={styles.assignGrid}>{([['clientName', 'Client Name', 'e.g. Dr. Rajesh Kumar'], ['mobileNumber', 'Mobile Number', '10-digit mobile number'], ['location', 'Location', 'City or area'], ['clinicAddress', 'Clinic Address', 'Complete clinic address'], ['speciality', 'Speciality', 'e.g. Cardiologist'], ['salesPersonEmployeeCode', 'Employee Code', 'e.g. EMP000011']] as const).map(([key, label, placeholder]) => <View key={key} style={[styles.assignField, compact && styles.assignFieldCompact]}><Text style={styles.assignLabel}>{label}</Text><TextInput value={assignForm[key]} onChangeText={(text) => setAssignForm((current) => ({ ...current, [key]: key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : key === 'salesPersonEmployeeCode' ? text.toUpperCase().replace(/\s/g, '') : text }))} placeholder={placeholder} placeholderTextColor="#A1A9B7" autoCapitalize={key === 'salesPersonEmployeeCode' ? 'characters' : 'sentences'} keyboardType={key === 'mobileNumber' ? 'phone-pad' : 'default'} style={styles.assignInput} /></View>)}</View>{assignMessage ? <View style={[styles.assignFeedback, assignMessage.type === 'success' ? styles.assignSuccess : styles.assignError]}><Icon source={assignMessage.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={assignMessage.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.assignFeedbackText, assignMessage.type === 'error' && styles.assignErrorText]}>{assignMessage.text}</Text></View> : null}<Pressable disabled={assigning} onPress={() => void assignLead()} style={({ pressed }) => [styles.assignButton, assigning && styles.disabled, pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={styles.assignButtonText}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View> : null}
    {!loading && !error && tab === 'tasks' ? <View style={styles.taskSection}>
      <View style={styles.summaries}>{Object.entries(summaries).map(([key, row]) => <View key={key} style={styles.summary}><Text style={styles.summaryName}>{row.name}</Text><Text style={styles.summaryLine}>Today {row.TODAY} · Pending {row.PENDING}</Text><Text style={styles.summaryLine}>Overdue {row.OVERDUE} · Completed {row.COMPLETED}</Text></View>)}</View>
      <View style={[styles.filters, compact && styles.filtersCompact]}><TextInput value={employeeFilter} onChangeText={setEmployeeFilter} placeholder="Filter by sales person" style={styles.filterInput} /><ScrollView horizontal contentContainerStyle={styles.chips}>{(['ALL', 'TODAY', 'PENDING', 'OVERDUE', 'COMPLETED'] as const).map((s) => <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.chip, statusFilter === s && styles.chipActive]}><Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text></Pressable>)}</ScrollView></View>
      <Cards items={filteredTasks} empty="No meeting tasks match these client-side filters." />
    </View> : null}
    </ScrollView>
    </View>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text><Text style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text></View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
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

function MeetingTableHeader() {
  return <View style={[styles.listHeader, styles.desktopRow]}><Text style={[styles.columnLabel, styles.fluidColumn, styles.clientColumn]}>CLIENT NAME</Text>{['NUMBER', 'MEETING TYPE', 'SALES PERSON', 'LEAD STATUS', 'MEETING DATE', 'NEXT PLAN DATE', 'JOINED'].map((label) => <Text key={label} numberOfLines={1} style={[styles.columnLabel, styles.fluidColumn]}>{label}</Text>)}<View style={styles.desktopActionColumn} /></View>;
}

const baseFields = (m: MeetingResponse) => [['Client Name', m.clientName], ['Mobile Number', m.mobileNumber], ['Sales Person', m.employeeName], ['Employee Code', m.employeeCode], ['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['Meeting Mode', m.meetingMode], ['Location', m.meetingLocation ?? m.location ?? m.address]] as const;
function Cards({ items, empty, action, onOpen, verified = false }: { items: readonly MeetingResponse[]; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean }) {
  const compact = useWindowDimensions().width < 760;
  if (!items.length) return <State message={empty} />;
  if (compact) return <View style={styles.list}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.mobileRow, i % 2 === 1 && styles.listRowAlternate]}><View style={styles.personCell}><View style={styles.avatar}><Text style={styles.avatarText}>{String(m.clientName ?? '?').slice(0, 1).toUpperCase()}</Text></View><View style={styles.cellCopy}><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(m.mobileNumber)}</Text></View></View><View style={styles.mobileMeeting}><Text style={styles.cellMain}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.cellSub}>{show(m.meetingDate)} · {show(m.nextMeetingDate)}</Text></View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.mobileAction}><Icon source="chevron-right" size={16} color="#3156C8" /></Pressable> : null}</View>)}</View>;
  const columns = [
    ['NUMBER', (m: MeetingResponse) => m.mobileNumber],
    ['MEETING TYPE', (m: MeetingResponse) => m.meetingTitle ?? m.meetingType],
    ['SALES PERSON', (m: MeetingResponse) => m.employeeName],
    ['LEAD STATUS', (m: MeetingResponse) => m.leadStatus],
    ['MEETING DATE', (m: MeetingResponse) => m.meetingDate],
    ['NEXT PLAN DATE', (m: MeetingResponse) => m.nextMeetingDate],
    ['JOINED', (m: MeetingResponse) => m.aloneWith],
  ] as const;
  return <View style={styles.desktopTable}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.listRow, styles.desktopRow, i % 2 === 1 && styles.listRowAlternate]}><View style={[styles.personCell, styles.fluidColumn, styles.clientColumn]}><View style={styles.avatar}><Text style={styles.avatarText}>{String(m.clientName ?? '?').slice(0, 1).toUpperCase()}</Text></View><View style={styles.cellCopy}><Text numberOfLines={1} style={styles.client}>{show(m.clientName)}</Text></View></View>{columns.map(([label, value]) => <View key={label} style={[styles.cell, styles.fluidColumn]}><Text numberOfLines={1} style={styles.cellMain}>{show(value(m))}</Text></View>)}{onOpen ? <Pressable onPress={() => onOpen(m)} style={({ pressed }) => [styles.rowAction, styles.desktopActionColumn, pressed && styles.rowActionPressed]}><Text numberOfLines={1} style={styles.rowActionText}>{action}</Text><Icon source="chevron-right" size={13} color="#3156C8" /></Pressable> : <View style={styles.desktopActionColumn} />}</View>)}</View>;
}
function Details({ meeting: m }: { meeting: MeetingResponse }) { const fields = [...baseFields(m), ['Lead Status', m.leadStatus], ['Remarks', m.remarks ?? m.meetingRemarks], ['Next Meeting Date', m.nextMeetingDate], ['Joined / Alone With', m.aloneWith], ['Person Name', m.personName]] as const; return <View><Text style={styles.sectionTitle}>Sales Person Meeting Information</Text><View style={styles.detailGrid}>{fields.map(([label, field]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(field)}</Text></View>)}</View></View>; }
function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) { return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><View style={styles.detailGrid}>{FIELDS.map((f) => <View key={f.key} style={styles.detail}><Text style={styles.label}>{f.label}</Text><Text style={styles.detailValue}>{show(m[f.key])}</Text></View>)}</View></View>; }
function State({ message, loading = false }: { message: string; loading?: boolean }) { return <View style={styles.state}>{loading ? <ActivityIndicator color="#4F46E5" /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}<Text style={styles.stateText}>{message}</Text></View>; }

const styles = StyleSheet.create({
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
  assignButton: { minWidth: 170, height: 42, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 20, borderRadius: 9, backgroundColor: '#2949B6', shadowColor: '#2949B6', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  assignButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  desktopRow: { gap: 4, paddingHorizontal: 10 },
  fluidColumn: { width: 'auto', minWidth: 0, flex: 1 },
  clientColumn: { flex: 1.2 },
  desktopActionColumn: { width: 128, flexShrink: 0 },
  tableScroll: { flexGrow: 1 },
  desktopTable: { width: '100%' },
  mobileRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#EDF0F4', backgroundColor: '#FFFFFF' },
  mobileMeeting: { minWidth: 90, flex: 1 },
  mobileAction: { width: 24, height: 28, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, minHeight: 0, gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F7F8FA' }, pageCompact: { gap: 7, padding: 8 }, topSection: { flexShrink: 0, gap: 6 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, pageHeaderCompact: { alignItems: 'flex-start', flexDirection: 'column' },
  hero: { minHeight: 150 }, heroCompact: { minHeight: 0 }, heroCopy: { flex: 1 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#60A5FA' }, eyebrow: { color: '#3156C8', fontSize: 9, fontWeight: '900', letterSpacing: 1.35 }, title: { marginTop: 8, color: '#161F33', fontSize: 27, fontWeight: '900', letterSpacing: -0.6 }, titleCompact: { fontSize: 23 }, subtitle: { marginTop: 5, color: '#7B8495', fontSize: 12, fontWeight: '600', lineHeight: 19 },
  heroAside: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heroAsideCompact: { justifyContent: 'space-between', gap: 6 }, heroStat: { minWidth: 60 }, heroStatValue: { color: '#111827', fontSize: 16, fontWeight: '900' }, heroStatLabel: { color: '#64748B', fontSize: 8, fontWeight: '700' }, heroDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB' }, refresh: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderWidth: 1, borderColor: '#DDE3EE', borderRadius: 8, backgroundColor: '#FFFFFF' }, refreshText: { color: '#3156C8', fontSize: 9, fontWeight: '900' }, pressed: { opacity: 0.7 },
  metrics: { flexDirection: 'row', gap: 7 }, metricsCompact: { flexWrap: 'wrap' }, metric: { minWidth: 150, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E3E8F0', borderLeftWidth: 3, borderRadius: 9, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.035, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, metricAccentBlue: { borderLeftColor: '#4F6FE7' }, metricAccentGreen: { borderLeftColor: '#20A878' }, metricAccentOrange: { borderLeftColor: '#E59A2F' }, metricIcon: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, metricBlue: { backgroundColor: '#EEF3FF' }, metricGreen: { backgroundColor: '#ECF9F4' }, metricOrange: { backgroundColor: '#FFF6E8' }, metricValue: { color: '#172033', fontSize: 13, fontWeight: '900' }, metricLabel: { color: '#727E91', fontSize: 8, fontWeight: '700' },
  workspace: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, workspaceCompact: { flexDirection: 'column', alignItems: 'stretch' }, contentPanel: { minWidth: 0, minHeight: 0, flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, contentHeading: { flexShrink: 0, paddingHorizontal: 14, paddingVertical: 7, borderLeftWidth: 3, borderLeftColor: '#3156C8', borderBottomWidth: 1, borderBottomColor: '#E7EAF0', backgroundColor: '#FCFDFF' }, contentTitle: { color: '#15213A', fontSize: 13, fontWeight: '900', letterSpacing: -0.15 }, contentSubtitle: { marginTop: 1, color: '#7C879A', fontSize: 8, fontWeight: '600' }, resultsScroll: { flex: 1, minHeight: 0 }, resultsContent: { flexGrow: 1 },
  tabs: { width: '100%', height: 36, flexDirection: 'row', gap: 3, padding: 3, borderWidth: 1, borderColor: '#DFE4ED', borderRadius: 9, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.035, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, tabsCompact: { height: 'auto', flexDirection: 'column' }, tabsLabel: { color: '#A1A9B7', fontSize: 8, fontWeight: '900' }, tab: { minHeight: 28, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7, borderRadius: 6 }, tabActive: { backgroundColor: '#2949B6', shadowColor: '#2949B6', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, tabIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#F3F5F8' }, tabIconActive: { backgroundColor: 'rgba(255,255,255,0.14)' }, tabText: { color: '#566276', fontSize: 9, fontWeight: '700' }, tabTextActive: { color: '#FFFFFF', fontWeight: '900' }, badge: { minWidth: 18, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden', borderRadius: 9, color: '#697386', textAlign: 'center', fontSize: 7, fontWeight: '900', backgroundColor: '#ECEFF4' }, badgeActive: { color: '#2949B6', backgroundColor: '#FFFFFF' }, permission: { color: '#64748B', fontSize: 8, fontWeight: '600' },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, backgroundColor: '#FFFFFF' }, stateText: { color: '#64748B', textAlign: 'center', fontSize: 9, fontWeight: '700' }, list: { width: '100%' }, listHeader: { height: 25, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#E4E8EF', backgroundColor: '#F4F6F9' }, listHeaderCompact: { display: 'none' }, columnLabel: { width: 120, color: '#788499', fontSize: 7, fontWeight: '900', letterSpacing: 0.6 }, personColumn: { width: 200 }, personColumnCompact: { width: '100%' }, actionColumn: { width: 150 }, listRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#EDF0F4', backgroundColor: '#FFFFFF' }, listRowAlternate: { backgroundColor: '#FAFBFD' }, listRowCompact: { height: 'auto', minHeight: 74, flexWrap: 'wrap', paddingVertical: 8 }, personCell: { flexDirection: 'row', alignItems: 'center', gap: 8 }, avatar: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCE5FF', borderRadius: 13, backgroundColor: '#EDF2FF' }, avatarText: { color: '#3156C8', fontSize: 10, fontWeight: '900' }, cellCopy: { minWidth: 0, flex: 1 }, cell: { width: 120 }, cellCompact: { width: '30%', flexGrow: 1 }, cellMain: { color: '#263248', fontSize: 9, fontWeight: '800' }, cellSub: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, client: { color: '#142039', fontSize: 9, fontWeight: '900' }, code: { marginTop: 1, color: '#8A95A7', fontSize: 7, fontWeight: '600' }, status: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#F3DFC1', borderRadius: 99, color: '#A95A08', fontSize: 7, fontWeight: '900', letterSpacing: 0.3, backgroundColor: '#FFF7EA' }, statusVerified: { color: '#117A54', borderColor: '#CDEBDE', backgroundColor: '#EAF8F1' }, rowAction: { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6 }, rowActionCompact: { flexGrow: 1 }, rowActionPressed: { backgroundColor: '#EDF2FF' }, rowActionText: { color: '#2D52C7', fontSize: 8, fontWeight: '900' }, label: { color: '#8390A6', fontSize: 7, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  taskSection: { gap: 16 }, summaries: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, summary: { minWidth: 210, flexGrow: 1, padding: 15, borderWidth: 1, borderColor: '#DDE7FF', borderRadius: 15, backgroundColor: '#F4F7FF' }, summaryName: { color: '#1E3A8A', fontWeight: '900' }, summaryLine: { marginTop: 4, color: '#58667D', fontSize: 10, fontWeight: '700' }, filters: { flexDirection: 'row', alignItems: 'center', gap: 10 }, filtersCompact: { flexDirection: 'column', alignItems: 'stretch' }, filterInput: { minWidth: 240, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: '#D7DDE8', borderRadius: 12, backgroundColor: '#FFFFFF' }, chips: { gap: 6 }, chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: '#E9EDF5' }, chipActive: { backgroundColor: '#3156C8' }, chipText: { color: '#536078', fontSize: 9, fontWeight: '900' }, chipTextActive: { color: '#FFFFFF' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' }, modal: { width: '100%', maxWidth: 900, maxHeight: '92%', overflow: 'hidden', borderRadius: 21, backgroundColor: '#fff' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 19, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }, modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, modalTitle: { marginTop: 3, color: '#0F172A', fontSize: 20, fontWeight: '900' }, close: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#E2E8F0' }, modalBody: { gap: 20, padding: 19 }, sectionTitle: { marginBottom: 9, color: '#172554', fontSize: 14, fontWeight: '900' }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, detail: { width: '30%', minWidth: 170, flexGrow: 1, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, detailValue: { marginTop: 5, color: '#0F172A', fontSize: 10, fontWeight: '700' }, formSection: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }, help: { color: '#64748B', fontSize: 10, fontWeight: '600' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, field: { width: '47%', minWidth: 230, flexGrow: 1, gap: 5 }, fieldLabel: { color: '#334155', fontSize: 10, fontWeight: '800' }, input: { padding: 11, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, color: '#0F172A' }, timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, timePicker: { width: 112, minWidth: 0, flexGrow: 0, flexShrink: 1 }, timeSeparator: { color: '#64748B', fontSize: 14, fontWeight: '900' }, secondsBox: { width: 46, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#F1F5F9' }, secondsValue: { color: '#475569', fontSize: 10, fontWeight: '900' }, error: { color: '#DC2626', fontSize: 10, fontWeight: '800' }, submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 11, backgroundColor: '#4F46E5' }, disabled: { opacity: .6 }, submitText: { color: '#fff', fontWeight: '900' },
});
