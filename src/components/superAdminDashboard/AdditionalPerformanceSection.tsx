import { useMemo, useState } from 'react';
import { buildAdditionalFooterSummary, CARD_HORIZONTAL_PADDING, columnSpecs, DEFAULT_SUMMARY_BOX_WIDTH, getMemberTotal, getMeetingBreakup, MOCK_MEETING_BREAKUPS, tableWidth, type MeetingBreakupEntry, type MeetingBreakupMap } from './additionalPerformanceHelpers';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import type { DashboardSecondaryPerformanceGroup, DashboardSecondaryPerformanceMember } from '../../screens/dashboard/dashboardTypes';

type Props = {
  title: string;
  groups: DashboardSecondaryPerformanceGroup[];
  // Optional: pass real backend data here later. Until the API exists,
  // this defaults to MOCK_MEETING_BREAKUPS below — no UI code needs to
  // change when the backend is ready, just start passing this prop.
  meetingBreakups?: MeetingBreakupMap;
};

type ColumnSpec = {
  width: number;
  align?: 'left' | 'center';
  marginRight?: number;
};

const rowTones = ['peach', 'blue', 'green', 'pink'] as const;

// ---------------------------------------------------------------------------
// MOCK DATA ? "Meeting Breakup" box contents.
// Backend contract (once ready): a map of memberName -> up to 5 entries of
// { name, meetings }, showing who that member met and how many times.
// Replace MOCK_MEETING_BREAKUPS with a real fetch/query result (or pass the
// `meetingBreakups` prop from a parent that fetches it) ? everything below
// this block (lookup + rendering) stays exactly the same.
// ---------------------------------------------------------------------------
export function AdditionalPerformanceSection({ title, groups, meetingBreakups = MOCK_MEETING_BREAKUPS }: Props) {
  const sortedGroups = [...groups];
  const footer = buildAdditionalFooterSummary(sortedGroups);

  // Measure how much horizontal space this card actually has. When the
  // left sidebar is collapsed (more room) this grows; when it's expanded
  // (less room) this shrinks back — down to the default/original size.
  const [containerWidth, setContainerWidth] = useState(0);
  const handleCardLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const summaryBoxWidth = useMemo(() => {
    const availableForSummaryBox = containerWidth - CARD_HORIZONTAL_PADDING - tableWidth;
    return Math.max(DEFAULT_SUMMARY_BOX_WIDTH, availableForSummaryBox);
  }, [containerWidth]);

  return (
    <View style={styles.card} onLayout={handleCardLayout}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>?</Text>
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
        <View style={[styles.tableShell, { width: tableWidth + summaryBoxWidth }]}>
          <View style={styles.sharedHeaderRow}>
            <HeaderCell label="S/N" spec={columnSpecs.rank} />
            <HeaderCell label="NAME" spec={columnSpecs.name} />
            <HeaderCell label="YEST. Meet." spec={columnSpecs.yesterdayMeetings} shiftLeft />
            <HeaderCell label="YEST. CL." spec={columnSpecs.yesterdayClients} shiftLeft />
            <HeaderCell label="TOD. Meet." spec={columnSpecs.todayMeetings} shiftLeft />
            <HeaderCell label="TOD. CL." spec={columnSpecs.todayClients} shiftLeft />
            <HeaderCell label="TEAM MEET." spec={columnSpecs.teamMeetings} shiftLeft />
            <HeaderCell label="SELF MEET." spec={columnSpecs.selfMeetings} shiftLeft />
            <HeaderCell label="CLIENTS" spec={columnSpecs.clients} customStyle={styles.clientsShiftLeft30} />
            <HeaderCell label="SACHIN SIR" spec={columnSpecs.sachinSir} customStyle={styles.sachinShiftLeft45} />
            <HeaderCell label="POINTS" spec={columnSpecs.points} customStyle={styles.pointsShiftLeft30} />
            <View style={[styles.summaryHeaderCell, styles.summaryShiftLeft20, { width: summaryBoxWidth }]}>
              <Text style={styles.summaryHeaderText}>Meeting Breakup</Text>
            </View>
            <HeaderCell label="TOTAL" spec={columnSpecs.total} customStyle={styles.totalShiftLeft40} />
          </View>

          {sortedGroups.map((group) => (
            <View key={group.footerLabel} style={[styles.groupRow, { width: tableWidth + summaryBoxWidth }]}>
              <View style={styles.tableBlock}>
                {group.members.map((member, index) => {
                  const tone = rowTones[index % rowTones.length];
                  const breakup = getMeetingBreakup(member.meetingBreakupKey ?? member.name, meetingBreakups);

                  return (
                    <View key={`${group.footerLabel}-${member.name}-${member.rank}`} style={[styles.row, toneRowStyles[tone], index === group.members.length - 1 && styles.rowLast]}>
                      <Cell spec={columnSpecs.rank} center>
                        <RankBadge rank={member.rank} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.name} align="left">
                        <Text style={[styles.name, toneTextStyles[tone].name]} numberOfLines={1}>
                          {member.name}
                        </Text>
                      </Cell>
                      <Cell spec={columnSpecs.yesterdayMeetings} shiftLeft>
                        <MetricValue value={member.yesterdayMeetings} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.yesterdayClients} shiftLeft>
                        <MetricValue value={member.yesterdayClients} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.todayMeetings} shiftLeft>
                        <MetricValue value={member.todayMeetings} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.todayClients} shiftLeft>
                        <MetricValue value={member.todayClients} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.teamMeetings} shiftLeft>
                        <MetricValue value={member.teamMeetings} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.selfMeetings} shiftLeft>
                        <MetricValue value={member.selfMeetings} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.clients} customStyle={styles.clientsShiftLeft30}>
                        <MetricPair value={member.clients.actual} suffix={member.clients.documentsReceived} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.sachinSir} customStyle={styles.sachinShiftLeft45}>
                        <MetricValue value={member.sachinSir} tone={tone} />
                      </Cell>
                      <Cell spec={columnSpecs.points} customStyle={styles.pointsShiftLeft30}>
                        <PointsBadge value={member.points} tone={tone} />
                      </Cell>
                      <View style={[styles.summaryBoxSpacer, styles.summaryShiftLeft20, { width: summaryBoxWidth }, toneRowStyles[tone]]}>
                        <View style={styles.summaryMiniGrid}>
                          <View style={styles.summaryMiniRow}>
                            <View style={[styles.summaryMiniBox, styles.summaryMiniBoxHalf, toneMiniBoxStyles[tone]]}>
                              <MeetingBreakupBoxContent entry={breakup?.[0]} tone={tone} />
                            </View>
                            <View style={[styles.summaryMiniBox, styles.summaryMiniBoxHalf, toneMiniBoxStyles[tone]]}>
                              <MeetingBreakupBoxContent entry={breakup?.[1]} tone={tone} />
                            </View>
                          </View>
                          <View style={styles.summaryMiniRow}>
                            <View style={[styles.summaryMiniBox, styles.summaryMiniBoxHalf, toneMiniBoxStyles[tone]]}>
                              <MeetingBreakupBoxContent entry={breakup?.[2]} tone={tone} />
                            </View>
                            <View style={[styles.summaryMiniBox, styles.summaryMiniBoxHalf, toneMiniBoxStyles[tone]]}>
                              <MeetingBreakupBoxContent entry={breakup?.[3]} tone={tone} />
                            </View>
                          </View>
                          <View style={styles.summaryMiniRow}>
                            <View style={[styles.summaryMiniBox, styles.summaryMiniBoxFull, toneMiniBoxStyles[tone]]}>
                              <MeetingBreakupBoxContent entry={breakup?.[4]} tone={tone} />
                            </View>
                          </View>
                        </View>
                      </View>
                      <Cell spec={columnSpecs.total} center customStyle={styles.totalShiftLeft40}>
                        <Text style={[styles.pointsText, toneTextStyles[tone].metric]}>{getMemberTotal(member)}</Text>
                      </Cell>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={[styles.footerRow, { width: tableWidth + summaryBoxWidth }]}>
            <View style={[styles.footerCell, columnStyle(columnSpecs.rank)]} />
            <View style={[styles.footerCell, columnStyle(columnSpecs.name)]}>
              <Text style={styles.footerLabel}>{footer.label}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.yesterdayMeetings), styles.shiftLeft10]}>
              <Text style={[styles.footerValue, styles.footerValueShiftRight]}>{footer.yesterdayMeetings}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.yesterdayClients), styles.shiftLeft10]}>
              <Text style={[styles.footerValue, styles.footerValueShiftRight20]}>{footer.yesterdayClients}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.todayMeetings), styles.shiftLeft10]}>
              <Text style={[styles.footerValue, styles.footerValueShiftRight20]}>{footer.todayMeetings}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.todayClients), styles.shiftLeft10]}>
              <Text style={[styles.footerValue, styles.footerValueShiftRight20]}>{footer.todayClients}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.teamMeetings), styles.shiftLeft10]}>
              <Text style={[styles.footerValue, styles.footerValueShiftRight30]}>{footer.teamMeetings}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.selfMeetings), styles.shiftLeft10]}>
              <Text style={[styles.footerValue, styles.footerValueShiftRight30]}>{footer.selfMeetings}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.clients), styles.shiftLeft30]}>
              <View style={styles.footerPair}>
                <Text style={styles.footerValue}>{footer.clients.actual}</Text>
                <Text style={styles.footerDivider}>|</Text>
                <Text style={styles.footerSubValue}>{footer.clients.documentsReceived}</Text>
              </View>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.sachinSir), styles.sachinShiftLeft45]}>
              <Text style={[styles.footerValue, styles.footerValueShiftLeftSachin]}>{footer.sachinSir}</Text>
            </View>
            <View style={[styles.footerCell, columnStyle(columnSpecs.points), styles.pointsShiftLeft30]}>
              <Text style={[styles.footerValue, styles.footerValueShiftLeftPoints]}>{footer.points}</Text>
            </View>
            <View style={[styles.footerSummaryCell, styles.summaryShiftLeft20, { width: summaryBoxWidth }]} />
            <View style={[styles.footerCell, columnStyle(columnSpecs.total), styles.totalFooterShiftLeft]}>
              <Text style={styles.footerValue}>{footer.total}</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

