import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { meetingService } from '../services/MeetingService';
import type { MeetingResponse, MeetingVerificationRequest } from '../types/meeting';
import { theme } from '../theme/theme';

type Tab = 'today' | 'responses' | 'tasks';
type VerificationField = NonNullable<keyof MeetingVerificationRequest>;
type VerificationForm = Record<VerificationField, string>;
const TABS: readonly { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today Meetings', icon: 'calendar-check-outline' },
  { key: 'responses', label: 'PC Meeting Response', icon: 'clipboard-check-outline' },
  { key: 'tasks', label: 'Sales Person Tasks', icon: 'account-group-outline' },
];
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

  const openVerify = (meeting: MeetingResponse) => {
    const previous = verified.filter((m) => m.leadCode && m.leadCode === meeting.leadCode).sort((a, b) => (b.meetingVerificationDate ?? '').localeCompare(a.meetingVerificationDate ?? ''))[0];
    setForm({
      meetingTiming: meeting.meetingTiming ?? previous?.meetingTiming ?? '', ageGroup: meeting.ageGroup ?? previous?.ageGroup ?? '',
      existingSip: meeting.existingSip ?? previous?.existingSip ?? '', profession: meeting.profession ?? previous?.profession ?? '',
      professionDetail: meeting.professionDetail ?? previous?.professionDetail ?? '', bestTimeForMeeting: meeting.bestTimeForMeeting ?? previous?.bestTimeForMeeting ?? '',
      meetingWith: meeting.meetingWith ?? previous?.meetingWith ?? '', personName: meeting.personName ?? previous?.personName ?? '', position: meeting.position ?? previous?.position ?? '',
    });
    setSubmitError(null); setSelected(meeting);
  };
  const verify = async () => {
    if (!selected?.meetingCode || submittingRef.current) return;
    if (form.meetingTiming && !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(form.meetingTiming)) {
      setSubmitError('Meeting Time must use HH:mm:ss format.'); return;
    }
    const payload = Object.fromEntries(
      FIELDS.map((field) => [field.key, form[field.key].trim()]).filter(([, fieldValue]) => Boolean(fieldValue)),
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

  return <View style={styles.page}>
    <View style={[styles.hero, compact && styles.heroCompact]}><View><Text style={styles.eyebrow}>PROCESS COORDINATOR</Text><Text style={styles.title}>Meeting Verification Workspace</Text><Text style={styles.subtitle}>Pending work, verified responses, and sales-person tasks.</Text></View><Pressable onPress={() => void load()} style={styles.refresh}><Icon source="refresh" size={18} color="#fff" /><Text style={styles.refreshText}>Refresh</Text></Pressable></View>
    <View style={[styles.tabs, compact && styles.tabsCompact]}>{TABS.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}><Icon source={item.icon} size={19} color={tab === item.key ? '#fff' : '#475569'} /><Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>{item.key === 'today' ? <Text style={styles.badge}>{pending.length}</Text> : null}</Pressable>)}</View>
    {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
    {loading ? <State loading message="Loading coordinator workspace..." /> : error ? <State message={error} /> : null}
    {!loading && !error && tab === 'today' ? <Cards items={pending} empty="No meetings are pending Process Coordinator verification." action="Verify / Update Details" onOpen={openVerify} /> : null}
    {!loading && !error && tab === 'responses' ? <Cards items={weekResponses} empty="No verified responses are available for the current Monday–Sunday week." action="View Complete Response" onOpen={setSelected} verified /> : null}
    {!loading && !error && tab === 'tasks' ? <View style={styles.taskSection}>
      <View style={styles.summaries}>{Object.entries(summaries).map(([key, row]) => <View key={key} style={styles.summary}><Text style={styles.summaryName}>{row.name}</Text><Text style={styles.summaryLine}>Today {row.TODAY} · Pending {row.PENDING}</Text><Text style={styles.summaryLine}>Overdue {row.OVERDUE} · Completed {row.COMPLETED}</Text></View>)}</View>
      <View style={[styles.filters, compact && styles.filtersCompact]}><TextInput value={employeeFilter} onChangeText={setEmployeeFilter} placeholder="Filter by sales person" style={styles.filterInput} /><ScrollView horizontal contentContainerStyle={styles.chips}>{(['ALL', 'TODAY', 'PENDING', 'OVERDUE', 'COMPLETED'] as const).map((s) => <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.chip, statusFilter === s && styles.chipActive]}><Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text></Pressable>)}</ScrollView></View>
      <Cards items={filteredTasks} empty="No meeting tasks match these client-side filters." />
    </View> : null}
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text><Text style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text></View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>{selected ? <Details meeting={selected} /> : null}{tab === 'responses' && selected ? <VerificationDetails meeting={selected} /> : selected ? <View style={styles.formSection}><Text style={styles.sectionTitle}>PC Additional Information</Text><Text style={styles.help}>Enter exact backend enum codes. Blank optional values are omitted; backend validation messages are shown unchanged.</Text><View style={styles.formGrid}>{FIELDS.map((field) => <View key={field.key} style={styles.field}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput value={form[field.key]} onChangeText={(text) => setForm((current) => ({ ...current, [field.key]: text }))} placeholder={field.placeholder} style={styles.input} /></View>)}</View>{submitError ? <Text style={styles.error}>{submitError}</Text> : null}<Pressable disabled={submitting} onPress={() => void verify()} style={[styles.submit, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Icon source="check-decagram-outline" size={20} color="#fff" />}<Text style={styles.submitText}>{submitting ? 'Verifying...' : 'Verify Meeting'}</Text></Pressable></View> : null}</ScrollView>
    </View></View></Modal>
  </View>;
}

