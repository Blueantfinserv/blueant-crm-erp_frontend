import { useCallback, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import type { DashboardTeamMemberPerformance, DashboardTeamPerformanceGroup } from '../../screens/dashboard/dashboardTypes';
import { buildCurrentWeekFooterSummary, getCurrentWeekTableLayout } from './currentWeekPerformanceHelpers';

type Props = {
  title: string;
  period: string;
  onPeriodChange: (period: string) => void;
  groups: DashboardTeamPerformanceGroup[];
};

export function CurrentWeekPerformanceSection({ title, period, onPeriodChange, groups }: Props) {
  // Measure the actual rendered width of this card instead of the window width.
  // useWindowDimensions() only changes when the browser/screen size changes —
  // it does NOT change when a sidebar collapses/expands and the card gets
  // more or less horizontal space. onLayout tracks the real available width.
  const [containerWidth, setContainerWidth] = useState(900);
  const layout = getCurrentWeekTableLayout(containerWidth);

  const onCardLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
  }, []);

  const sortedGroups = [...groups].sort((a, b) => b.summary.avgPoints - a.summary.avgPoints);
  const footer = buildCurrentWeekFooterSummary(sortedGroups);

  return (
    <View style={styles.card} onLayout={onCardLayout}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>◎</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.tableShell}>
          <View style={styles.sharedHeaderRow}>
            <HeaderCell label="RANK" width={layout.rank} align="center" marginRight={layout.rankGap} />
            <HeaderCell label="NAME" width={layout.name} align="left" />
            <HeaderCell label="YEST. Meet." width={layout.yestMeet} />
            <HeaderCell label="YEST. CL." width={layout.yestCl} />
            <HeaderCell label="TOD. Meet." width={layout.todayMeet} />
            <HeaderCell label="TOD. CL." width={layout.todayCl} />
            <HeaderCell label="LEADS" width={layout.leads} />
            <HeaderCell label="MEETINGS" width={layout.meetings} />
            <HeaderCell label="TGT-RPT" width={layout.tgtRpt} />
            <HeaderCell label="DOC" width={layout.doc} />
            <HeaderCell label="POINTS" width={layout.points} />
            <View style={[styles.summaryHeaderCell, { width: layout.summary }]}>
              <Text style={styles.summaryColumnHeaderIcon}>⚡</Text>
              <Text style={styles.summaryColumnHeaderText}>TEAM STANDINGS</Text>
            </View>
          </View>
          {sortedGroups.map((group, index) => (
            <View key={group.teamName} style={[styles.teamRow, toneStyles[group.tone].row]}>
              <View style={styles.tableBlock}>
                {renderMembers(group.members, group.tone, layout)}
              </View>

              <View style={[styles.summaryBlock, { width: layout.summary }, toneStyles[group.tone].summary]}>
                <View style={styles.summaryTop}>
                  <View style={[styles.summaryRank, toneStyles[group.tone].summaryRank]}>
                    <Text style={styles.summaryRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.summaryTeam}>{group.teamName}</Text>
                  <Text style={styles.summaryMembers}>{group.summary.members} MEMBERS</Text>
                </View>

                <View style={styles.summaryMetrics}>
                  <SummaryMetric label="AVG POINTS" value={group.summary.avgPoints.toFixed(1)} tone={group.tone} fullWidth />
                  <View style={styles.summaryMetricPair}>
                    <SummaryMetric
                      label="AVG MEETINGS"
                      value={group.summary.avgMeetings.toFixed(1)}
                      tone={group.tone}
                      halfWidth
                    />
                    <SummaryMetric
                      label="RPT CLIENTS"
                      value={String(group.summary.rptClients)}
                      tone={group.tone}
                      halfWidth
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.footerRow}>
            <View style={[styles.footerLeftGrid, { width: layout.body }]}>
              <Cell width={layout.rank} center marginRight={layout.rankGap} />
              <Cell width={layout.name} align="left">
                <Text style={styles.footerLabel}>WEEK TOTAL</Text>
              </Cell>
              <Cell width={layout.yestMeet}>
                <Text style={styles.footerValue}>{footer.yesterdayMeetings}</Text>
              </Cell>
              <Cell width={layout.yestCl}>
                <Text style={styles.footerValue}>{footer.yesterdayClients}</Text>
              </Cell>
              <Cell width={layout.todayMeet}>
                <Text style={styles.footerValue}>{footer.todayMeetings}</Text>
              </Cell>
              <Cell width={layout.todayCl}>
                <Text style={styles.footerValue}>{footer.todayClients}</Text>
              </Cell>
              <MetricGroupCell metric={footer.leads} width={layout.leads} accentTone="peach" hidePending />
              <MetricGroupCell metric={footer.meetings} width={layout.meetings} accentTone="peach" />
              <MetricGroupCell metric={footer.clients} width={layout.tgtRpt} accentTone="peach" />
              <Cell width={layout.doc}>
                <Text style={styles.footerValue}>{footer.documentsReceived}</Text>
              </Cell>
              <Cell width={layout.points}>
                <Text style={styles.footerValue}>{footer.points}</Text>
              </Cell>
            </View>
            <View style={[styles.footerSummarySpacer, { width: layout.summary }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function renderMembers(
  members: DashboardTeamMemberPerformance[],
  tone: keyof typeof toneStyles,
  layout: ReturnType<typeof getCurrentWeekTableLayout>,
) {
  const sortedMembers = [...members].sort((a, b) => {
    if (a.vacant && b.vacant) return 0;
    if (a.vacant) return 1;
    if (b.vacant) return -1;
    return b.points - a.points;
  });
  const filled = [...sortedMembers];
  while (filled.length < 5) {
    filled.push({
      rank: filled.length + 1,
      name: '',
      yesterdayMeetings: 0,
      yesterdayClients: 0,
      todayMeetings: 0,
      todayClients: 0,
      leads: { achieved: 0, target: 0, pendingPercent: 0 },
      meetings: { achieved: 0, target: 0, pendingPercent: 0 },
      clients: { achieved: 0, target: 0, pendingPercent: 0 },
      documentsReceived: 0,
      points: 0,
      vacant: true,
    });
  }

  return (
    <View style={styles.rowsWrap}>
      {filled.map((member, index) =>
        member.vacant ? (
          <View key={`${tone}-vacant-${index}`} style={styles.vacancyRow}>
            <Text style={styles.vacancyText}>----- POSITION VACANT -----</Text>
          </View>
        ) : (
          <View key={`${tone}-${member.name}-${member.rank}`} style={[styles.row, index === filled.length - 1 && styles.rowLast]}>
            <Cell width={layout.rank} center marginRight={layout.rankGap}>
              <RankBadge rank={member.rank} tone={tone} />
            </Cell>
            <Cell width={layout.name} align="left">
              <Text style={[styles.name, toneStyles[tone].name]} numberOfLines={1}>
                {member.name}
              </Text>
            </Cell>
            <Cell width={layout.yestMeet}>
              <MetricValue value={member.yesterdayMeetings} tone={tone} />
            </Cell>
            <Cell width={layout.yestCl}>
              <MetricValue value={member.yesterdayClients} tone={tone} />
            </Cell>
            <Cell width={layout.todayMeet}>
              <MetricValue value={member.todayMeetings} tone={tone} />
            </Cell>
            <Cell width={layout.todayCl}>
              <MetricValue value={member.todayClients} tone={tone} />
            </Cell>
            <MetricGroupCell metric={member.leads} width={layout.leads} accentTone={tone} hidePending />
            <MetricGroupCell metric={member.meetings} width={layout.meetings} accentTone={tone} />
            <MetricGroupCell metric={member.clients} width={layout.tgtRpt} accentTone={tone} />
            <Cell width={layout.doc}>
              <MetricValue value={member.documentsReceived} tone={tone} />
            </Cell>
            <Cell width={layout.points}>
              <PointsBadge value={member.points} tone={tone} />
            </Cell>
          </View>
        ),
      )}
    </View>
  );
}

function HeaderCell({ label, width, align = 'center', marginRight = 0 }: { label: string; width: number; align?: 'left' | 'center'; marginRight?: number }) {
  return (
    <View style={[styles.headerCell, { width, marginRight, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
      <Text style={styles.headerText}>{label}</Text>
    </View>
  );
}

function Cell({
  width,
  children,
  align = 'center',
  center,
  marginRight = 0,
}: {
  width: number;
  children?: React.ReactNode;
  align?: 'left' | 'center';
  center?: boolean;
  marginRight?: number;
}) {
  return <View style={[styles.cell, { width, marginRight, alignItems: center || align === 'center' ? 'center' : 'flex-start' }]}>{children}</View>;
}

function RankBadge({ rank, tone }: { rank: number; tone: keyof typeof toneStyles }) {
  return (
    <View style={[styles.rankBadge, toneStyles[tone].rank]}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

function MetricValue({ value, tone }: { value: number; tone: keyof typeof toneStyles }) {
  return <Text style={[styles.metricValue, toneStyles[tone].metric]}>{value}</Text>;
}

function PointsBadge({ value, tone }: { value: number; tone: keyof typeof toneStyles }) {
  return <Text style={[styles.pointsText, toneStyles[tone].metric]}>{value}</Text>;
}

function MetricGroupCell({
  metric,
  width,
  accentTone,
  hidePending = false,
}: {
  metric: { achieved: number; target: number; pendingPercent: number };
  width: number;
  accentTone: keyof typeof toneStyles;
  hidePending?: boolean;
}) {
  return (
    <View style={[styles.metricGroupCell, { width }]}>
      <Text style={[styles.metricGroupValue, toneStyles[accentTone].metric]}>{metric.achieved}</Text>
      <Text style={styles.metricGroupDivider}>|</Text>
      <Text style={styles.metricGroupTarget}>{metric.target}</Text>
      {hidePending ? null : (
        <>
          <Text style={styles.metricGroupDivider}>|</Text>
          <Text style={styles.metricGroupPending}>{metric.pendingPercent}%</Text>
        </>
      )}
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
  fullWidth = false,
  halfWidth = false,
}: {
  label: string;
  value: string;
  tone: keyof typeof toneStyles;
  fullWidth?: boolean;
  halfWidth?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryMetric,
        fullWidth && styles.summaryMetricFull,
        halfWidth && styles.summaryMetricHalf,
        toneStyles[tone].summaryMetric,
      ]}
    >
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={[styles.summaryMetricValue, toneStyles[tone].metric]}>{value}</Text>
    </View>
  );
}

const toneStyles = {
  peach: {
    row: { backgroundColor: 'rgba(255, 240, 232, 0.92)' },
    header: { backgroundColor: 'rgba(255, 225, 214, 0.92)' },
    summary: { backgroundColor: 'rgba(255, 244, 238, 0.96)' },
    summaryMetric: { backgroundColor: 'rgba(255, 238, 230, 0.9)' },
    rank: { backgroundColor: 'rgba(255, 216, 158, 0.92)' },
    metric: { color: '#D43A58' },
    points: { backgroundColor: 'rgba(255, 227, 209, 1)', borderColor: 'rgba(210, 88, 46, 0.45)' },
    name: { color: '#7E3E18' },
    summaryRank: { backgroundColor: 'rgba(255, 210, 134, 0.95)' },
  },
  blue: {
    row: { backgroundColor: 'rgba(231, 239, 255, 0.96)' },
    header: { backgroundColor: 'rgba(218, 231, 255, 0.96)' },
    summary: { backgroundColor: 'rgba(234, 241, 255, 0.98)' },
    summaryMetric: { backgroundColor: 'rgba(226, 236, 255, 0.95)' },
    rank: { backgroundColor: 'rgba(212, 225, 255, 0.96)' },
    metric: { color: '#2459D5' },
    points: { backgroundColor: 'rgba(208, 226, 255, 1)', borderColor: 'rgba(54, 102, 223, 0.45)' },
    name: { color: '#234FBE' },
    summaryRank: { backgroundColor: 'rgba(204, 220, 255, 0.98)' },
  },
  green: {
    row: { backgroundColor: 'rgba(231, 250, 241, 0.96)' },
    header: { backgroundColor: 'rgba(214, 244, 231, 0.96)' },
    summary: { backgroundColor: 'rgba(231, 247, 239, 0.98)' },
    summaryMetric: { backgroundColor: 'rgba(222, 241, 230, 0.95)' },
    rank: { backgroundColor: 'rgba(212, 244, 229, 0.96)' },
    metric: { color: '#0C8F69' },
    points: { backgroundColor: 'rgba(205, 241, 229, 1)', borderColor: 'rgba(34, 140, 106, 0.45)' },
    name: { color: '#0B7B5E' },
    summaryRank: { backgroundColor: 'rgba(201, 240, 224, 0.98)' },
  },
} as const;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filter: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
  },
  filterActive: {
    color: theme.colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  scrollView: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingBottom: 4,
    minWidth: '100%',
  },
  tableShell: {
    gap: 0,
    minWidth: 0,
  },
  summaryHeaderCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingLeft: 40,
  },
  summaryColumnHeaderIcon: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryColumnHeaderText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    flexShrink: 0,
  },
  sharedHeaderRow: {
    flexDirection: 'row',
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(212, 160, 254, 0.24)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(29, 108, 218, 0.14)',
  },
  tableBlock: {
    flexShrink: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
  },
  headerCell: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headerText: {
    color: '#2459D5',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 11,
    textAlign: 'center',
  },
  rowsWrap: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricGroupCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 1,
    flexWrap: 'nowrap',
  },
  metricGroupValue: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metricGroupDivider: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metricGroupTarget: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metricGroupPending: {
    color: '#D98200',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pointsBadge: {
    minWidth: 0,
    minHeight: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 13,
  },
  vacancyRow: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4E3E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.16)',
  },
  vacancyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryBlock: {
    paddingVertical: 0,
    paddingHorizontal: 1,
    flexShrink: 0,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.16)',
  },
  summaryTop: {
    alignItems: 'center',
    gap: 3,
    paddingBottom: 4,
  },
  summaryRank: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRankText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  summaryTeam: {
    color: '#6C2E12',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  summaryMembers: {
    color: theme.colors.subtle,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summaryMetric: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 0,
  },
  summaryMetrics: {
    flex: 1,
    justifyContent: 'space-evenly',
    gap: 6,
  },
  summaryMetricPair: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  summaryMetricLabel: {
    color: '#2459D5',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryMetricValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  summaryMetricFull: {
    minHeight: 0,
  },
  summaryMetricHalf: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(212, 160, 254, 0.24)',
    overflow: 'hidden',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  footerCell: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  footerLabel: {
    color: '#D98200',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  footerValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  footerLeftGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  footerSummarySpacer: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.16)',
  },
});
