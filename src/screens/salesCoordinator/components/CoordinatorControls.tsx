import { VerificationDropdown } from '../../../components/VerificationDropdown';
import { useEffect,useRef,useState,type MutableRefObject } from 'react';
import { ActivityIndicator,Animated,Easing,Pressable,Text,TextInput,useWindowDimensions,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { popupStyles,styles } from '../../salesCoordinatorStyles';
import { PAGE_SIZE } from '../coordinatorConstants';
import type { Tab } from '../coordinatorTypes';

export function SubmitButton({ submitting, onPress, label, blue = false }: { submitting: boolean; onPress: () => void; label: string; blue?: boolean }) {
  return <Pressable disabled={submitting} onPress={onPress} style={[styles.submit, blue && popupStyles.submit, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Icon source="check-decagram-outline" size={20} color="#fff" />}<Text style={styles.submitText}>{submitting ? 'Verifying...' : label}</Text></Pressable>;
}

export function AutoRefreshBadge({ tab, refreshing, submitting, nextRefreshAt, nextVerifiedRefreshAt, nextTaskRefreshAt, nextAssignedLeadsRefreshAt, compact = false, countOnly = false }: { countOnly?: boolean; compact?: boolean; tab: Tab; refreshing: boolean; submitting: boolean; nextRefreshAt: MutableRefObject<number>; nextVerifiedRefreshAt: MutableRefObject<number>; nextTaskRefreshAt: MutableRefObject<number>; nextAssignedLeadsRefreshAt: MutableRefObject<number> }) {
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
  if (countOnly) return <View accessibilityLabel={`Auto refresh countdown: ${label}`} style={[styles.countdownBadge, { minWidth: 34, height: 30 }]}>{refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.countdownText}>{seconds === null ? '-' : label}</Text>}</View>;
  return <View style={[styles.autoRefreshBadge, compact && { paddingLeft: 8, gap: 5 }]}><View style={styles.autoRefreshDot} /><Text style={[styles.autoRefreshLabel, compact && { fontSize: 11 }]}>{refreshing ? 'Syncing' : submitting ? 'Paused' : tab === 'assign' ? 'Ready' : 'Auto-refresh'}</Text><View style={styles.countdownBadge}>{refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.countdownText}>{label}</Text>}</View></View>;
}

export function Pagination({ page, total, onPageChange, pageSize = PAGE_SIZE, compact = false }: { page: number; total: number; onPageChange: (page: number) => void; pageSize?: number; compact?: boolean }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize + 1;
  const end = Math.min(total, (safePage + 1) * pageSize);
  return <View style={[styles.pagination, compact && { paddingHorizontal: 8, paddingVertical: 2, gap: 2 }]}>{!compact ? <Text style={styles.paginationText}>Showing {start}–{end} of {total}</Text> : null}<View style={[styles.paginationControls, compact && { flex: 1, justifyContent: 'space-between' }]}><Pressable disabled={safePage === 0} onPress={() => onPageChange(safePage - 1)} style={[styles.paginationButton, compact && { minHeight: 32, paddingVertical: 3, minWidth: 60 }, safePage === 0 && styles.disabled]}><Text style={styles.paginationButtonText}>Previous</Text></Pressable><Text style={styles.paginationText}>{compact ? `${start}-${end} / ${total}` : `Page ${safePage + 1} of ${totalPages}`}</Text><Pressable disabled={safePage === totalPages - 1} onPress={() => onPageChange(safePage + 1)} style={[styles.paginationButton, compact && { minHeight: 32, paddingVertical: 3, minWidth: 60 }, safePage === totalPages - 1 && styles.disabled]}><Text style={styles.paginationButtonText}>Next</Text></Pressable></View></View>;
}

export function Metric({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'blue' | 'orange' }) {
  const toneStyle = tone === 'orange' ? styles.metricOrange : styles.metricBlue;
  const accentStyle = tone === 'orange' ? styles.metricAccentOrange : styles.metricAccentBlue;
  const color = tone === 'orange' ? '#D97706' : '#3156C8';
  return <View style={[styles.metric, accentStyle]}><View style={[styles.metricIcon, toneStyle]}><Icon source={icon} size={15} color={color} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>;
}

