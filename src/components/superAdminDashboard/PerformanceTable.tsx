import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import type { DashboardPerformanceRow, DashboardTableColumn, DashboardTableRow } from '../../screens/dashboard/dashboardTypes';

type SummaryTone = 'blue' | 'orange' | 'purple';

export type SummaryCardModel = {
  label: string;
  value: number;
  tone: SummaryTone;
};

type Props<T> = {
  title: string;
  rows: T[];
  period: string;
  onPeriodChange: (period: string) => void;
  columns: DashboardTableColumn[];
  rowAdapter: (row: T, index: number) => DashboardTableRow;
  summaryCards: SummaryCardModel[];
};

export function PerformanceTable<T>({
  title,
  rows,
  period,
  onPeriodChange,
  columns,
  rowAdapter,
  summaryCards,
}: Props<T>) {
  const periods = ['Today', 'Yesterday', 'Current Week'];
  const adaptedRows = rows.map(rowAdapter);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>◉</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.filters}>
          {periods.map((item) => {
            const active = item === period;
            return (
              <Text key={item} onPress={() => onPeriodChange(item)} style={[styles.filter, active && styles.filterActive]}>
                {item}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.topHeaderRow}>
            <HeadCell label="S/N" width={44} />
            {columns.map((column) => (
              <HeadCell key={column.key} label={column.label} width={column.width} align={column.align} />
            ))}
          </View>

          <View style={styles.subHeaderRow}>
            <SubHead label="" width={44} />
            {columns.map((column) => (
              <SubHead key={column.key} label="" width={column.width} align={column.align} />
            ))}
          </View>

          {adaptedRows.map((row, index) => (
            <View key={row.id} style={styles.row}>
              <Cell width={44} align="center" bold>
                {String(index + 1)}
              </Cell>
              <Cell width={columns[0].width} align={columns[0].align ?? 'left'} employee={row.employee} />
              {row.values.map((value, columnIndex) => {
                const column = columns[columnIndex + 1];
                return (
                  <Cell key={`${row.id}-${column.key}`} width={column.width} align={column.align ?? 'center'} tone={typeof value === 'number' ? toneForIndex(columnIndex) : undefined} strong={typeof value === 'number' && column.key === 'points'}>
                    {value}
                  </Cell>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function toneForIndex(index: number): SummaryTone | undefined {
  if (index === 0 || index === 2 || index === 5 || index === 7) return 'blue';
  if (index === 1 || index === 3 || index === 6 || index === 8) return 'orange';
  return 'purple';
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: SummaryTone }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, styles[`tone${tone}`]]}>{value}</Text>
    </View>
  );
}

function HeadCell({ label, width, align = 'center' }: { label: string; width: number; align?: 'left' | 'center' }) {
  return (
    <View style={[styles.headCell, { width, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
      <Text style={styles.headText}>{label}</Text>
    </View>
  );
}

function SubHead({ label, width, align = 'center' }: { label: string; width: number; align?: 'left' | 'center' }) {
  return (
    <View style={[styles.subCell, { width, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
      {label ? <Text style={styles.subText}>{label}</Text> : null}
    </View>
  );
}

function Cell({
  children,
  width,
  align = 'center',
  employee,
  tone,
  bold,
  strong,
}: {
  children?: React.ReactNode;
  width: number;
  align?: 'left' | 'center';
  employee?: string;
  tone?: SummaryTone;
  bold?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={[styles.cell, { width, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
      {employee ? (
        <View style={styles.employeeWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{employee.slice(0, 1)}</Text>
          </View>
          <Text style={[styles.employeeText, bold && styles.bold]} numberOfLines={2}>
            {employee}
          </Text>
        </View>
      ) : (
        <Text style={[styles.value, tone && styles[`tone${tone}`], strong && styles.strong]}>{children}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 16,
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  table: {
    minWidth: 1160,
    flex: 1,
  },
  topHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  headCell: {
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  headText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  subCell: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  subText: {
    fontSize: 10,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 56,
  },
  cell: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  employeeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  employeeText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    fontSize: 12,
    fontWeight: '800',
  },
  strong: {
    fontSize: 14,
  },
  bold: {
    fontWeight: '800',
  },
  toneblue: { color: '#2F6BFF' },
  toneorange: { color: '#FF6A2A' },
  tonegreen: { color: '#27AE60' },
  tonepurple: { color: '#7B4BE8' },
});
