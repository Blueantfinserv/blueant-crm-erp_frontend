import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { clientWorkFollowApi } from '../api/clientWorkFollow';
import { clientMeetingApi } from '../api/clientMeeting';
import { SalesTaskCard } from '../modules/salesManager/tasks/components/SalesTaskCard';
import { getTaskSchedule } from '../modules/salesManager/tasks/taskMeetingSelectors';
import type { SalesTask } from '../modules/salesManager/tasks/types/tasks';
import type { ClientMeetingResponse, ClientWorkFollowResponse } from '../types/crm';
import { theme } from '../theme/theme';

type Props = {
  onUpdateMeeting: (client: SalesTask) => void;
  onOpenDetails: (client: SalesTask) => void;
  refreshKey?: number;
};

const formatDate = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]}`;
};

const toClientTask = (client: ClientWorkFollowResponse, meetings: ClientMeetingResponse[], index: number): SalesTask => {
  const latestMeeting = [...meetings].sort((a, b) => String(b.meetingDate ?? '').localeCompare(String(a.meetingDate ?? '')))[0];
  const nextPlanDate = latestMeeting?.nextPlanDate ?? client.activeMeetingDate;
  return {
    id: client.clientCode ?? String(client.clientId ?? `client-${index}`),
    taskKind: 'CLIENT', clientCode: client.clientCode, meetingCode: client.activeMeetingCode,
    meetingNumber: latestMeeting?.meetingNumber,
    clientMeetingCount: client.totalMeetings ?? 0,
    assignedAt: client.assignmentDate,
    scheduledAt: nextPlanDate ?? client.activeMeetingDate ?? client.assignmentDate,
    name: client.clientName ?? 'Unnamed client', phone: client.mobileNumber ?? '',
    locationText: client.location ?? 'Location unavailable', clinicAddress: client.clinicAddress,
    coordinates: { latitude: 0, longitude: 0 }, hasLocationPin: false,
    taskLabel: 'CLIENT',
    remarks: latestMeeting?.remarks?.trim() || (client.activeMeetingCode ? `Active meeting: ${client.activeMeetingCode}` : 'No meeting scheduled.'),
    lastUpdated: formatDate(latestMeeting?.meetingDate ?? client.assignmentDate, 'Not available'),
    nextFollowUpDate: formatDate(nextPlanDate, 'Not scheduled'), nextPlanDate,
    schedule: getTaskSchedule(nextPlanDate), email: client.email,
    verificationPending: meetings.some((meeting) => meeting.verificationStatus === 'PENDING' || meeting.verifiedByPc === false),
  };
};

export function ClientWorkFollowScreen({ onUpdateMeeting, onOpenDetails, refreshKey = 0 }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth: `${number}%` = width >= 1200 ? '31%' : width >= 700 ? '48%' : '100%';
  const [clients, setClients] = useState<SalesTask[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const first = await clientWorkFollowApi.getQueue({ search: '', page: 0, size: 100 });
      const rest = await Promise.all(Array.from({ length: Math.max(0, (first.totalPages ?? 1) - 1) }, (_, index) => clientWorkFollowApi.getQueue({ search: '', page: index + 1, size: 100 })));
      const assignedClients = [...(first.content ?? []), ...rest.flatMap((page) => page.content ?? [])];
      const tasks = await Promise.all(assignedClients.map(async (client, index) => {
        const code = client.clientCode?.trim();
        const meetings = code ? await clientMeetingApi.getByClientCode(code).catch(() => []) : [];
        return toClientTask(client, meetings, index);
      }));
      setClients(tasks);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Client work follow could not be loaded.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return !needle ? clients : clients.filter((client) => [client.name, client.phone, client.clientCode, client.locationText].some((value) => String(value ?? '').toLowerCase().includes(needle)));
  }, [clients, search]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View><Text style={styles.title}>Client Details</Text></View>
        <Pressable disabled={refreshing} onPress={() => void load(true)} style={({ pressed }) => [styles.refresh, refreshing && styles.disabled, pressed && styles.pressed]}>
          {refreshing ? <ActivityIndicator size="small" color="#3156C8" /> : <Icon source="refresh" size={18} color="#3156C8" />}
          <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <Icon source="magnify" size={19} color="#3156C8" />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search by client name, mobile or code" placeholderTextColor="#94A3B8" style={styles.search} />
      </View>
      {loading ? (
        <View style={styles.state}><ActivityIndicator color="#3156C8" /><Text style={styles.stateText}>Loading assigned clients...</Text></View>
      ) : error ? (
        <View style={styles.state}><Icon source="alert-circle-outline" size={34} color="#B91C1C" /><Text style={styles.stateText}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
          {visible.length ? visible.map((client) => (
            <SalesTaskCard key={client.id} task={client} width={cardWidth} onUpdateMeeting={onUpdateMeeting} onOpenDetails={onOpenDetails} />
          )) : (
            <View style={styles.state}><Icon source="account-multiple-outline" size={34} color="#94A3B8" /><Text style={styles.stateTitle}>No assigned clients found</Text><Text style={styles.stateText}>Clients assigned by CRM will appear here.</Text></View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    page: { flex: 1, minHeight: 0, gap: 12, paddingTop: 2, backgroundColor: theme.colors.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { color: '#172033', fontSize: 15, lineHeight: 18, fontWeight: '900', letterSpacing: -0.35 }, refresh: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: '#A7DFD7', borderRadius: 9, backgroundColor: '#ECFDF8' }, refreshText: { color: '#3156C8', fontSize: 11, fontWeight: '900' }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 460, minHeight: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D8E3FB', borderRadius: 10, backgroundColor: '#FFFFFF' }, search: { flex: 1, color: '#172033', fontSize: 11, fontWeight: '700' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center', gap: theme.spacing.md, paddingBottom: 28 },
  state: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 }, stateTitle: { color: '#172033', fontSize: 15, fontWeight: '900' }, stateText: { maxWidth: 390, color: '#64748B', fontSize: 12, fontWeight: '600', textAlign: 'center' }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.8 },
});
