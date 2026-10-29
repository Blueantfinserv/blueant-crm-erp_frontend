import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { ActivityIndicator,Modal,Platform,Pressable,Text,TextInput,useWindowDimensions,View } from 'react-native';
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

export function HeaderLeadFilters({ leads, coordinatorFilter, setCoordinatorFilter, salesPersonFilter, setSalesPersonFilter, dateRange, setDateRange, search, setSearch }: { leads: LeadResponse[]; coordinatorFilter: string; setCoordinatorFilter: (value: string) => void; salesPersonFilter: string; setSalesPersonFilter: (value: string) => void; dateRange: AssignedDateRange; setDateRange: (value: AssignedDateRange) => void; search: string; setSearch: (value: string) => void }) {
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

export function AssignedLeadCards({ leads, onOpen }: { leads: LeadResponse[]; onOpen: (lead: LeadResponse) => void }) {
  const compact = useWindowDimensions().width < 760;
  const { isDark } = useAppTheme();
  const tones = [styles.leadToneBlue, styles.leadToneTeal, styles.leadToneViolet, styles.leadToneAmber];
  return <View style={[styles.assignedLeadWrap, compact && styles.assignedLeadWrapCompact]}><View style={[styles.assignedLeadGrid, compact && styles.assignedLeadGridCompact]}>{leads.length ? leads.map((lead) => <Pressable key={lead.leadId ?? lead.leadCode} onPress={() => onOpen(lead)} style={({ pressed }) => [styles.assignedLeadCard, compact && styles.assignedLeadCardCompact, tones[leadCardTone(lead)], pressed && styles.pressed]}>
    <View style={styles.assignedLeadTop}><View style={styles.assignedLeadCopy}><Text numberOfLines={1} style={[styles.assignedLeadName, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{show(lead.clientName)}</Text><Text style={styles.assignedLeadMeta}>{leadRole(lead)}</Text></View><View style={styles.leadStatusPill}><Text style={styles.leadStatusPillText}>{show(lead.leadStatus).replace(/_/g, ' ')}</Text></View></View>
    <View style={styles.assignedLeadDivider} />
    <View style={[styles.assignedLeadDetails, compact && styles.assignedLeadDetailsCompact]}><View><Text style={styles.assignLabel}>ASSIGNED TO</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedEmployeeName)}</Text></View><View><Text style={styles.assignLabel}>ASSIGNED DATE</Text><Text style={styles.assignedLeadValue}>{show(lead.assignedAt)}</Text></View><View><Text style={styles.assignLabel}>LAST MEETING / VERIFIED</Text><Text style={styles.assignedLeadValue}>{show(lead.audit?.updatedAt)}</Text></View></View>
  </Pressable>) : <State message="No assigned leads match these filters." />}</View></View>;
}
