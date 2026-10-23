import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { clientMeetingApi } from '../api/clientMeeting';
import type { SalesTask } from '../modules/salesManager/tasks/types/tasks';

type Outcome = 'CONDUCTED' | 'NOT_CONDUCTED';
type Mode = 'PHYSICAL' | 'VIRTUAL/ONLINE' | 'PHONE';
type Coordinates = { latitude: number; longitude: number; accuracy: number | null };
type FollowUpOption = { label: string; value: string; detail: string };

const localDate = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const FOLLOW_UP_OFFSETS: Array<[string, number, number?]> = [
  ['Tomorrow', 1], ['Day After Tomorrow', 2], ['After 3 days', 3], ['After 5 days', 5], ['After 8 days', 8], ['After 14 days', 14], ['After 1 Month', 0, 1], ['After 2 months', 0, 2],
];
const followUpOptions = (): FollowUpOption[] => FOLLOW_UP_OFFSETS.map(([label, days, months]) => {
  const date = new Date(); date.setHours(0, 0, 0, 0);
  if (months) date.setMonth(date.getMonth() + months); else date.setDate(date.getDate() + days);
  return { label: String(label), value: localDate(date), detail: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', weekday: 'long' }).format(date) };
});

export function ClientMeetingScheduleForm({ client, onClose, onSuccess }: { client: SalesTask; onClose: () => void; onSuccess: () => void }) {
  const [outcome, setOutcome] = useState<Outcome>('CONDUCTED');
  const [mode, setMode] = useState<Mode>('PHYSICAL');
  const [aloneWith, setAloneWith] = useState<'SELF' | 'SOMEONE'>('SELF');
  const [businessGenerated, setBusinessGenerated] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextPlanDate, setNextPlanDate] = useState(() => followUpOptions().find((option) => option.label === 'After 2 months')?.value ?? '');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = async () => {
    if (capturing) return;
    setCapturing(true); setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setError('Location permission is required to capture the meeting location.'); return; }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoordinates({ latitude: current.coords.latitude, longitude: current.coords.longitude, accuracy: current.coords.accuracy });
    } catch { setError('Current location could not be captured. Enable location services and try again.'); }
    finally { setCapturing(false); }
  };

  const submit = async () => {
    if (!client.clientCode) { setError('Client code is unavailable. Refresh the task list and try again.'); return; }
    if (remarks.length > 1000) { setError('Remarks can be at most 1000 characters.'); return; }
    if (nextPlanDate && !followUpOptions().some((option) => option.value === nextPlanDate)) { setError('Choose a next plan date from the available options.'); return; }
    setSaving(true); setError(null);
    try {
      await clientMeetingApi.update(client.clientCode, {
        meetingConducted: outcome,
        meetingDate: localDate(),
        ...(outcome === 'CONDUCTED' ? { meetingMode: mode, aloneWith, businessGenerated: businessGenerated || undefined } : {}),
        remarks: remarks.trim() || undefined,
        nextPlanDate: nextPlanDate || undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        accuracy: coordinates?.accuracy ?? undefined,
      });
      onSuccess();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Client meeting update could not be saved.'); }
    finally { setSaving(false); }
  };

  return <View style={styles.shell}>
    <LinearGradient colors={['#172554', '#3730A3', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.glow} /><View style={styles.heroIcon}><Icon source="calendar-check-outline" size={26} color="#FFFFFF" /></View>
      <View style={styles.heroCopy}><Text style={styles.eyebrow}>CLIENTS</Text><Text style={styles.heroTitle}>Meeting Update</Text><Text style={styles.heroSubtitle}>Record your client meeting outcome</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close meeting update" onPress={onClose} style={styles.close}><Icon source="close" size={26} color="#FFFFFF" /></Pressable>
    </LinearGradient>
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.cardHeading}><View style={styles.cardIcon}><Icon source="clipboard-text-outline" size={18} color="#2563EB" /></View><View><Text style={styles.cardTitle}>Meeting Information</Text><Text style={styles.cardCaption}>Fields marked with * are required</Text></View></View>
        <View style={styles.clientSummary}><View style={styles.clientSummaryCell}><Text style={styles.summaryLabel}>CLIENT</Text><Text numberOfLines={1} style={styles.summaryValue}>{client.name}</Text></View><View style={styles.clientSummaryCell}><Text style={styles.summaryLabel}>NUMBER</Text><Text numberOfLines={1} style={styles.summaryValue}>{client.phone || '—'}</Text></View></View>
        <Text style={styles.label}>Client Meeting Status *</Text>
        <View style={styles.statusRow}><Status selected={outcome === 'CONDUCTED'} label="Conducted" icon="check-circle" onPress={() => setOutcome('CONDUCTED')} /><Status selected={outcome === 'NOT_CONDUCTED'} label="Not Conducted" icon="minus-circle-outline" onPress={() => setOutcome('NOT_CONDUCTED')} /></View>
        {outcome === 'NOT_CONDUCTED' ? <Field label="Meeting Date"><View style={styles.fixedDate}><Icon source="calendar-outline" size={17} color="#64748B" /><Text style={styles.fixedDateText}>{localDate()}</Text><Text style={styles.fixedDateHint}>Today</Text></View></Field> : <><Field label="Meeting Mode"><CompactDropdown value={mode} options={[{ label: 'Physical', value: 'PHYSICAL' }, { label: 'Virtual / Online', value: 'VIRTUAL/ONLINE' }, { label: 'Phone', value: 'PHONE' }]} onSelect={(value) => setMode(value as Mode)} /></Field><View style={styles.twoColumn}><Field compact label="Along With"><CompactDropdown value={aloneWith} options={[{ label: 'Alone', value: 'SELF' }, { label: 'Someone', value: 'SOMEONE' }]} onSelect={(value) => setAloneWith(value as 'SELF' | 'SOMEONE')} /></Field><Field compact label="Business Generated"><CompactDropdown value={businessGenerated} placeholder="Select" options={[{ label: 'Yes', value: 'YES' }, { label: 'No', value: 'NO' }]} onSelect={setBusinessGenerated} /></Field></View></>}
        <Field label="Remarks"><TextInput value={remarks} onChangeText={setRemarks} maxLength={1000} multiline placeholder="Add meeting remarks" placeholderTextColor="#94A3B8" style={[styles.input, styles.remarks]} /></Field>
        <Field label="Next Plan Date"><FollowUpPicker value={nextPlanDate} onSelect={setNextPlanDate} /></Field>
        <Field label="Location Pinned">
          <Pressable accessibilityRole="button" disabled={capturing} onPress={() => void captureLocation()} style={[styles.captureBox, capturing && styles.disabled]}>
            <View style={[styles.captureIcon, coordinates ? styles.captureIconDone : undefined]}>{capturing ? <ActivityIndicator size="small" color="#2563EB" /> : <Icon source={coordinates ? 'map-marker-check' : 'crosshairs-gps'} size={20} color={coordinates ? '#047857' : '#2563EB'} />}</View>
            <View style={styles.captureCopy}>
              <View style={styles.captureTitleRow}><Text style={styles.captureTitle}>{capturing ? 'Fetching live location...' : coordinates ? 'Live location captured' : 'Capture current location'}</Text>{coordinates ? <View style={styles.verified}><Text style={styles.verifiedText}>VERIFIED</Text></View> : null}</View>
              <Text style={styles.captureDescription}>{coordinates ? 'Accuracy: ' + (coordinates.accuracy?.toFixed(1) ?? '—') + ' m' : 'Tap to fetch latitude, longitude and accuracy'}</Text>
              {coordinates ? <View style={styles.coordinateChips}><CoordinateChip label="LAT" value={coordinates.latitude.toFixed(6)} /><CoordinateChip label="LONG" value={coordinates.longitude.toFixed(6)} /></View> : null}
            </View>
            <Icon source={coordinates ? 'refresh' : 'chevron-right'} size={19} color="#4F46E5" />
          </Pressable>
        </Field>
        {error ? <View style={styles.errorBox}><Icon source="alert-circle-outline" size={17} color="#B91C1C" /><Text style={styles.error}>{error}</Text></View> : null}
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <><Icon source="check-circle-outline" size={19} color="#FFFFFF" /><Text style={styles.submitText}>Submit Meeting Update</Text></>}</Pressable>
      </View>
    </ScrollView>
  </View>;
}

