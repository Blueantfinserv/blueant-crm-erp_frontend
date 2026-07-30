import { DimensionValue, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme/theme';
import {
  KpiCardData,
  ImprovementRowData,
  LeaderboardRowData,
  MonthTopPerformerRowData,
  QuarterSummaryRowData,
  ReportPreviewData,
  TrendPointData,
} from './types';

export function ReportPreview({ report }: { report: ReportPreviewData | null }) {
  if (!report) {
    return <EmptyState />;
  }

  return (
    <View style={styles.previewShell}>
      <ReportHeader header={report.header} />
      <KpiCards cards={report.kpis} />
      <TrendChart title={report.trend.title} subtitle={report.trend.subtitle} points={report.trend.points} />
      <Leaderboard title={report.leaderboard.title} rows={report.leaderboard.rows} />
      {report.variant === 'month' && report.improvements ? (
        <TopImprovement title={report.improvements.title} rows={report.improvements.rows} />
      ) : null}
      {report.monthTopPerformers ? (
        <TopPerformerByMonth title={report.monthTopPerformers.title} rows={report.monthTopPerformers.rows} />
      ) : null}
      {report.quarterSummary ? <QuarterSummary title={report.quarterSummary.title} rows={report.quarterSummary.rows} /> : null}
      <InsightsCard title={report.insights.title} bullets={report.insights.bullets} />
    </View>
  );
}

export function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Report Preview</Text>
        <Text style={styles.emptyText}>Select filters and click &quot;Generate Report&quot; to preview the report.</Text>
      </View>
    </View>
  );
}