function HeaderCell({
  label,
  spec,
  shiftLeft = false,
  farther = false,
  customStyle,
}: {
  label: string;
  spec: ColumnSpec;
  shiftLeft?: boolean;
  farther?: boolean;
  customStyle?: object;
}) {
  return (
    <View
      style={[
        styles.headerCell,
        columnStyle(spec),
        shiftLeft && styles.shiftLeft10,
        farther && styles.shiftLeft15,
        customStyle,
        { alignItems: spec.align === 'left' ? 'flex-start' : 'center' },
      ]}
    >
      <Text style={styles.headerText}>{label}</Text>
    </View>
  );
}

function Cell({
  spec,
  children,
  align = 'center',
  center,
  shiftLeft = false,
  farther = false,
  customStyle,
  }: {
  spec: ColumnSpec;
  children: React.ReactNode;
  align?: 'left' | 'center';
  center?: boolean;
  shiftLeft?: boolean;
  farther?: boolean;
  customStyle?: object;
}) {
  return (
    <View
      style={[
        styles.cell,
        columnStyle(spec),
        shiftLeft && styles.shiftLeft10,
        farther && styles.shiftLeft15,
        customStyle,
        { alignItems: center || align === 'center' ? 'center' : 'flex-start' },
      ]}
    >
      {children}
    </View>
  );
}