function Field({ label, compact, children }: { label: string; compact?: boolean; children: React.ReactNode }) { return <View style={[styles.field, compact && styles.compactField]}><Text style={styles.label}>{label}</Text>{children}</View>; }
function Status({ selected, label, icon, onPress }: { selected: boolean; label: string; icon: string; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.status, selected && styles.statusSelected]}><Icon source={icon} size={18} color={selected ? '#6D28D9' : '#94A3B8'} /><Text style={[styles.statusText, selected && styles.statusTextSelected]}>{label}</Text></Pressable>; }
function CoordinateChip({ label, value }: { label: string; value: string }) { return <View style={styles.coordinateChip}><Text style={styles.coordinateLabel}>{label}</Text><Text style={styles.coordinateText}>{value}</Text></View>; }
function CompactDropdown({ value, options, placeholder = '', onSelect }: { value: string; options: Array<{ label: string; value: string }>; placeholder?: string; onSelect: (value: string) => void }) { const [open, setOpen] = useState(false); const selected = options.find((option) => option.value === value); return <View style={styles.dropdownWrap}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.dropdownTrigger}><Text numberOfLines={1} style={[styles.dropdownValue, !selected && styles.dropdownPlaceholder]}>{selected?.label ?? placeholder}</Text><View style={styles.dropdownChevron}><Icon source={open ? 'chevron-up' : 'chevron-down'} size={17} color="#6D28D9" /></View></Pressable>{open ? <View style={styles.dropdownMenu}>{options.map((option) => { const active = option.value === value; return <Pressable key={option.value} accessibilityRole="menuitem" onPress={() => { onSelect(option.value); setOpen(false); }} style={[styles.dropdownOption, active && styles.dropdownOptionSelected]}><Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextSelected]}>{option.label}</Text>{active ? <Icon source="check" size={16} color="#7C3AED" /> : null}</Pressable>; })}</View> : null}</View>; }
function FollowUpPicker({ value, onSelect }: { value: string; onSelect: (value: string) => void }) { const [open, setOpen] = useState(false); const options = followUpOptions(); const selected = options.find((option) => option.value === value); return <View style={styles.followUpWrap}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.followUpTrigger}><View><Text style={[styles.followUpLabel, !selected && styles.followUpPlaceholder]}>{selected?.label ?? 'Select follow-up date'}</Text>{selected ? <Text style={styles.followUpDetail}>{selected.detail}</Text> : null}</View><View style={styles.followUpChevron}><Icon source={open ? 'chevron-up' : 'chevron-down'} size={20} color="#6D28D9" /></View></Pressable>{open ? <View style={styles.followUpMenu}>{options.map((option) => { const active = option.value === value; return <Pressable key={option.value} accessibilityRole="menuitem" onPress={() => { onSelect(option.value); setOpen(false); }} style={[styles.followUpOption, active && styles.followUpOptionSelected]}><View style={[styles.followUpDot, active && styles.followUpDotSelected]}>{active ? <Icon source="check" size={12} color="#FFFFFF" /> : null}</View><Text style={[styles.followUpOptionLabel, active && styles.followUpOptionLabelSelected]}>{option.label}</Text><Text style={styles.followUpOptionDetail}>{option.detail}</Text></Pressable>; })}</View> : null}</View>; }

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#F8FAFC' }, hero: { minHeight: 130, paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' }, glow: { position: 'absolute', width: 185, height: 185, borderRadius: 100, right: -55, top: -95, backgroundColor: 'rgba(255,255,255,0.13)' }, heroIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.12)' }, heroCopy: { flex: 1 }, eyebrow: { color: '#DDD6FE', fontSize: 10, letterSpacing: 1, fontWeight: '900' }, heroTitle: { marginTop: 3, color: '#FFFFFF', fontSize: 20, fontWeight: '900' }, heroSubtitle: { marginTop: 3, color: '#EDE9FE', fontSize: 11, fontWeight: '700' }, close: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.12)' },
  scrollView: { flex: 1 }, scroll: { padding: 13 }, card: { gap: 10, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', shadowColor: '#1E3A8A', shadowOpacity: .08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, cardHeading: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, cardIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF0FF' }, cardTitle: { color: '#172554', fontSize: 16, fontWeight: '900' }, cardCaption: { color: '#94A3B8', marginTop: 1, fontSize: 9, fontWeight: '700' }, field: { gap: 4 }, compactField: { flex: 1, minWidth: 0 }, label: { color: '#334155', fontSize: 12, fontWeight: '900' }, fixedDate: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#D8E1F0', borderRadius: 10, backgroundColor: '#F1F5F9' }, fixedDateText: { flex: 1, color: '#475569', fontSize: 13, fontWeight: '800' }, fixedDateHint: { color: '#64748B', fontSize: 10, fontWeight: '800' }, clientSummary: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 14, backgroundColor: '#F5F3FF' }, clientSummaryCell: { flex: 1, minWidth: 0 }, summaryLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: .45 }, summaryValue: { marginTop: 4, color: '#4C1D95', fontSize: 14, fontWeight: '900' }, twoColumn: { flexDirection: 'row', gap: 8 },
  statusRow: { flexDirection: 'row', gap: 8 }, status: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 13, backgroundColor: '#F8FAFC' }, statusSelected: { borderColor: '#8B5CF6', backgroundColor: '#FAF5FF' }, statusText: { color: '#475569', fontSize: 12, fontWeight: '800' }, statusTextSelected: { color: '#6D28D9' }, input: { minHeight: 40, paddingHorizontal: 11, borderWidth: 1, borderColor: '#D8E1F0', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#172033', fontSize: 13, fontWeight: '600' }, remarks: { minHeight: 66, paddingTop: 10, textAlignVertical: 'top' },
  dropdownWrap: { zIndex: 5 }, dropdownTrigger: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 11, paddingRight: 6, borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 10, backgroundColor: '#FAF5FF' }, dropdownValue: { flex: 1, color: '#4C1D95', fontSize: 12, fontWeight: '800' }, dropdownPlaceholder: { color: '#94A3B8' }, dropdownChevron: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#EDE9FE' }, dropdownMenu: { marginTop: 5, borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF' }, dropdownOption: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, dropdownOptionSelected: { backgroundColor: '#F5F3FF' }, dropdownOptionText: { color: '#334155', fontSize: 11, fontWeight: '800' }, dropdownOptionTextSelected: { color: '#6D28D9' },
  followUpWrap: { zIndex: 4 }, followUpTrigger: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderWidth: 1, borderColor: '#C4B5FD', borderRadius: 11, backgroundColor: '#FAF5FF' }, followUpLabel: { color: '#4C1D95', fontSize: 12, fontWeight: '900' }, followUpPlaceholder: { color: '#94A3B8' }, followUpDetail: { marginTop: 1, color: '#7C3AED', fontSize: 9, fontWeight: '700' }, followUpChevron: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#EDE9FE' }, followUpMenu: { marginTop: 5, borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 11, overflow: 'hidden', backgroundColor: '#FFFFFF' }, followUpOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, followUpOptionSelected: { backgroundColor: '#F5F3FF' }, followUpDot: { width: 18, height: 18, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, followUpDotSelected: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' }, followUpOptionLabel: { flex: 1, color: '#334155', fontSize: 11, fontWeight: '900' }, followUpOptionLabelSelected: { color: '#6D28D9' }, followUpOptionDetail: { color: '#7C3AED', fontSize: 9, fontWeight: '700' },
  captureBox: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderWidth: 1, borderColor: '#DCE4F2', borderRadius: 13, backgroundColor: '#F8FAFF' }, captureIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#E8F0FF' }, captureIconDone: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#BBF7D0' }, captureCopy: { flex: 1 }, captureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, captureTitle: { color: '#172554', fontSize: 11, fontWeight: '900' }, captureDescription: { marginTop: 2, color: '#64748B', fontSize: 9, fontWeight: '700' }, verified: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 7, backgroundColor: '#ECFDF5' }, verifiedText: { color: '#047857', fontSize: 6, fontWeight: '900', letterSpacing: .5 }, coordinateChips: { flexDirection: 'row', gap: 4, marginTop: 5 }, coordinateChip: { flexDirection: 'row', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: '#EEF2FF' }, coordinateLabel: { color: '#818CF8', fontSize: 6, fontWeight: '900' }, coordinateText: { color: '#3730A3', fontSize: 7, fontWeight: '900' },
  errorBox: { flexDirection: 'row', gap: 7, alignItems: 'center', padding: 9, borderRadius: 9, backgroundColor: '#FEF2F2' }, error: { flex: 1, color: '#B91C1C', fontSize: 11, fontWeight: '700' }, submit: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: '#6D28D9', marginTop: 2 }, disabled: { opacity: .65 }, submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