export function ReportHeader({ header }: { header: ReportPreviewData['header'] }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.headerTitle}>{header.title}</Text>
          <Text style={styles.headerMeta}>{header.durationLabel}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{header.generatedLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function KpiCards({ cards }: { cards: ReportPreviewData['kpis'] }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.kpiCard, toneCardStyles[card.tone]]}>
            <Text style={styles.kpiLabel}>{card.label}</Text>
            <Text style={styles.kpiValue} numberOfLines={1}>
              {card.value}
            </Text>
            <Text style={styles.kpiHint}>{card.hint}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TrendChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle?: string;
  points: TrendPointData[];
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.chartWrap}>
        {points.map((point) => {
          const barWidth: DimensionValue = `${Math.max(12, (point.value / maxValue) * 100)}%`;
          return (
            <View key={point.label} style={styles.chartRow}>
              <Text style={styles.chartLabel}>{point.label}</Text>
              <View style={styles.chartTrack}>
                <View style={[styles.chartBar, { width: barWidth, backgroundColor: point.color }]} />
              </View>
              <Text style={styles.chartValue}>{formatNumber(point.value)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function Leaderboard({
  title,
  rows,
}: {
  title: string;
  rows: LeaderboardRowData[];
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.rankCell]}>Rank</Text>
          <Text style={[styles.tableHeaderCell, styles.nameCell]}>Employee</Text>
          <Text style={[styles.tableHeaderCell, styles.valueCell]}>Points</Text>
        </View>
        {rows.map((row) => (
          <View key={`${row.rank}-${row.name}`} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.rankCell]}>{row.rank}</Text>
            <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.tableCell, styles.valueCell]}>{formatNumber(row.points)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TopImprovement({
  title,
  rows,
}: {
  title: string;
  rows: ImprovementRowData[];
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.improvementGrid}>
        {rows.map((row) => (
          <View key={row.name} style={styles.improvementCard}>
            <Text style={styles.improvementName}>{row.name}</Text>
            <Text style={styles.improvementMeta}>
              {formatNumber(row.before)} → {formatNumber(row.after)}
            </Text>
            <Text style={styles.improvementGain}>+{formatNumber(row.gain)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TopPerformerByMonth({
  title,
  rows,
}: {
  title: string;
  rows: MonthTopPerformerRowData[];
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.monthCell]}>Month</Text>
          <Text style={[styles.tableHeaderCell, styles.nameCell]}>Top Performer</Text>
          <Text style={[styles.tableHeaderCell, styles.valueCell]}>Points</Text>
        </View>
        {rows.map((row) => (
          <View key={`${row.period}-${row.name}`} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.monthCell]}>{row.period}</Text>
            <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.tableCell, styles.valueCell]}>{formatNumber(row.points)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function QuarterSummary({
  title,
  rows,
}: {
  title: string;
  rows: QuarterSummaryRowData[];
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.quarterGrid}>
        {rows.map((row) => (
          <View key={row.quarter} style={styles.quarterCard}>
            <Text style={styles.quarterLabel}>{row.quarter}</Text>
            <Text style={styles.quarterValue}>{formatNumber(row.points)}</Text>
            <Text style={styles.quarterMeta}>
              {formatNumber(row.meetings)} meetings · {formatNumber(row.clients)} clients
            </Text>
            <Text style={styles.quarterMetaStrong}>{row.topPerformer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function InsightsCard({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.bulletList}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

const styles = StyleSheet.create({
  previewShell: {
    gap: 10,
    paddingVertical: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyCard: {
    width: '100%',
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    ...theme.shadow.card,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.subtle,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 420,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 12,
    gap: 10,
    ...theme.shadow.card,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  headerMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  headerBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 150,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  kpiLabel: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  kpiHint: {
    color: theme.colors.subtle,
    fontSize: 11,
    lineHeight: 15,
  },
  tonePeach: {
    backgroundColor: 'rgba(255, 242, 231, 0.94)',
    borderColor: 'rgba(251, 146, 96, 0.18)',
  },
  toneBlue: {
    backgroundColor: 'rgba(236, 244, 255, 0.94)',
    borderColor: 'rgba(96, 165, 250, 0.18)',
  },
  toneGreen: {
    backgroundColor: 'rgba(240, 251, 244, 0.94)',
    borderColor: 'rgba(74, 222, 128, 0.18)',
  },
  tonePink: {
    backgroundColor: 'rgba(255, 242, 248, 0.94)',
    borderColor: 'rgba(236, 72, 153, 0.16)',
  },
  toneMint: {
    backgroundColor: 'rgba(242, 252, 248, 0.94)',
    borderColor: 'rgba(16, 185, 129, 0.16)',
  },
  toneSky: {
    backgroundColor: 'rgba(242, 247, 255, 0.94)',
    borderColor: 'rgba(59, 130, 246, 0.16)',
  },
  sectionHeadingRow: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '600',
  },
  chartWrap: {
    gap: 10,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabel: {
    width: 54,
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  chartTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.10)',
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 999,
  },
  chartValue: {
    width: 68,
    textAlign: 'right',
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  table: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  tableHeaderCell: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.10)',
  },
  tableCell: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  rankCell: {
    width: 48,
  },
  monthCell: {
    width: 72,
  },
  nameCell: {
    flex: 1,
    paddingRight: 8,
  },
  valueCell: {
    width: 80,
    textAlign: 'right',
  },
  improvementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  improvementCard: {
    flexBasis: '48%',
    minWidth: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    padding: 10,
    gap: 4,
  },
  improvementName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  improvementMeta: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '600',
  },
  improvementGain: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  quarterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quarterCard: {
    flexBasis: '48%',
    minWidth: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    padding: 10,
    gap: 4,
  },
  quarterLabel: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quarterValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  quarterMeta: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '600',
  },
  quarterMetaStrong: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: theme.colors.primary,
  },
  bulletText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
} as const);

const toneCardStyles: Record<KpiCardData['tone'], object> = {
  peach: styles.tonePeach,
  blue: styles.toneBlue,
  green: styles.toneGreen,
  pink: styles.tonePink,
  mint: styles.toneMint,
  sky: styles.toneSky,
};
