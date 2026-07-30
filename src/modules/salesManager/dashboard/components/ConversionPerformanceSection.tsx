import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { DailyConversionPerformance } from '../types/dashboard';

type Props = {
  data: readonly DailyConversionPerformance[];
};

export const ConversionPerformanceSection = memo(function ConversionPerformanceSection({ data }: Props) {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;

  const totals = useMemo(
    () =>
      data.reduce(
        (result, day) => ({
          meetings: result.meetings + day.meetings,
          clients: result.clients + day.clients,
        }),
        { meetings: 0, clients: 0 },
      ),
    [data],
  );
  const conversionRate = totals.meetings > 0 ? Math.round((totals.clients / totals.meetings) * 100) : 0;
  const maxValue = Math.max(1, ...data.flatMap((day) => [day.meetings, day.clients]));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Conversion Performance</Text>

      <View style={[styles.cards, isCompact && styles.compactCards]}>
        <View style={[styles.summaryCard, isCompact && styles.compactSummaryCard]}>
          <View style={styles.decorativeBlueCircle} />
          <View style={styles.cardHeader}>
            <View style={styles.blueIcon}>
              <Icon source="chart-donut" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.cardTitle}>7-Day Conversion</Text>
              <Text style={styles.cardSubtitle}>Meetings converted to clients</Text>
            </View>
          </View>

          <View style={styles.summaryBody}>
            <View style={styles.percentageBlock}>
              <Text style={styles.percentage}>{conversionRate}%</Text>
              <Text style={styles.percentageLabel}>Conversion rate</Text>
            </View>
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <Text style={styles.meetingValue}>{totals.meetings}</Text>
                <Text style={styles.metricLabel}>Meetings</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.summaryMetric}>
                <Text style={styles.clientValue}>{totals.clients}</Text>
                <Text style={styles.metricLabel}>Clients</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${conversionRate}%` }]} />
          </View>
        </View>

        <View style={[styles.chartCard, isCompact && styles.compactChartCard]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.cardTitle}>Last 7 Days</Text>
              <Text style={styles.cardSubtitle}>Daily meetings and client conversions</Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.meetingDot]} />
                <Text style={styles.legendText}>M · Meetings</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.clientDot]} />
                <Text style={styles.legendText}>C · Clients</Text>
              </View>
            </View>
          </View>

          <View style={styles.chart}>
            <View style={[styles.gridLine, { bottom: '33%' }]} />
            <View style={[styles.gridLine, { bottom: '66%' }]} />
            {data.map((day) => (
              <View key={day.id} style={styles.dayGroup}>
                <View style={styles.columns}>
                  <View style={styles.barSlot}>
                    <Text style={styles.meetingBarValue}>M{day.meetings}</Text>
                    <View style={[styles.bar, styles.meetingBar, { height: `${(day.meetings / maxValue) * 78}%` }]} />
                  </View>
                  <View style={styles.barSlot}>
                    <Text style={styles.clientBarValue}>C{day.clients}</Text>
                    <View style={[styles.bar, styles.clientBar, { height: `${(day.clients / maxValue) * 78}%` }]} />
                  </View>
                </View>
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { width: '100%', gap: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  cards: { minHeight: 144, flexDirection: 'row', gap: theme.spacing.md },
  compactCards: { minHeight: 0, flexDirection: 'column' },
  summaryCard: {
    position: 'relative',
    overflow: 'hidden',
    width: '31%',
    minWidth: 250,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: theme.radius.lg,
    backgroundColor: '#F7FAFF',
    ...theme.shadow.card,
  },
  compactSummaryCard: { width: '100%', minWidth: 0, minHeight: 112 },
  decorativeBlueCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    right: -34,
    top: -52,
    backgroundColor: '#E8F0FF',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  blueIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FF',
  },
  cardTitle: { color: theme.colors.text, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  cardSubtitle: { color: theme.colors.muted, fontSize: 9, lineHeight: 12, fontWeight: '600' },
  summaryBody: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  percentageBlock: { gap: 1 },
  percentage: { color: '#2563EB', fontSize: 28, lineHeight: 32, fontWeight: '900' },
  percentageLabel: { color: theme.colors.muted, fontSize: 9, fontWeight: '700' },
  summaryMetrics: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  summaryMetric: { alignItems: 'center' },
  meetingValue: { color: '#2563EB', fontSize: 18, fontWeight: '900' },
  clientValue: { color: '#16A34A', fontSize: 18, fontWeight: '900' },
  metricLabel: { color: theme.colors.muted, fontSize: 8, fontWeight: '700' },
  metricDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: '#DBEAFE' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#2563EB' },
  chartCard: {
    minWidth: 0,
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: theme.radius.lg,
    backgroundColor: '#FBFEFC',
    ...theme.shadow.card,
  },
  compactChartCard: { minHeight: 140 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  meetingDot: { backgroundColor: '#2563EB' },
  clientDot: { backgroundColor: '#16A34A' },
  legendText: { color: theme.colors.muted, fontSize: 8, fontWeight: '800' },
  chart: {
    position: 'relative',
    minHeight: 82,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    paddingTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#E8EEF5' },
  dayGroup: { minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  columns: { minHeight: 58, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  barSlot: { height: '100%', minWidth: 10, flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '72%', maxWidth: 18, minHeight: 3, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  meetingBar: { backgroundColor: '#2563EB' },
  clientBar: { backgroundColor: '#16A34A' },
  meetingBarValue: { color: '#2563EB', fontSize: 7, lineHeight: 10, fontWeight: '900' },
  clientBarValue: { color: '#16A34A', fontSize: 7, lineHeight: 10, fontWeight: '900' },
  dayLabel: { color: theme.colors.muted, fontSize: 8, lineHeight: 13, fontWeight: '700' },
});
