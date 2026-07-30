import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type TeamCardData = {
  teamName: string;
  leader: string;
  leaderRole?: string;
  totalPoints: number;
  managers: Array<{ name: string; points: number }>;
  completion: number;
  accent: string;
};

export function TeamCard({ teamName, leader, leaderRole = 'Leader', totalPoints, managers, completion, accent }: TeamCardData) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.teamName, { color: accent }]}>{teamName}</Text>
        <View style={styles.leaderRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{leader.slice(0, 1)}</Text>
          </View>
          <View style={styles.leaderCopy}>
            <Text style={styles.label}>{leaderRole}</Text>
            <Text style={styles.leader}>{leader}</Text>
          </View>
        </View>
      </View>

      <View style={styles.pointsBlock}>
        <Text style={styles.pointsLabel}>Total Points</Text>
        <Text style={[styles.pointsValue, { color: accent }]}>{totalPoints}/100</Text>
      </View>

      <View style={styles.managersBlock}>
        <View style={styles.managerHeader}>
          <Text style={styles.pointsLabel}>Sales Managers</Text>
          <Text style={styles.pointsLabel}>{managers.length}</Text>
        </View>
        <View style={styles.managerList}>
          {managers.map((manager) => (
            <View key={manager.name} style={styles.managerRow}>
              <Text style={styles.managerName}>{manager.name}</Text>
              <View style={styles.managerTrack}>
                <View style={[styles.managerFill, { width: `${manager.points}%`, backgroundColor: accent }]} />
              </View>
              <Text style={styles.managerPoints}>{manager.points}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.progressChip}>
        <Text style={[styles.progressValue, { color: accent }]}>{completion}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 292,
    minWidth: 292,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 16,
    ...theme.shadow.card,
  },
  header: {
    gap: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  leaderCopy: {
    gap: 2,
  },
  label: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
  },
  leader: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  pointsBlock: {
    gap: 4,
  },
  pointsLabel: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  managersBlock: {
    gap: 10,
  },
  managerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  managerList: {
    gap: 10,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  managerName: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  managerTrack: {
    width: 96,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  managerFill: {
    height: '100%',
    borderRadius: 999,
  },
  managerPoints: {
    width: 24,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
  },
  progressChip: {
    alignSelf: 'flex-end',
    minWidth: 56,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '900',
  },
});
