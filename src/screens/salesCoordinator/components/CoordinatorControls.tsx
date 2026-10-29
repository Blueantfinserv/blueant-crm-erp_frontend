import { useEffect,useRef,useState,type MutableRefObject } from 'react';
import { ActivityIndicator,Animated,Pressable,Text,TextInput,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { popupStyles,styles } from '../../salesCoordinatorStyles';
import { PAGE_SIZE } from '../coordinatorConstants';
import type { Tab } from '../coordinatorTypes';

export function SubmitButton({ submitting, onPress, label, blue = false }: { submitting: boolean; onPress: () => void; label: string; blue?: boolean }) {
  return <Pressable disabled={submitting} onPress={onPress} style={[styles.submit, blue && popupStyles.submit, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Icon source="check-decagram-outline" size={20} color="#fff" />}<Text style={styles.submitText}>{submitting ? 'Verifying...' : label}</Text></Pressable>;
}

export function AutoRefreshBadge({ tab, refreshing, submitting, nextRefreshAt, nextVerifiedRefreshAt, nextTaskRefreshAt, nextAssignedLeadsRefreshAt }: { tab: Tab; refreshing: boolean; submitting: boolean; nextRefreshAt: MutableRefObject<number>; nextVerifiedRefreshAt: MutableRefObject<number>; nextTaskRefreshAt: MutableRefObject<number>; nextAssignedLeadsRefreshAt: MutableRefObject<number> }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () => {
      const next = tab === 'today' ? nextRefreshAt.current : tab === 'responses' ? nextVerifiedRefreshAt.current : tab === 'tasks' ? nextTaskRefreshAt.current : tab === 'assignedLeads' ? nextAssignedLeadsRefreshAt.current : null;
      setSeconds(next === null ? null : Math.max(0, Math.ceil((next - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [nextAssignedLeadsRefreshAt, nextRefreshAt, nextTaskRefreshAt, nextVerifiedRefreshAt, tab]);
  const label = seconds === null ? 'Ready' : seconds >= 3600 ? `${Math.ceil(seconds / 3600)}h` : seconds >= 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
  return <View style={styles.autoRefreshBadge}><View style={styles.autoRefreshDot} /><Text style={styles.autoRefreshLabel}>{refreshing ? 'Syncing' : submitting ? 'Paused' : tab === 'assign' ? 'Ready' : 'Auto-refresh'}</Text><View style={styles.countdownBadge}>{refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.countdownText}>{label}</Text>}</View></View>;
}

export function Pagination({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE + 1;
  const end = Math.min(total, (safePage + 1) * PAGE_SIZE);
  return <View style={styles.pagination}><Text style={styles.paginationText}>Showing {start}–{end} of {total}</Text><View style={styles.paginationControls}><Pressable disabled={safePage === 0} onPress={() => onPageChange(safePage - 1)} style={[styles.paginationButton, safePage === 0 && styles.disabled]}><Text style={styles.paginationButtonText}>Previous</Text></Pressable><Text style={styles.paginationText}>Page {safePage + 1} of {totalPages}</Text><Pressable disabled={safePage === totalPages - 1} onPress={() => onPageChange(safePage + 1)} style={[styles.paginationButton, safePage === totalPages - 1 && styles.disabled]}><Text style={styles.paginationButtonText}>Next</Text></Pressable></View></View>;
}

export function Metric({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'blue' | 'orange' }) {
  const toneStyle = tone === 'orange' ? styles.metricOrange : styles.metricBlue;
  const accentStyle = tone === 'orange' ? styles.metricAccentOrange : styles.metricAccentBlue;
  const color = tone === 'orange' ? '#D97706' : '#3156C8';
  return <View style={[styles.metric, accentStyle]}><View style={[styles.metricIcon, toneStyle]}><Icon source={icon} size={15} color={color} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>;
}

export function TaskToolbar({ search, onSearch, status, onStatus }: { search: string; onSearch: (value: string) => void; status: 'ALL' | 'TODAY' | 'PENDING'; onStatus: (value: 'ALL' | 'TODAY' | 'PENDING') => void }) {
  return <View style={[styles.taskToolbar, styles.taskToolbarHeader]}><TextInput value={search} onChangeText={onSearch} placeholder="Search lead name or number" placeholderTextColor="#94A3B8" style={styles.filterInput} /><View style={styles.chips}>{(['ALL', 'TODAY', 'PENDING'] as const).map((value) => <Pressable key={value} onPress={() => onStatus(value)} style={[styles.chip, status === value && styles.chipActive]}><Text style={[styles.chipText, status === value && styles.chipTextActive]}>{value === 'ALL' ? 'ALL TASKS' : `${value} TASKS`}</Text></Pressable>)}</View></View>;
}

export function State({ message, loading = false, progress = 10 }: { message: string; loading?: boolean; progress?: number }) {
  return <View style={styles.state}>
    {loading ? <LoadingProgressBar progress={progress} /> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}
    <Text style={styles.stateText}>{message}</Text>
  </View>;
}

export function LoadingProgressBar({ progress }: { progress: number }) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    const animation = Animated.timing(animatedProgress, { toValue: progress, duration: 240, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [animatedProgress, progress]);
  const width = animatedProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return <View style={styles.loadingProgressWrap}><View style={styles.loadingProgressTrack}><Animated.View style={[styles.loadingProgressFill, { width }]} /></View><Text style={styles.loadingProgressValue}>{progress}%</Text></View>;
}