export function TaskToolbar({ search, onSearch, status, onStatus }: { search: string; onSearch: (value: string) => void; status: 'ALL' | 'TODAY' | 'PENDING'; onStatus: (value: 'ALL' | 'TODAY' | 'PENDING') => void }) {
  const compact = useWindowDimensions().width < 760;
  if (compact) return <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
    <TextInput value={search} onChangeText={onSearch} placeholder="Search name or number" placeholderTextColor="#94A3B8" accessibilityLabel="Search sales person tasks" style={[styles.filterInput, { flex: 1, minWidth: 0, width: undefined, height: 40, fontSize: 12 }]} />
    <View style={{ width: 110, flexShrink: 0 }}><VerificationDropdown label="Filter tasks" value={status} onChange={(value) => { if (value === 'ALL' || value === 'TODAY' || value === 'PENDING') onStatus(value); }} options={[{ label: 'All tasks', value: 'ALL' }, { label: 'Today', value: 'TODAY' }, { label: 'Pending', value: 'PENDING' }]} /></View>
  </View>;
  return <View style={[styles.taskToolbar, styles.taskToolbarHeader, compact && { width: '100%', alignItems: 'stretch', flexDirection: 'column', gap: 8 }]}><TextInput value={search} onChangeText={onSearch} placeholder="Search lead name or number" placeholderTextColor="#94A3B8" style={[styles.filterInput, compact && { width: '100%', minHeight: 40, fontSize: 13 }]} /><View style={[styles.chips, compact && { width: '100%' }]}>{(['ALL', 'TODAY', 'PENDING'] as const).map((value) => <Pressable key={value} onPress={() => onStatus(value)} style={[styles.chip, compact && { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' }, status === value && styles.chipActive]}><Text style={[styles.chipText, status === value && styles.chipTextActive]}>{value === 'ALL' ? 'ALL TASKS' : `${value} TASKS`}</Text></Pressable>)}</View></View>;
}

export function State({ message, loading = false, progress = 0, percentageStep = 1, onProgressComplete }: { message: string; loading?: boolean; progress?: number; percentageStep?: number; onProgressComplete?: () => void }) {
  return <View style={styles.state}>
    {loading ? <><LoadingProgressBar progress={progress} percentageStep={percentageStep} onComplete={onProgressComplete} /></> : <Icon source="clipboard-text-outline" size={34} color="#94A3B8" />}
    {message ? <Text style={styles.stateText}>{message}</Text> : null}
  </View>;
}

export function LoadingProgressBar({ progress, onComplete }: { progress: number; percentageStep?: number; onComplete?: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const [displayedProgress, setDisplayedProgress] = useState(10);
  onCompleteRef.current = onComplete;
  const ready = Number.isFinite(progress) && progress >= 100;
  useEffect(() => {
    if (displayedProgress === 100) {
      const completeTimer = setTimeout(() => onCompleteRef.current?.(), 220);
      return () => clearTimeout(completeTimer);
    }
    // Presentation steps are intentional, not an estimate of downloaded bytes.
    // Never show completion before the caller confirms data is ready.
    if (displayedProgress >= 90 && !ready) return;
    const timer = setTimeout(() => setDisplayedProgress(value => Math.min(ready ? 100 : 90, value + 10)), 700);
    return () => clearTimeout(timer);
  }, [displayedProgress, ready]);
  return <View accessibilityRole="progressbar" accessibilityLabel="Preparing coordinator data" accessibilityValue={{ min: 0, max: 100, now: displayedProgress }} style={styles.loaderStage}>
    <View style={styles.loaderOrbitFrame}>
      <LoaderOrbit />
      <View style={styles.loaderCore}><Text style={styles.loaderPercent}>{displayedProgress}<Text style={styles.loaderPercentSign}>%</Text></Text><View style={[styles.loaderCoreLine, displayedProgress === 100 && { backgroundColor: '#14B8A6' }]} /></View>
    </View>
    <View style={styles.loaderSteps}>{Array.from({ length: 10 }, (_, index) => <View key={index} style={[styles.loaderStep, displayedProgress >= (index + 1) * 10 && styles.loaderStepActive, displayedProgress === 100 && styles.loaderStepComplete]} />)}</View>
  </View>;
}

function LoaderOrbit() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: false }), { resetBeforeIteration: true });
    animation.start();
    return () => animation.stop();
  }, [rotation]);
  const clockwise = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counterclockwise = rotation.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  return <View accessible={false} style={styles.loaderOrbitFrame}>
    <View style={styles.loaderHalo} />
    <Animated.View style={[styles.loaderOuterRing, { transform: [{ rotate: clockwise }] }]}><View style={styles.loaderOrbitDot} /></Animated.View>
    <Animated.View style={[styles.loaderInnerRing, { transform: [{ rotate: counterclockwise }] }]} />
  </View>;
}
