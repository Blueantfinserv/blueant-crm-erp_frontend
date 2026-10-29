import { VerificationDropdown } from '../../../components/VerificationDropdown';
import { Picker } from '@react-native-picker/picker';
import { createElement, useState } from 'react';
import { ActivityIndicator,Modal,Platform,Pressable,StyleSheet,Text,TextInput,useWindowDimensions,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { LeadResponse } from '../../../types/lead';
import { styles } from '../../salesCoordinatorStyles';
import { SALES_PERSON_CODES } from '../coordinatorConstants';
import { leadCardTone } from '../coordinatorFilters';
import { emptyAssignForm } from '../coordinatorForms';
import type { AssignedDateRange } from '../coordinatorTypes';
import { belongsToCoordinatorTeam,leadRole,show } from '../coordinatorUtils';
import { CompactAssignmentCalendar,InlineCalendar } from './CoordinatorCalendars';
import { State } from './CoordinatorControls';

export function AssignLeadForm({ compact, form, setForm, assigning, message, salesPersonNamesByCode, onSubmit }: { compact: boolean; form: ReturnType<typeof emptyAssignForm>; setForm: (updater: (current: ReturnType<typeof emptyAssignForm>) => ReturnType<typeof emptyAssignForm>) => void; assigning: boolean; message: { type: 'success' | 'error'; text: string } | null; salesPersonNamesByCode: ReadonlyMap<string, string>; onSubmit: () => void }) {
  const { isDark } = useAppTheme();
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const compactControl = { height: 32, paddingVertical: 0, backgroundColor: '#F7FAFF', borderColor: '#DCE5F4', borderRadius: 8 };
  const buttonColor = isDark && Platform.OS === 'web' ? '#000000' : '#FFFFFF';
  const fields = [['clientName', 'Client Name', 'e.g. Dr. Rajesh Kumar'], ['mobileNumber', 'Mobile Number', '10-digit mobile number'], ['location', 'Location', 'City or area'], ['clinicAddress', 'Clinic Address', 'Complete clinic address'], ['speciality', 'Speciality', 'e.g. Cardiologist'], ['bestTimeForMeeting', 'Best Time to Meet', 'Select best time'], ['salesPersonEmployeeCode', 'Employee Code', 'e.g. EMP000011']] as const;
  return <View nativeID="pc-assign-lead" style={[styles.assignWrap, compact && { padding: 12, gap: 10 }]}>
    {compact && Platform.OS === 'web' ? createElement('style', null, '#pc-assign-lead select { border: 0; outline: none; background-color: transparent; padding: 0 9px; font-size: 11px; height: 32px; width: 100%; } #pc-assign-lead input:focus-visible { outline: none; } #pc-assign-lead select:focus-visible { outline: 2px solid #818CF8; outline-offset: -2px; border-radius: 7px; }') : null}
    <View style={[styles.assignIntro, compact && { padding: 8, gap: 8, borderBottomWidth: 0, borderWidth: 1, borderColor: '#DDE6FA', borderRadius: 10, backgroundColor: '#F1F5FF' }]}><View style={[styles.assignIntroIcon, compact && { width: 30, height: 30 }]}><Icon source="account-arrow-right-outline" size={24} color="#3156C8" /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.assignIntroTitle, compact && { fontSize: 14, color: '#28447F' }]}>Lead information</Text>{!compact ? <Text style={styles.assignIntroText}>Enter the client details, meeting preference, assignment date and employee code.</Text> : null}</View></View>
    <View style={[styles.assignGrid, compact && { gap: 6 }]}>
      {fields.map(([key, label, placeholder]) => <View key={key} style={[styles.assignField, key === 'salesPersonEmployeeCode' && styles.assignEmployeeField, compact && styles.assignFieldCompact]}>
        <Text style={[styles.assignLabel, compact && { color: '#526685', fontSize: 10, fontWeight: '700' }]}>{label}</Text>
        {key === 'salesPersonEmployeeCode'
          ? <View style={[styles.assignPickerShell, compact && compactControl]}><Picker selectedValue={form.salesPersonEmployeeCode} onValueChange={(value) => setForm((current) => ({ ...current, salesPersonEmployeeCode: String(value) }))} style={[styles.assignPicker, compact && compactControl]}><Picker.Item label="Select employee code" value="" />{SALES_PERSON_CODES.map((code) => <Picker.Item key={code} label={`${code}${salesPersonNamesByCode.get(code) ? ` - ${salesPersonNamesByCode.get(code)}` : ''}`} value={code} />)}</Picker></View>
          : key === 'bestTimeForMeeting'
            ? <View style={[styles.assignPickerShell, compact && compactControl]}><Picker selectedValue={form.bestTimeForMeeting} onValueChange={(value) => setForm((current) => ({ ...current, bestTimeForMeeting: String(value) }))} style={[styles.assignPicker, compact && compactControl]}><Picker.Item label={placeholder} value="" /><Picker.Item label="9:00 AM - 12:00 PM" value="NINE_TO_TWELVE" /><Picker.Item label="12:00 PM - 3:00 PM" value="TWELVE_TO_THREE" /><Picker.Item label="3:00 PM - 6:00 PM" value="THREE_TO_SIX" /><Picker.Item label="6:00 PM - 9:00 PM" value="SIX_TO_NINE" /></Picker></View>
            : <TextInput onFocus={() => setFocusedField(key)} onBlur={() => setFocusedField(null)} value={form[key]} onChangeText={(text) => setForm((current) => ({ ...current, [key]: key === 'mobileNumber' ? text.replace(/\D/g, '').slice(0, 10) : text }))} placeholder={placeholder} placeholderTextColor="#A1A9B7" autoCapitalize="sentences" keyboardType={key === 'mobileNumber' ? 'phone-pad' : 'default'} style={[styles.assignInput, compact && compactControl, compact && focusedField === key && { borderColor: '#818CF8', backgroundColor: '#FFFFFF' }]} />}
      </View>)}
      <View style={[styles.assignField, styles.assignDateField, compact && styles.assignFieldCompact]}><Text style={[styles.assignLabel, compact && { color: '#526685', fontSize: 10, fontWeight: '700' }]}>Assigned Date</Text><Pressable onPress={() => setDatePickerVisible(true)} style={[styles.assignDatePicker, compact && compactControl]}><Icon source="calendar-month-outline" size={18} color="#3156C8" /><Text style={styles.assignDatePickerText}>{form.assignedAt || 'Choose assigned date'}</Text><Icon source="chevron-down" size={18} color="#64748B" /></Pressable></View>
      <View style={[styles.assignActionField, compact && { width: '100%', minWidth: 0, flexGrow: 0 }]}><Pressable disabled={assigning} onPress={onSubmit} style={({ pressed }) => [styles.assignButton, compact && { minWidth: 0, width: '100%', height: 34, backgroundColor: '#4F46E5', borderRadius: 9, marginTop: 3 }, assigning && styles.disabled, pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color={buttonColor} /> : <Icon source="account-check-outline" size={18} color={buttonColor} />}<Text style={[styles.assignButtonText, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View>
    </View>
    {message ? <View style={[styles.assignFeedback, message.type === 'success' ? styles.assignSuccess : styles.assignError]}><Icon source={message.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={message.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.assignFeedbackText, message.type === 'error' && styles.assignErrorText]}>{message.text}</Text></View> : null}
    <CompactAssignmentCalendar visible={datePickerVisible} value={form.assignedAt} onDismiss={() => setDatePickerVisible(false)} onSelect={(assignedAt) => setForm((current) => ({ ...current, assignedAt }))} />
  </View>;
}

export function HeaderLeadFilters({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter, dateRange, setDateRange, search, setSearch }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void; dateRange: AssignedDateRange; setDateRange: (value: AssignedDateRange) => void; search: string; setSearch: (value: string) => void }) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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
      {compact ? <Pressable accessibilityRole="button" accessibilityLabel="Toggle assigned lead filters" accessibilityState={{ expanded: filtersExpanded }} onPress={() => setFiltersExpanded(value => !value)} style={assignedMobile.filterToggle}><Icon source="filter-variant" size={16} color="#4338CA" /><Text style={assignedMobile.filterLabel}>Filters{[Boolean(dateRange.from || dateRange.to), Boolean(coordinatorFilter), Boolean(salesPersonFilter)].filter(Boolean).length ? ` (${[Boolean(dateRange.from || dateRange.to), Boolean(coordinatorFilter), Boolean(salesPersonFilter)].filter(Boolean).length})` : ''}</Text><Icon source={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={17} color="#4338CA" /></Pressable> : null}
      {compact && filtersExpanded ? <View style={assignedMobile.filtersRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Assigned date filter: ${rangeLabel}`} onPress={openDateRange} style={assignedMobile.dateFilter}><Icon source="calendar-month-outline" size={14} color="#6366F1" /><Text numberOfLines={1} style={assignedMobile.dateFilterText}>{dateRange.from || dateRange.to ? 'Dates set' : 'Date'}</Text><Icon source="chevron-down" size={13} color="#6366F1" /></Pressable>
        <View style={assignedMobile.filterCell}><VerificationDropdown label="Filter by coordinator" value={coordinatorFilter} onChange={(value) => { setCoordinatorFilter(value); setSalesPersonFilter(''); }} options={[{ label: 'Coord.', value: '' }, ...coordinators.map(name => ({ label: name, value: name }))]} /></View>
        <View style={assignedMobile.filterCell}><VerificationDropdown label="Filter by salesperson" disabled={!coordinatorFilter} value={salesPersonFilter} onChange={setSalesPersonFilter} options={[{ label: 'Sales', value: '' }, ...salesPeople.map(name => ({ label: name, value: name }))]} /></View>
      </View> : null}
      {!compact ? <>
      <View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Pressable onPress={openDateRange} style={[styles.headerLeadDatePicker, compact && styles.headerLeadPickerCompact]}><Icon source="calendar-month-outline" size={15} color="#BFD1FF" /><Text numberOfLines={1} style={styles.headerLeadDateText}>{rangeLabel}</Text>{dateRange.from || dateRange.to ? <Pressable accessibilityLabel="Clear assigned date range" hitSlop={8} onPress={() => setDateRange({ from: '', to: '' })}><Icon source="close-circle" size={15} color="#BFD1FF" /></Pressable> : <Icon source="chevron-down" size={15} color="#BFD1FF" />}</Pressable></View>
      <View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact]}><Icon source="account-tie-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker selectedValue={coordinatorFilter} onValueChange={(value) => { setCoordinatorFilter(String(value)); setSalesPersonFilter(''); }} style={[styles.headerLeadPickerControl, isDark && styles.headerLeadPickerControlDark]}><Picker.Item label="All Coordinators" value="" />{coordinators.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View>
      <View style={[styles.headerLeadFilter, compact && styles.headerLeadFilterCompact, !coordinatorFilter && styles.headerLeadPickerDisabled, isDark && !coordinatorFilter && styles.headerLeadPickerDisabledDark]}><Icon source="account-outline" size={15} color="#BFD1FF" /><View style={[styles.headerLeadPicker, compact && styles.headerLeadPickerCompact]}><Picker enabled={Boolean(coordinatorFilter)} selectedValue={salesPersonFilter} onValueChange={(value) => setSalesPersonFilter(String(value))} style={[styles.headerLeadPickerControl, isDark && styles.headerLeadPickerControlDark]}><Picker.Item label={coordinatorFilter ? 'All Sales Persons' : 'Choose salesperson'} value="" />{salesPeople.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View></View>
      </> : null}
    </View>
    <Modal transparent visible={datePickerVisible} animationType="fade" onRequestClose={() => setDatePickerVisible(false)}><Pressable style={styles.filterBackdrop} onPress={() => setDatePickerVisible(false)}><Pressable style={styles.filterPopover} onPress={() => undefined}>
      <View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>ASSIGNED DATE RANGE</Text><Text style={styles.filterPopoverHint}>Choose a start and end date</Text></View><Pressable onPress={() => setDatePickerVisible(false)}><Icon source="close" size={18} color="#64748B" /></Pressable></View>
      <View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{draftDateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar key={`${dateTarget}-${draftDateRange[dateTarget]}`} value={draftDateRange[dateTarget]} onSelect={(value) => { setDraftDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View>
      <View style={styles.filterActions}><Pressable onPress={() => { setDraftDateRange({ from: '', to: '' }); setDateTarget(null); }} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable><Pressable onPress={() => { setDateRange(draftDateRange); setDatePickerVisible(false); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable></View>
    </Pressable></Pressable></Modal>
  </>;
}

export function AssignedLeadCards({ leads, onOpen }: { leads: LeadResponse[]; onOpen: (lead: LeadResponse) => void }) {
  const compact = useWindowDimensions().width < 760;
  const { isDark } = useAppTheme();
  if (compact && leads.length) return <View>{leads.map((lead, index) => <View key={lead.uniqueLeadId ?? lead.leadId ?? lead.leadCode ?? index} style={[assignedMobile.row, index % 2 === 1 && assignedMobile.alternate]}>
    <View style={assignedMobile.top}><Text numberOfLines={2} style={assignedMobile.name}>{show(lead.clientName)}</Text><Text numberOfLines={2} style={assignedMobile.status}>{show(lead.leadStatus).replace(/_/g, ' ')}</Text></View>
    <View style={assignedMobile.person}><Icon source="account-outline" size={13} color="#64748B" /><Text numberOfLines={1} style={assignedMobile.personName}>{show(lead.assignedEmployeeName)}</Text><Text style={assignedMobile.role}>{leadRole(lead)}</Text></View>
    <View style={assignedMobile.bottom}><Text style={assignedMobile.date}>Assigned: {show(lead.assignedAt?.slice(0, 10))}</Text><Pressable accessibilityRole="button" accessibilityLabel={`View details for ${show(lead.clientName)}`} onPress={() => onOpen(lead)} style={assignedMobile.details}><Text style={assignedMobile.detailsText}>Details</Text><Icon source="chevron-right" size={14} color="#4338CA" /></Pressable></View>
  </View>)}</View>;

  const tones = [styles.leadToneBlue, styles.leadToneTeal, styles.leadToneViolet, styles.leadToneAmber];
  return <View style={[styles.assignedLeadWrap, compact && styles.assignedLeadWrapCompact]}><View style={[styles.assignedLeadGrid, compact && styles.assignedLeadGridCompact]}>{leads.length ? leads.map((lead) => <Pressable key={lead.leadId ?? lead.leadCode} onPress={() => onOpen(lead)} style={({ pressed }) => [styles.assignedLeadCard, compact && styles.assignedLeadCardCompact, tones[leadCardTone(lead)], pressed && styles.pressed]}>
    <View style={styles.assignedLeadTop}><View style={styles.assignedLeadCopy}><Text numberOfLines={1} style={[styles.assignedLeadName, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{show(lead.clientName)}</Text><Text style={styles.assignedLeadMeta}>{leadRole(lead)}</Text></View><View style={styles.leadStatusPill}><Text style={styles.leadStatusPillText}>{show(lead.leadStatus).replace(/_/g, ' ')}</Text></View></View>
    <View style={styles.assignedLeadDivider} />
    <View style={[styles.assignedLeadDetails, compact && styles.assignedLeadDetailsCompact]}><View><Text style={styles.assignLabel}>ASSIGNED TO</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedEmployeeName)}</Text></View><View><Text style={styles.assignLabel}>ASSIGNED DATE</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedAt)}</Text></View><View><Text style={styles.assignLabel}>LAST MEETING / VERIFIED</Text><Text style={styles.assignedLeadValue}>{show(lead.audit?.updatedAt)}</Text></View></View>
  </Pressable>) : <State message="No assigned leads match these filters." />}</View></View>;
}

const assignedMobile = StyleSheet.create({
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '100%' },
  filterCell: { flex: 1, minWidth: 0 },
  dateFilter: { flex: 1, minWidth: 0, height: 40, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#D5E1F1', borderRadius: 9 },
  dateFilterText: { flex: 1, color: '#334766', fontSize: 11, fontWeight: '600' },
  filterToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#D7DFFF' },
  filterLabel: { flex: 1, color: '#4338CA', fontSize: 12, fontWeight: '700' },
  row: { paddingHorizontal: 12, paddingVertical: 9, gap: 6, borderLeftWidth: 3, borderLeftColor: '#A5B4FC', borderBottomWidth: 1, borderBottomColor: '#E4EAF5', backgroundColor: '#FAFAFF' },
  alternate: { backgroundColor: '#EEF2FF' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  name: { flex: 1, minWidth: 0, color: '#172B50', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  status: { maxWidth: '38%', color: '#6366F1', fontSize: 10, lineHeight: 14, fontWeight: '700', textAlign: 'right' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  personName: { flexShrink: 1, color: '#52627C', fontSize: 11 },
  role: { color: '#4338CA', fontSize: 10, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: '#E0E7FF' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { color: '#71809A', fontSize: 10 },
  details: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#E0E7FF' },
  detailsText: { color: '#4338CA', fontSize: 11, fontWeight: '700' },
});
