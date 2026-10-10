import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Icon } from 'react-native-paper';
import { crmAssignmentApi } from '../api/crmAssignment';
import { leadSearchApi } from '../api/leadSearch';
import { SecureStorageService } from '../services/SecureStorageService';
import type { LeadResponse } from '../types/lead';
import type { CrmAssignmentTarget, CrmPhysicalLeadRequest } from '../types/crm';
import { theme } from '../theme/theme';
import { useAppTheme } from '../theme/ThemeProvider';

type CrmTab = 'today' | 'responses' | 'tasks' | 'assign' | 'assigned';
type CrmAssignForm = {
  clientName: string; mobileNumber: string; location: string; clinicAddress: string;
  speciality: string; salesPersonEmployeeCode: string; alternateMobileNumber: string; email: string;
  remarks: string; bestTimeToMeet: string; assignedAt: string;
};

const localToday = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const emptyForm = (): CrmAssignForm => ({ clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', salesPersonEmployeeCode: '', alternateMobileNumber: '', email: '', remarks: '', bestTimeToMeet: '', assignedAt: localToday() });
const roleLabel = (role: CrmAssignmentTarget['role']) => role === 'RELATIONSHIP_MANAGER' ? 'RM' : 'SC';
const roleName = (role: CrmAssignmentTarget['role']) => role === 'RELATIONSHIP_MANAGER' ? 'Relationship Manager' : 'Sales Coordinator';
// CRM assignment targets intentionally mirror the PC screen's static employee-code
// dropdown while the backend role-list endpoint is unavailable.
const CRM_ASSIGNMENT_TARGETS: readonly CrmAssignmentTarget[] = [
  { id: 0, employeeCode: 'AP0101', fullName: 'Avesh Prajapati', role: 'RELATIONSHIP_MANAGER' },
];
const show = (value?: string | null) => value?.trim() || '-';
const roleCode = (value?: string) => String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
const messageFor = (error: unknown) => error instanceof Error ? error.message : 'Unable to load CRM assignment data.';

const loadCrmAssignedLeads = async (): Promise<LeadResponse[]> => {
  const currentUser = await SecureStorageService.getUserData();
  const currentEmployeeCode = currentUser?.employeeId?.trim();
  if (!currentEmployeeCode) return [];
  const first = await leadSearchApi.search({ page: 0, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
  const all = [...(first.data?.content ?? [])];
  for (let page = 1; page < (first.data?.totalPages ?? 1); page += 1) {
    const response = await leadSearchApi.search({ page, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
    all.push(...(response.data?.content ?? []));
  }
  return all
    .map((lead) => ({ ...lead, assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt }))
    .filter((lead) => {
      const source = String(lead.assignmentSource ?? '').toUpperCase();
      const isRmOrSc = ['RELATIONSHIP_MANAGER', 'SALES_COORDINATOR'].includes(roleCode(lead.assignedEmployeeRole));
      const isKnownCrmTarget = CRM_ASSIGNMENT_TARGETS.some((target) => target.employeeCode === lead.assignedEmployeeCode);
      const assignedByCurrentCrmUser = lead.assignedByEmployeeCode === currentEmployeeCode;
      // Older CRM records do not always return the assigner/role fields. A CRM
      // source, the current CRM assigner, or an RM/SC CRM target identifies
      // them without bringing PC -> SM assignments into this list.
      return (source.includes('CRM') || assignedByCurrentCrmUser || isKnownCrmTarget)
        && !source.includes('SALES_COORDINATOR')
        && (isRmOrSc || isKnownCrmTarget);
    });
};

export function CrmOnboardingScreen() {
  const { isDark } = useAppTheme();
  const [tab, setTab] = useState<CrmTab>('assign');
  const [form, setForm] = useState<CrmAssignForm>(emptyForm);
  const [assignedLeads, setAssignedLeads] = useState<LeadResponse[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignedError, setAssignedError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadResponse | null>(null);
  const hasAssignedLeadsData = useRef(false);
  const assignedLeadsLoadInFlight = useRef(false);

  const loadAssigned = useCallback(async (showLoader = true) => {
    if (assignedLeadsLoadInFlight.current) return;
    assignedLeadsLoadInFlight.current = true;
    if (showLoader) setLoadingAssigned(true);
    setAssignedError(null);
    try { setAssignedLeads(await loadCrmAssignedLeads()); hasAssignedLeadsData.current = true; }
    catch (error) { setAssignedError(messageFor(error)); }
    finally { assignedLeadsLoadInFlight.current = false; if (showLoader) setLoadingAssigned(false); }
  }, []);

  useEffect(() => { if (tab === 'assigned' && !hasAssignedLeadsData.current) void loadAssigned(); }, [loadAssigned, tab]);
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (hasAssignedLeadsData.current) void loadAssigned(false);
    }, 30 * 60_000);
    return () => clearInterval(refreshTimer);
  }, [loadAssigned]);

  const selectedTarget = useMemo(() => CRM_ASSIGNMENT_TARGETS.find((target) => target.employeeCode === form.salesPersonEmployeeCode), [form.salesPersonEmployeeCode]);
  const canSubmit = !assigning && [form.clientName, form.mobileNumber, form.location, form.clinicAddress, form.speciality, form.salesPersonEmployeeCode].every((value) => value.trim());

  const assignLead = async () => {
    if (!canSubmit) return;
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim())) { setMessage({ type: 'error', text: 'Mobile number must contain a valid 10-digit Indian mobile number.' }); return; }
    setAssigning(true); setMessage(null);
    try {
      const payload: CrmPhysicalLeadRequest = {
        clientName: form.clientName.trim(), mobileNumber: form.mobileNumber.trim(), location: form.location.trim(),
        clinicAddress: form.clinicAddress.trim(), speciality: form.speciality.trim(),
        salesPersonEmployeeCode: form.salesPersonEmployeeCode.trim().toUpperCase(),
        ...(form.alternateMobileNumber.trim() ? { alternateMobileNumber: form.alternateMobileNumber.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.remarks.trim() ? { remarks: form.remarks.trim() } : {}),
        ...(form.assignedAt.trim() ? { assignmentDate: form.assignedAt.trim() } : {}),
        ...(form.bestTimeToMeet ? { bestTimeToMeet: form.bestTimeToMeet as CrmPhysicalLeadRequest['bestTimeToMeet'] } : {}),
      };
      const lead = await crmAssignmentApi.createPhysicalLead(payload);
      setAssignedLeads((current) => [{ ...lead, assignedEmployeeRole: selectedTarget?.role, leadStatus: 'ASSIGNED', assignedAt: lead.assignedAt ?? lead.assignmentDate }, ...current]);
      setMessage({ type: 'success', text: lead.statusMessage ?? `${lead.clientName ?? 'Lead'} assigned successfully${lead.assignedEmployeeName ? ` to ${lead.assignedEmployeeName}` : ''}.` });
      setForm(emptyForm());
    } catch (error) { setMessage({ type: 'error', text: messageFor(error) }); }
    finally { setAssigning(false); }
  };

  const sync = async () => {
    setRefreshing(true);
    await (tab === 'assigned' ? loadAssigned() : Promise.resolve());
    setRefreshing(false);
  };

  return <View style={styles.page}>
    <View style={styles.topBar}>
      <View style={styles.tabs}>
        <TabButton active={tab === 'today'} label="Today Meetings" icon="calendar-check-outline" dark={isDark} onPress={() => setTab('today')} />
        <TabButton active={tab === 'responses'} label="Verified Meetings" icon="clipboard-check-outline" dark={isDark} onPress={() => setTab('responses')} />
        <TabButton active={tab === 'tasks'} label="Sales Person Tasks" icon="account-group-outline" dark={isDark} onPress={() => setTab('tasks')} />
        <TabButton active={tab === 'assign'} label="Assign Leads" icon="account-plus-outline" dark={isDark} onPress={() => setTab('assign')} />
        <TabButton active={tab === 'assigned'} label="Assigned Leads" icon="account-arrow-right-outline" dark={isDark} onPress={() => setTab('assigned')} />
      </View>
      <Pressable disabled={refreshing || assigning} onPress={() => void sync()} style={({ pressed }) => [styles.syncButton, (refreshing || assigning) && styles.disabled, pressed && styles.pressed]}>{refreshing ? <ActivityIndicator size="small" color="#3156C8" /> : <Icon source="refresh" size={18} color="#3156C8" />}<Text style={styles.syncText}>{refreshing ? 'Syncing...' : 'Sync data'}</Text></Pressable>
    </View>
    <View style={styles.panel}>
      <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>{tab === 'assign' ? 'Assign Leads' : tab === 'assigned' ? 'Assigned Leads' : tab === 'today' ? 'Today Meetings' : tab === 'responses' ? 'Verified Meetings' : 'Sales Person Tasks'}</Text><Text style={styles.panelSubtitle}>{tab === 'assign' ? 'Create a physical lead and assign it only to an RM or SC.' : tab === 'assigned' ? 'Leads assigned by you to Relationship Managers and Sales Coordinators.' : ' '}</Text></View></View>
      {tab === 'assign' ? <AssignForm form={form} targets={CRM_ASSIGNMENT_TARGETS} selectedTarget={selectedTarget} assigning={assigning} canSubmit={canSubmit} message={message} dark={isDark} onChange={(next) => setForm((current) => ({ ...current, ...next }))} onSubmit={() => void assignLead()} /> : tab === 'assigned' ? <AssignedLeadList leads={assignedLeads} loading={loadingAssigned} error={assignedError} onSelectLead={setSelectedLead} /> : <View style={styles.blankPanel} />}
    </View>
    <CrmLeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
  </View>;
}

function TabButton({ active, label, icon, dark, onPress }: { active: boolean; label: string; icon: string; dark: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}><View style={[styles.tabIcon, active && styles.tabIconActive]}><Icon source={icon} size={14} color={active ? '#FFFFFF' : '#B45309'} /></View><Text style={[styles.tabText, active && styles.tabTextActive, dark && styles.darkModeWhiteSource]}>{label}</Text></Pressable>;
}

function AssignForm({ form, targets, selectedTarget, assigning, canSubmit, message, dark, onChange, onSubmit }: { form: CrmAssignForm; targets: readonly CrmAssignmentTarget[]; selectedTarget?: CrmAssignmentTarget; assigning: boolean; canSubmit: boolean; message: { type: 'success' | 'error'; text: string } | null; dark: boolean; onChange: (next: Partial<CrmAssignForm>) => void; onSubmit: () => void }) {
  const fields: readonly { key: keyof CrmAssignForm; label: string; placeholder: string }[] = [
    { key: 'clientName', label: 'Client Name *', placeholder: 'e.g. Dr. Rajesh Kumar' }, { key: 'mobileNumber', label: 'Mobile Number *', placeholder: '10-digit mobile number' }, { key: 'location', label: 'Location *', placeholder: 'City or area' }, { key: 'clinicAddress', label: 'Clinic Address *', placeholder: 'Complete clinic address' }, { key: 'speciality', label: 'Speciality *', placeholder: 'e.g. Cardiologist' }, { key: 'alternateMobileNumber', label: 'Alternate Mobile Number', placeholder: 'Optional alternate number' }, { key: 'email', label: 'Email', placeholder: 'Optional email address' }, { key: 'remarks', label: 'Remarks', placeholder: 'Optional remarks' },
  ];
  return <ScrollView contentContainerStyle={styles.formWrap} showsVerticalScrollIndicator={false}>
    <View style={styles.formIntro}><View style={styles.formIntroIcon}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View><Text style={styles.formIntroTitle}>Lead Information</Text><Text style={styles.formIntroText}>Enter client details, meeting preference, assignment date and RM/SC employee code.</Text></View></View>
    <View style={styles.divider} />
    <View style={styles.grid}>{fields.map((field) => <Field key={field.key} label={field.label}><TextInput value={form[field.key]} onChangeText={(text) => onChange({ [field.key]: field.key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : text })} placeholder={field.placeholder} placeholderTextColor="#A1A9B7" keyboardType={field.key === 'mobileNumber' ? 'phone-pad' : 'default'} style={styles.input} /></Field>)}
      <Field label="Best Time to Meet"><Select value={form.bestTimeToMeet} onChange={(bestTimeToMeet) => onChange({ bestTimeToMeet })}><Picker.Item label="Select best time (optional)" value="" /><Picker.Item label="9:00 AM - 12:00 PM" value="NINE_TO_TWELVE" /><Picker.Item label="12:00 PM - 3:00 PM" value="TWELVE_TO_THREE" /><Picker.Item label="3:00 PM - 6:00 PM" value="THREE_TO_SIX" /><Picker.Item label="6:00 PM - 9:00 PM" value="SIX_TO_NINE" /></Select></Field>
      <Field label="Employee Code *"><Select value={form.salesPersonEmployeeCode} onChange={(salesPersonEmployeeCode) => onChange({ salesPersonEmployeeCode })} disabled={assigning}><Picker.Item label="Select RM or SC employee" value="" />{targets.map((target) => <Picker.Item key={target.employeeCode} label={`${roleLabel(target.role)} - ${target.employeeCode} - ${target.fullName}`} value={target.employeeCode} />)}</Select>{selectedTarget ? <Text style={styles.selectedTarget}>{roleName(selectedTarget.role)}: {selectedTarget.fullName}</Text> : null}</Field>
      <Field label="Assigned Date"><TextInput value={form.assignedAt} onChangeText={(assignedAt) => onChange({ assignedAt })} placeholder="YYYY-MM-DD" placeholderTextColor="#A1A9B7" style={styles.input} /></Field>
      <View style={styles.actionField}><Pressable disabled={!canSubmit} onPress={onSubmit} style={({ pressed }) => [styles.assignButton, !canSubmit && (dark ? styles.darkDisabledButton : styles.disabled), pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={[styles.assignButtonText, dark && styles.darkModeWhiteSource]}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View>
    </View>
    {message ? <View style={[styles.feedback, message.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}><Icon source={message.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={message.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.feedbackText, message.type === 'error' && styles.feedbackErrorText]}>{message.text}</Text></View> : null}
  </ScrollView>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
function Select({ value, onChange, disabled, children }: { value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) { return <View style={styles.selectShell}><Picker selectedValue={value} onValueChange={(value) => onChange(String(value))} enabled={!disabled} style={styles.select}>{children}</Picker></View>; }

function AssignedLeadList({ leads, loading, error, onSelectLead }: { leads: LeadResponse[]; loading: boolean; error: string | null; onSelectLead: (lead: LeadResponse) => void }) {
  if (loading) return <View style={styles.state}><ActivityIndicator color="#3156C8" /><Text style={styles.stateText}>Loading assigned leads...</Text></View>;
  if (error) return <View style={styles.state}><Icon source="alert-circle-outline" size={34} color="#B91C1C" /><Text style={styles.stateText}>{error}</Text></View>;
  if (!leads.length) return <View style={styles.state}><Icon source="clipboard-text-outline" size={34} color="#94A3B8" /><Text style={styles.stateTitle}>No leads assigned by CRM yet</Text><Text style={styles.stateText}>CRM assignments to RM and SC will appear here.</Text></View>;
  return <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>{leads.map((lead) => <Pressable key={lead.leadId ?? lead.leadCode} accessibilityRole="button" accessibilityLabel={`Open ${show(lead.clientName)} details`} onPress={() => onSelectLead(lead)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.cardTop}><View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardName}>{show(lead.clientName)}</Text><Text style={styles.cardMobile}>{roleCode(lead.assignedEmployeeRole) === 'RELATIONSHIP_MANAGER' ? 'RM' : 'SC'} · {show(lead.mobileNumber)}</Text></View><View style={styles.rolePill}><Text numberOfLines={1} style={styles.rolePillText}>{show(lead.leadStatus?.replace(/_/g, ' '))}</Text></View></View><View style={styles.cardDivider} /><View style={styles.cardDetails}><Info label="ASSIGNED TO" value={lead.assignedEmployeeName} /><Info label="ASSIGNED DATE" value={lead.assignedAt} /><Info label="LAST MEETING / VERIFIED" value="—" /></View></Pressable>)}</ScrollView>;
}
function Info({ label, value }: { label: string; value?: string | null }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{show(value)}</Text></View>; }

function CrmLeadDetailsModal({ lead, onClose }: { lead: LeadResponse | null; onClose: () => void }) {
  if (!lead) return null;
  const assignmentRole = roleCode(lead.assignedEmployeeRole) === 'RELATIONSHIP_MANAGER' ? 'Relationship Manager' : 'Sales Coordinator';
  const detailFields: readonly (readonly [string, string | undefined | null])[] = [['Mobile Number', lead.mobileNumber], ['Location', lead.location], ['Clinic Address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead Code', lead.leadCode]];
  const assignmentFields: readonly (readonly [string, string | undefined | null])[] = [['Assigned To', lead.assignedEmployeeName], ['Employee Code', lead.assignedEmployeeCode], ['Role', assignmentRole], ['Assigned Date', lead.assignedAt], ['Current Status', lead.leadStatus?.replace(/_/g, ' ')]];
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable nativeID="blueant-workflow-modal" style={styles.modalCard} onPress={(event) => event.stopPropagation()}><View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>CRM ASSIGNED LEAD</Text><Text style={styles.modalTitle}>{show(lead.clientName)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close lead details" onPress={onClose} style={styles.modalClose}><Icon source="close" size={22} color="#3156C8" /></Pressable></View><ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator><DetailSection title="Lead details" fields={detailFields} /><DetailSection title="Assignment details" fields={assignmentFields} /></ScrollView></Pressable></Pressable></Modal>;
}

function DetailSection({ title, fields }: { title: string; fields: readonly (readonly [string, string | undefined | null])[] }) {
  return <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>{title}</Text><View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detailCell}><Text style={styles.detailLabel}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' },
  modalCard: { width: '100%', maxWidth: 760, maxHeight: '86%', overflow: 'hidden', borderRadius: 20, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { marginTop: 3, color: '#0F172A', fontSize: 19, fontWeight: '900' },
  modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#E2E8F0' },
  modalContent: { gap: 12, padding: 16 },
  detailSection: { gap: 8, padding: 11, borderWidth: 1, borderColor: '#DCE5F3', borderRadius: 12, backgroundColor: '#F7F9FE' },
  detailSectionTitle: { color: '#1E3A8A', fontSize: 12, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailCell: { minWidth: 140, flex: 1, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#E1E8F3', borderRadius: 9, backgroundColor: '#FFFFFF' },
  detailLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { marginTop: 3, color: '#172033', fontSize: 10, fontWeight: '800' },
  page: { flex: 1, minHeight: 0, gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F7F8FA' }, topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 4, borderWidth: 1, borderColor: '#D8E1F0', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, tabs: { minWidth: 260, flex: 1, flexDirection: 'row', gap: 5, padding: 3, borderRadius: 9, backgroundColor: '#F5F7FC' }, tab: { minHeight: 28, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 7, backgroundColor: '#FFFBEB' }, tabActive: { borderColor: '#D97706', backgroundColor: '#D97706' }, tabIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#FEF3C7' }, tabIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' }, tabText: { color: '#B45309', fontSize: 9, fontWeight: '800' }, tabTextActive: { color: '#FFFFFF', fontWeight: '900' }, darkModeWhiteSource: { color: '#000000' }, syncButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 10, borderWidth: 1, borderColor: '#A7DFD7', borderRadius: 8, backgroundColor: '#ECFDF8' }, syncText: { color: '#3156C8', fontSize: 10, fontWeight: '900' }, panel: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#1E293B', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderLeftWidth: 4, borderLeftColor: '#38BDF8', backgroundColor: '#22356F' }, panelTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, panelSubtitle: { marginTop: 3, color: '#CBD9FF', fontSize: 9, fontWeight: '500' }, ready: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: '#E0F2FE' }, readyDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#0EA5E9' }, readyText: { color: '#075985', fontSize: 10, fontWeight: '900' }, blankPanel: { flex: 1, minHeight: 260, backgroundColor: '#FFFFFF' }, formWrap: { padding: 22, paddingBottom: 36 }, formIntro: { flexDirection: 'row', alignItems: 'center', gap: 11, maxWidth: 980, alignSelf: 'center', width: '100%', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E7EAF0' }, formIntroIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E8EFFF' }, formIntroTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '900' }, formIntroText: { marginTop: 4, color: '#718096', fontSize: 11, fontWeight: '600' }, divider: { display: 'none' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, maxWidth: 980, alignSelf: 'center', width: '100%', marginTop: 14 }, field: { flexBasis: 220, flexGrow: 1 }, actionField: { flexBasis: 300, flexGrow: 2, justifyContent: 'flex-end' }, label: { marginBottom: 6, color: '#475569', fontSize: 10, fontWeight: '900' }, input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, color: '#172033', fontSize: 11, fontWeight: '700', backgroundColor: '#FFFFFF' }, selectShell: { overflow: 'hidden', minHeight: 44, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' }, select: { minHeight: 44, color: '#172033', fontSize: 11, fontWeight: '700' }, selectedTarget: { marginTop: 6, color: '#047857', fontSize: 9, fontWeight: '800' }, assignButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, backgroundColor: '#4F46E5' }, darkDisabledButton: { backgroundColor: '#4F46E5' }, assignButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 980, alignSelf: 'center', width: '100%', marginTop: 14, padding: 11, borderRadius: 9 }, feedbackSuccess: { backgroundColor: '#ECFDF5' }, feedbackError: { backgroundColor: '#FEF2F2' }, feedbackText: { flex: 1, color: '#15803D', fontSize: 11, fontWeight: '700' }, feedbackErrorText: { color: '#B91C1C' }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 280, padding: 25 }, stateTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '900' }, stateText: { maxWidth: 400, color: '#64748B', fontSize: 12, fontWeight: '600', textAlign: 'center' }, cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingBottom: 28 }, card: { flexBasis: 300, flexGrow: 1, padding: 11, borderWidth: 1, borderTopWidth: 2, borderTopColor: '#D97706', borderLeftWidth: 4, borderLeftColor: '#D97706', borderColor: '#DCE3ED', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }, cardCopy: { minWidth: 0, flex: 1 }, cardName: { color: theme.colors.text, fontSize: 13, fontWeight: '900' }, cardMobile: { marginTop: 3, color: '#71809A', fontSize: 9, fontWeight: '700' }, rolePill: { maxWidth: '48%', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: '#FFF7E8' }, rolePillText: { color: '#A95A08', fontSize: 8, fontWeight: '900' }, cardDivider: { height: 1, marginVertical: 10, backgroundColor: '#E8EDF4' }, cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, info: { minWidth: 88, flexGrow: 1 }, infoLabel: { color: '#64748B', fontSize: 8, fontWeight: '900' }, infoValue: { marginTop: 3, color: '#42536F', fontSize: 9, fontWeight: '800' }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82 },
});
