import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { theme } from '../../theme/theme';
import type { DashboardLeaderboardEntry } from '../../screens/dashboard/dashboardTypes';

type Props = {
  title: string;
  metricLabel: string;
  items: DashboardLeaderboardEntry[];
  backgroundColor?: string;
  accentColor?: string;
  iconSource?: ImageSourcePropType;
  fullWidth?: boolean;
};

export function AnalyticsCard({ title, metricLabel, items, backgroundColor, accentColor, iconSource, fullWidth = false }: Props) {
  return (
    <View style={[styles.card, fullWidth && styles.cardFullWidth, backgroundColor ? { backgroundColor } : null]}>
      <View style={[styles.accentBar, accentColor ? { backgroundColor: accentColor } : null]} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.headerLine}>
            <View style={styles.headerIcon}>
              {iconSource ? <Image source={iconSource} style={styles.headerIconImage} resizeMode="contain" /> : <Text style={styles.headerIconText}>↑</Text>}
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.metric}>{metricLabel}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={`${title}-${item.rank}`} style={styles.row}>
            <View
              style={[
                styles.rankBadge,
                item.rank === 1 && styles.rankGold,
                item.rank === 2 && styles.rankSilver,
                item.rank === 3 && styles.rankBronze,
              ]}
            >
              <Text style={styles.rankText}>{item.rank}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <Text style={styles.score}>{formatScore(item.score)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatScore(score: number) {
  return new Intl.NumberFormat('en-US').format(score);
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: 20,
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardFullWidth: {
    flex: 0,
    flexBasis: 'auto',
    width: '100%',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
  },
  header: {
    gap: 3,
    paddingTop: 1,
  },
  headerText: {
    gap: 4,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  headerIconText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  headerIconImage: {
    width: 22,
    height: 22,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  metric: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.10)',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  rankGold: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  rankSilver: {
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  rankBronze: {
    backgroundColor: 'rgba(251, 146, 60, 0.14)',
  },
  meta: {
    flex: 1,
    gap: 0,
  },
  name: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  score: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
});