const baseFields = (m: MeetingResponse) => [['Client Name', m.clientName], ['Mobile Number', m.mobileNumber], ['Sales Person', m.employeeName], ['Employee Code', m.employeeCode], ['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['Meeting Mode', m.meetingMode], ['Location', m.meetingLocation ?? m.location ?? m.address]] as const;
function Cards({ items, empty, action, onOpen, verified = false }: { items: readonly MeetingResponse[]; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean }) {
  if (!items.length) return <State message={empty} />;
  return <View style={styles.grid}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={styles.card}><View style={styles.cardHeader}><View><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(m.meetingCode)}</Text></View><Text style={[styles.status, verified && styles.statusVerified]}>{verified ? 'VERIFIED' : show(m.verificationStatus ?? 'PENDING')}</Text></View><View style={styles.cardFields}>{baseFields(m).slice(1).map(([label, field]) => field !== undefined && field !== null ? <View key={label} style={styles.cardField}><Text style={styles.label}>{label}</Text><Text style={styles.cardValue}>{show(field)}</Text></View> : null)}</View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.action}><Text style={styles.actionText}>{action}</Text><Icon source="arrow-right" size={18} color="#fff" /></Pressable> : null}</View>)}</View>;
}
function Details({ meeting: m }: { meeting: MeetingResponse }) { const fields = [...baseFields(m), ['Lead Status', m.leadStatus], ['Remarks', m.remarks ?? m.meetingRemarks], ['Next Meeting Date', m.nextMeetingDate], ['Joined / Alone With', m.aloneWith], ['Person Name', m.personName]] as const; return <View><Text style={styles.sectionTitle}>Sales Person Meeting Information</Text><View style={styles.detailGrid}>{fields.map(([label, field]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(field)}</Text></View>)}</View></View>; }
function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) { return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><View style={styles.detailGrid}>{FIELDS.map((f) => <View key={f.key} style={styles.detail}><Text style={styles.label}>{f.label}</Text><Text style={styles.detailValue}>{show(m[f.key])}</Text></View>)}</View></View>; }
function State({ message, loading = false }: { message: string; loading?: boolean }) { return <View style={styles.state}>{loading ? <ActivityIndicator color="#4F46E5" /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}<Text style={styles.stateText}>{message}</Text></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 520, gap: 16, padding: 18, backgroundColor: '#F5F7FB' }, hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 22, borderRadius: 20, backgroundColor: '#172554' }, heroCompact: { alignItems: 'flex-start', flexDirection: 'column' }, eyebrow: { color: '#A5B4FC', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { marginTop: 4, color: '#fff', fontSize: 24, fontWeight: '900' }, subtitle: { marginTop: 4, color: '#CBD5E1', fontSize: 12, fontWeight: '600' }, refresh: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 11, borderRadius: 11, backgroundColor: '#4F46E5' }, refreshText: { color: '#fff', fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 7, padding: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, backgroundColor: '#fff' }, tabsCompact: { flexDirection: 'column' }, tab: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 10 }, tabActive: { backgroundColor: '#4F46E5' }, tabText: { color: '#475569', fontWeight: '800' }, tabTextActive: { color: '#fff' }, badge: { minWidth: 22, padding: 4, overflow: 'hidden', borderRadius: 11, color: '#4F46E5', textAlign: 'center', fontSize: 9, fontWeight: '900', backgroundColor: '#fff' }, permission: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  state: { minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, backgroundColor: '#fff' }, stateText: { color: '#64748B', textAlign: 'center', fontWeight: '700' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 }, card: { width: '31%', minWidth: 290, flexGrow: 1, gap: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 17, backgroundColor: '#fff', ...theme.shadow.card }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, client: { color: '#0F172A', fontSize: 16, fontWeight: '900' }, code: { marginTop: 2, color: '#64748B', fontSize: 9, fontWeight: '700' }, status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden', borderRadius: 99, color: '#C2410C', fontSize: 8, fontWeight: '900', backgroundColor: '#FFF7ED' }, statusVerified: { color: '#15803D', backgroundColor: '#ECFDF5' }, cardFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, cardField: { width: '47%', flexGrow: 1, padding: 8, borderRadius: 9, backgroundColor: '#F8FAFC' }, label: { color: '#64748B', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }, cardValue: { marginTop: 3, color: '#334155', fontSize: 10, fontWeight: '700' }, action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderRadius: 10, backgroundColor: '#4F46E5' }, actionText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  taskSection: { gap: 13 }, summaries: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, summary: { minWidth: 210, flexGrow: 1, padding: 13, borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 13, backgroundColor: '#EFF6FF' }, summaryName: { color: '#1E3A8A', fontWeight: '900' }, summaryLine: { marginTop: 4, color: '#475569', fontSize: 10, fontWeight: '700' }, filters: { flexDirection: 'row', alignItems: 'center', gap: 10 }, filtersCompact: { flexDirection: 'column', alignItems: 'stretch' }, filterInput: { minWidth: 240, padding: 10, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, backgroundColor: '#fff' }, chips: { gap: 6 }, chip: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 99, backgroundColor: '#E2E8F0' }, chipActive: { backgroundColor: '#4F46E5' }, chipText: { color: '#475569', fontSize: 9, fontWeight: '900' }, chipTextActive: { color: '#fff' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' }, modal: { width: '100%', maxWidth: 900, maxHeight: '92%', overflow: 'hidden', borderRadius: 21, backgroundColor: '#fff' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 19, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }, modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, modalTitle: { marginTop: 3, color: '#0F172A', fontSize: 20, fontWeight: '900' }, close: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#E2E8F0' }, modalBody: { gap: 20, padding: 19 }, sectionTitle: { marginBottom: 9, color: '#172554', fontSize: 14, fontWeight: '900' }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, detail: { width: '30%', minWidth: 170, flexGrow: 1, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, detailValue: { marginTop: 5, color: '#0F172A', fontSize: 10, fontWeight: '700' }, formSection: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }, help: { color: '#64748B', fontSize: 10, fontWeight: '600' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, field: { width: '47%', minWidth: 230, flexGrow: 1, gap: 5 }, fieldLabel: { color: '#334155', fontSize: 10, fontWeight: '800' }, input: { padding: 11, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, color: '#0F172A' }, error: { color: '#DC2626', fontSize: 10, fontWeight: '800' }, submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 11, backgroundColor: '#4F46E5' }, disabled: { opacity: .6 }, submitText: { color: '#fff', fontWeight: '900' },
});
