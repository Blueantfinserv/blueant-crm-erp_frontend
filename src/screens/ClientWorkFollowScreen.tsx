import { latestClientMeeting } from '../utils/clientHistorySelectors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { clientHistoryService, type ClientHistoryReadCycle } from '../services/ClientHistoryService';
import { SalesTaskCard } from '../modules/salesManager/tasks/components/SalesTaskCard';
import { loadClientTaskQueue, type ClientTaskQueueProgress } from '../modules/salesManager/tasks/clientTaskData';
import { getTaskSchedule } from '../modules/salesManager/tasks/taskMeetingSelectors';
import type { SalesTask } from '../modules/salesManager/tasks/types/tasks';
import type { ClientMeetingResponse, ClientWorkFollowResponse } from '../types/crm';
import { theme } from '../theme/theme';

type Props = {
  onUpdateMeeting: (client: SalesTask) => void;
  onOpenDetails: (client: SalesTask) => void;
  refreshKey?: number;
  active?: boolean;
  historyCycle?: ClientHistoryReadCycle;
};

const formatDate = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]}`;
};

const toClientTask = (client: ClientWorkFollowResponse, meetings: ClientMeetingResponse[], index: number): SalesTask => {
  const latestMeeting = latestClientMeeting(meetings);
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

export function ClientWorkFollowScreen({ onUpdateMeeting, onOpenDetails, refreshKey = 0, active = true, historyCycle }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth: `${number}%` = width >= 1200 ? '31%' : width >= 700 ? '48%' : '100%';
  const [clients, setClients] = useState<SalesTask[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ClientTaskQueueProgress>({
    loadedClients: 0, totalClients: null, loadedPages: 0, totalPages: 0,
    queueComplete: false, historyPending: 0, historyCompleted: 0, historyFailed: 0,
  });
  const loadId = useRef(0);
  const rawClients = useRef(new Map<string, { client: ClientWorkFollowResponse; index: number }>());
  const consumedHistoryCycle = useRef<ClientHistoryReadCycle | undefined>(undefined);
  const pendingHistoryUpdates = useRef(new Map<string, SalesTask>());
  const historyUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushHistoryUpdates = () => {
    if (historyUpdateTimer.current) clearTimeout(historyUpdateTimer.current);
    historyUpdateTimer.current = null;
    const updates = [...pendingHistoryUpdates.current.values()];
    pendingHistoryUpdates.current.clear();
    if (!updates.length) return;
    setClients(current => {
      let next = current;
      updates.forEach(task => {
        const index = next.findIndex(existing => existing.id === task.id);
        if (index < 0) return;
        if (next === current) next = current.slice();
        next[index] = task;
      });
      return next;
    });
  };
  const queueHistoryUpdate = (task: SalesTask) => {
    pendingHistoryUpdates.current.set(task.id, task);
    if (!historyUpdateTimer.current) historyUpdateTimer.current = setTimeout(flushHistoryUpdates, 40);
  };
  const load = useCallback(async (refresh = false) => {
    const id = ++loadId.current;
    setLoading(true);
    setRefreshing(refresh);
    setError(null);
    setProgress({
      loadedClients: 0, totalClients: null, loadedPages: 0, totalPages: 0,
      queueComplete: false, historyPending: 0, historyCompleted: 0, historyFailed: 0,
    });
    try {
      const scope = clientHistoryService.captureScope();
      const cycle = historyCycle && consumedHistoryCycle.current !== historyCycle ? historyCycle : undefined;
      consumedHistoryCycle.current = historyCycle;
      const current = () => id === loadId.current && clientHistoryService.isCurrentScope(scope);
      pendingHistoryUpdates.current.clear();
      rawClients.current.clear();
      if (historyUpdateTimer.current) clearTimeout(historyUpdateTimer.current);
      historyUpdateTimer.current = null;
      await loadClientTaskQueue({
        valid: current,
        cycle,
        onClients: (assignedClients, nextProgress, startIndex) => {
          if (!current()) return;
          const tasks = assignedClients.map((client, index): SalesTask => {
            if (client.clientCode) rawClients.current.set(client.clientCode, { client, index: startIndex + index });
            return { ...toClientTask(client, clientHistoryService.getSnapshot(client.clientCode ?? '').history ?? [], startIndex + index), historyLoadState: client.clientCode?.trim() ? 'loading' : 'error', verificationPending: true, remarks: 'Loading meeting history...', lastUpdated: 'Loading...', nextFollowUpDate: 'Loading...' };
          });
          if (startIndex === 0) setClients(tasks);
          else setClients(previous => {
            const identities = new Set(previous.map(task => task.id));
            const additions = tasks.filter(task => !identities.has(task.id));
            return additions.length ? [...previous, ...additions] : previous;
          });
        },
        onHistory: (client, index, history) => {
          if (current()) queueHistoryUpdate(toClientTask(client, history, index));
        },
        onHistoryError: code => {
          const source = rawClients.current.get(code);
          if (current() && source) {
            const cached = clientHistoryService.getSnapshot(code).history;
            queueHistoryUpdate({ ...toClientTask(source.client, cached ?? [], source.index),
              ...(cached === undefined ? { remarks: 'Meeting history could not be loaded.', lastUpdated: 'Unavailable', nextFollowUpDate: 'Unavailable' } : {}),
              historyLoadState: 'error', verificationPending: true });
          }
        },
        onProgress: nextProgress => {
          if (!current()) return;
          setProgress(nextProgress);
          if (nextProgress.queueComplete) setLoading(false);
        },
      });
    } catch (cause) {
      if (id === loadId.current) setError(cause instanceof Error ? cause.message : 'Client work follow could not be loaded.');
    } finally {
      if (id === loadId.current) { setLoading(false); setRefreshing(false); flushHistoryUpdates(); }
    }
  }, [historyCycle]);
  useEffect(() => {
    void load();
    return () => {
      loadId.current += 1;
      if (historyUpdateTimer.current) clearTimeout(historyUpdateTimer.current);
      historyUpdateTimer.current = null;
      pendingHistoryUpdates.current.clear();
    };
  }, [load, refreshKey]);
  useEffect(() => clientHistoryService.subscribeInvalidatedHistory((code, history) => {
    const source = rawClients.current.get(code);
    if (source) queueHistoryUpdate(toClientTask(source.client, history, source.index));
  }), []);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) void load(true);
    wasActive.current = active;
  }, [active, load]);
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
      {loading && !clients.length ? (
        <View style={styles.state}><ActivityIndicator color="#3156C8" /><Text style={styles.stateText}>Loading assigned clients...</Text></View>
      ) : error && !clients.length ? (
        <View style={styles.state}><Icon source="alert-circle-outline" size={34} color="#B91C1C" /><Text style={styles.stateText}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
          {error ? <Text accessibilityRole="alert" style={[styles.stateText, { width: '100%' }]}>Refresh failed: {error}. Showing previously loaded clients; tap Refresh to retry.</Text> : null}
          {progress.historyFailed > 0 ? <Text accessibilityRole="alert" style={[styles.stateText, { width: '100%' }]}>Meeting history could not be loaded for {progress.historyFailed} clients. Their client cards remain available; tap Refresh to retry.</Text> : null}
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