function RankBadge({ rank, tone }: { rank: number; tone: keyof typeof toneTextStyles }) {
  return (
    <View style={[styles.rankBadge, toneTextStyles[tone].rank]}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

function MetricValue({ value, tone }: { value: number; tone: keyof typeof toneTextStyles }) {
  return <Text style={[styles.metricValue, toneTextStyles[tone].metric]}>{value}</Text>;
}

function MetricPair({ value, suffix, tone }: { value: number; suffix: number; tone: keyof typeof toneTextStyles }) {
  return (
    <View style={styles.metricPair}>
      <Text style={[styles.metricValue, toneTextStyles[tone].metric]}>{value}</Text>
      <Text style={styles.metricDivider}>|</Text>
      <Text style={styles.metricTarget}>{suffix}</Text>
    </View>
  );
}

function PointsBadge({ value, tone }: { value: number; tone: keyof typeof toneTextStyles }) {
  return <Text style={[styles.pointsText, toneTextStyles[tone].metric]}>{value}</Text>;
}

function MeetingBreakupBoxContent({
  entry,
  tone,
}: {
  entry: MeetingBreakupEntry | undefined;
  tone: keyof typeof toneTextStyles;
}) {
  if (!entry) return null;
  return (
    <View style={styles.summaryAlokRow}>
      <Text style={[styles.summaryAlokText, toneTextStyles[tone].metric]} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={[styles.summaryAlokEquals, toneTextStyles[tone].metric]}>=</Text>
      <Text style={[styles.summaryAlokCount, toneTextStyles[tone].metric]} numberOfLines={1}>
        {entry.meetings}
      </Text>
    </View>
  );
}

function columnStyle({ width, marginRight }: ColumnSpec) {
  return {
    width,
    marginRight,
  };
}

const toneTextStyles = {
  peach: {
    metric: { color: '#D43A58' },
    rank: { backgroundColor: 'rgba(255, 216, 158, 0.92)' },
    name: { color: '#7E3E18' },
  },
  blue: {
    metric: { color: '#2459D5' },
    rank: { backgroundColor: 'rgba(212, 225, 255, 0.96)' },
    name: { color: '#234FBE' },
  },
  green: {
    metric: { color: '#0C8F69' },
    rank: { backgroundColor: 'rgba(212, 244, 229, 0.96)' },
    name: { color: '#0B7B5E' },
  },
  pink: {
    metric: { color: '#DB2777' },
    rank: { backgroundColor: 'rgba(252, 231, 243, 0.96)' },
    name: { color: '#9D174D' },
  },
} as const;

const toneRowStyles = {
  peach: { backgroundColor: 'rgba(255, 240, 232, 0.92)' },
  blue: { backgroundColor: 'rgba(231, 239, 255, 0.96)' },
  green: { backgroundColor: 'rgba(231, 250, 241, 0.96)' },
  pink: { backgroundColor: 'rgba(252, 231, 243, 0.96)' },
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
  sharedHeaderRow: {
    flexDirection: 'row',
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(212, 160, 254, 0.24)',
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(29, 108, 218, 0.14)',
    overflow: 'hidden',
  },
  tableBlock: {
    flexShrink: 0,
  },
  headerCell: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headerText: {
    color: '#2459D5',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 11,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    minHeight: 90,
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
    lineHeight: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metricPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricDivider: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metricTarget: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 13,
  },
  summaryBoxSpacer: {
    width: DEFAULT_SUMMARY_BOX_WIDTH,
    minHeight: 90,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.14)',
    paddingLeft: 0,
    paddingRight: 4,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  summaryHeaderCell: {
    width: DEFAULT_SUMMARY_BOX_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  summaryHeaderText: {
    color: '#2459D5',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(212, 160, 254, 0.24)',
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerCell: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  footerLabel: {
    color: '#D98200',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  footerValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  footerValueShiftRight: {
    marginLeft: 30,
  },
  footerValueShiftRight20: {
    marginLeft: 30,
  },
  footerValueShiftRight30: {
    marginLeft: 30,
  },
  footerValueShiftLeftSachin: {
    marginLeft: 30,
  },
  footerValueShiftLeftPoints: {
    marginLeft: 22,
  },
  footerShiftRight10: {
    transform: [{ translateX: 10 }],
  },
  footerPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  footerDivider: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  footerSubValue: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  footerSummaryCell: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.14)',
  },
  shiftLeft10: {
    transform: [{ translateX: -15 }],
  },
  shiftLeft15: {
    transform: [{ translateX: -20 }],
  },
  shiftLeftExtra10: {
    transform: [{ translateX: -10 }],
  },
  shiftLeft30: {
    transform: [{ translateX: -30 }],
  },
  clientsShiftLeft30: {
    transform: [{ translateX: -35 }],
  },
  sachinShiftLeft30: {
    transform: [{ translateX: -30 }],
  },
  sachinShiftLeft45: {
    transform: [{ translateX: -65 }],
  },
  pointsShiftLeft30: {
    transform: [{ translateX: -70 }],
  },
  summaryShiftLeft20: {
    transform: [{ translateX: -60 }],
  },
  totalShiftLeft40: {
    transform: [{ translateX: -65 }],
  },
  totalFooterShiftLeft: {
    transform: [{ translateX: -40 }],
  },
  summaryMiniGrid: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    gap: 2,
  },
  summaryAlokStack: {
    flex: 1,
    width: '100%',
    gap: 4,
    justifyContent: 'center',
  },
  summaryMiniRow: {
    flexDirection: 'row',
    gap: 4,
  },
  summaryMiniBox: {
    borderRadius: 6,
    minHeight: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  summaryMiniBoxHalf: {
    flex: 1,
  },
  summaryMiniBoxFull: {
    flex: 1,
  },
  summaryAlokBox: {
    width: '100%',
    minHeight: 24,
  },
  summaryAlokRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
  },
  summaryAlokText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  summaryAlokEquals: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
  },
  summaryAlokCount: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
});

const toneMiniBoxStyles = {
  peach: { backgroundColor: 'rgba(255, 227, 209, 0.55)', borderColor: 'rgba(210, 88, 46, 0.16)' },
  blue: { backgroundColor: 'rgba(208, 226, 255, 0.55)', borderColor: 'rgba(54, 102, 223, 0.16)' },
  green: { backgroundColor: 'rgba(205, 241, 229, 0.55)', borderColor: 'rgba(34, 140, 106, 0.16)' },
  pink: { backgroundColor: 'rgba(252, 231, 243, 0.55)', borderColor: 'rgba(244, 114, 182, 0.16)' },
} as const;

