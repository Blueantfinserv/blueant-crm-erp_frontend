import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { theme } from '../../theme/theme';

type StateTone = 'leaderboard' | 'table' | 'team' | 'dashboard';

type EmptyStateProps = {
  title: string;
  description: string;
};

type ErrorStateProps = {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry: () => void;
};

type SkeletonProps = {
  tone: StateTone;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorDescription}>{description}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export function DashboardSkeleton({ tone }: SkeletonProps) {
  return (
    <View style={styles.skeletonShell}>
      {tone === 'dashboard' ? (
        <>
          <View style={styles.skeletonHero} />
          <View style={styles.skeletonRow}>
            <SkeletonBlock width="24%" height={220} />
            <SkeletonBlock width="24%" height={220} />
            <SkeletonBlock width="24%" height={220} />
            <SkeletonBlock width="24%" height={220} />
          </View>
          <SkeletonBlock width="100%" height={540} />
        </>
      ) : null}
    </View>
  );
}

export function LeaderboardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <SkeletonBlock width="42%" height={22} />
      <SkeletonBlock width="38%" height={12} />
      <SkeletonList rows={3} />
    </View>
  );
}

export function PerformanceTableSkeleton() {
  return (
    <View style={styles.tableSkeleton}>
      <SkeletonBlock width="38%" height={24} />
      <SkeletonRow widths={[80, 120, 110, 110, 110, 110, 82, 82, 82, 82, 82, 82, 82, 72]} />
      <SkeletonList rows={5} fullWidth />
    </View>
  );
}

export function TeamPerformanceSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <SkeletonBlock width="36%" height={22} />
      <SkeletonList rows={3} />
    </View>
  );
}

function SkeletonList({ rows, fullWidth = false }: { rows: number; fullWidth?: boolean }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={index} widths={fullWidth ? [40, 120, 90, 90, 90, 90, 70, 70, 70, 70, 70, 70, 70, 60] : [24, 100, 84]} />
      ))}
    </View>
  );
}

function SkeletonRow({ widths }: { widths: Array<number> }) {
  return (
    <View style={styles.skeletonRowLine}>
      {widths.map((width, index) => (
        <View key={index} style={[styles.skeletonBlock, { width }]} />
      ))}
    </View>
  );
}

function SkeletonBlock({ width, height }: { width: DimensionValue; height: number }) {
  return <View style={[styles.skeletonBlock, { width, height }]} />;
}

const styles = StyleSheet.create({
  emptyCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyDescription: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  errorDescription: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  retryText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  skeletonShell: {
    gap: 12,
  },
  skeletonHero: {
    height: 160,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    opacity: 0.65,
  },
  skeletonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardSkeleton: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: 13,
    gap: 10,
    overflow: 'hidden',
  },
  tableSkeleton: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 12,
    overflow: 'hidden',
  },
  skeletonList: {
    gap: 8,
  },
  skeletonRowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  skeletonBlock: {
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
});
