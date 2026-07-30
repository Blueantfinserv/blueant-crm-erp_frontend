import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { UsersRoleRow, UsersRoleStatus } from './usersRolesData';

export function LeadStatsCard({ title, value, tone = 'default' }: { title: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  return (
    <View style={[styles.statsCard, tone === 'success' && styles.statsCardSuccess, tone === 'warning' && styles.statsCardWarning]}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );
}

export const StatsCard = LeadStatsCard;

export function LeadStatusBadge({ status }: { status: UsersRoleStatus }) {
  const tone = getStatusTone(status);
  return (
    <View style={[styles.statusBadge, tone.container]}>
      <Text style={[styles.statusText, tone.text]}>{status}</Text>
    </View>
  );
}

export const StatusBadge = LeadStatusBadge;

export function PriorityBadge({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  const tone = getPriorityTone(priority);
  return (
    <View style={[styles.priorityBadge, tone.container]}>
      <Text style={[styles.priorityText, tone.text]}>{priority}</Text>
    </View>
  );
}

export function LeadActionButtons() {
  return (
    <View style={styles.actionGroup}>
      <ActionIcon label="View" icon="↗" />
      <ActionIcon label="Edit" icon="✎" />
      <ActionIcon label="More" icon="⋯" />
    </View>
  );
}

export const UserActionButtons = LeadActionButtons;

export function LeadFilterBar() {
  return (
    <View style={styles.filterBar}>
      {['Search Lead', 'Lead Status Filter', 'Assigned To Filter', 'Source Filter', 'Date Range Filter'].map((label, index) => (
        <View key={label} style={[styles.filterBox, index === 0 && styles.searchBox]}>
          <Text style={styles.filterText}>{label}</Text>
        </View>
      ))}
      <Pressable style={[styles.filterBox, styles.resetBox]}>
        <Text style={styles.resetText}>Reset Filters</Text>
      </Pressable>
    </View>
  );
}

export function LeadTable({
  rows,
}: {
  rows: LeadRowItem[];
}) {
  return (
    <View style={styles.tableBody}>
      {rows.map((row) => (
        <View key={row.leadId} style={styles.row}>
          <Text style={styles.cell}>{row.leadId}</Text>
          <Text style={styles.cell}>{row.customerName}</Text>
          <Text style={styles.cell}>{row.company}</Text>
          <Text style={styles.cell}>{row.phone}</Text>
          <Text style={styles.cell}>{row.source}</Text>
          <Text style={styles.cell}>{row.assignedTo}</Text>
          <View style={styles.cell}>
            <LeadStatusBadge status={row.leadStatus} />
          </View>
          <View style={styles.cell}>
            <PriorityBadge priority={row.priority} />
          </View>
          <Text style={styles.cell}>{row.nextFollowUp}</Text>
          <Text style={styles.cell}>{row.createdDate}</Text>
          <View style={styles.actionsCell}>
            <LeadActionButtons />
          </View>
        </View>
      ))}
    </View>
  );
}

export const EmployeeTable = LeadTable;

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

export function LoadingSkeleton() {
  return (
    <View style={styles.skeletonWrapper}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          {Array.from({ length: 11 }).map((__, columnIndex) => (
            <View key={columnIndex} style={styles.skeletonCell} />
          ))}
        </View>
      ))}
    </View>
  );
}


export type LeadRowItem = {
  leadId: string;
  customerName: string;
  company: string;
  phone: string;
  source: string;
  assignedTo: string;
  leadStatus: UsersRoleStatus;
  priority: 'High' | 'Medium' | 'Low';
  nextFollowUp: string;
  createdDate: string;
};

function ActionIcon({ label, icon }: { label: string; icon: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.actionButton}>
      <Text style={styles.actionIcon}>{icon}</Text>
    </Pressable>
  );
}

function getStatusTone(status: UsersRoleStatus) {
  if (status === 'Active') return { container: styles.statusActive, text: styles.statusActiveText };
  if (status === 'Inactive') return { container: styles.statusInactive, text: styles.statusInactiveText };
  return { container: styles.statusInvited, text: styles.statusInvitedText };
}

function getPriorityTone(priority: 'High' | 'Medium' | 'Low') {
  if (priority === 'High') return { container: styles.priorityHigh, text: styles.priorityHighText };
  if (priority === 'Medium') return { container: styles.priorityMedium, text: styles.priorityMediumText };
  return { container: styles.priorityLow, text: styles.priorityLowText };
}

const styles = StyleSheet.create({
  statsCard: {
    flex: 1,
    minWidth: 190,
    borderRadius: 20,
    padding: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: 'space-between',
    minHeight: 108,
    ...theme.shadow.card,
  },
  statsCardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  statsCardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  statsValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  statsTitle: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterBox: {
    flexGrow: 1,
    minWidth: 160,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  searchBox: {
    flexBasis: '100%',
  },
  filterText: {
    color: theme.colors.subtle,
    fontSize: 14,
    fontWeight: '600',
  },
  resetBox: {
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.16)',
  },
  resetText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
  statusInactive: { backgroundColor: 'rgba(148, 163, 184, 0.16)' },
  statusInvited: { backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  statusActiveText: { color: '#059669' },
  statusInactiveText: { color: theme.colors.subtle },
  statusInvitedText: { color: '#B45309' },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityHigh: { backgroundColor: 'rgba(239, 68, 68, 0.14)' },
  priorityMedium: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  priorityLow: { backgroundColor: 'rgba(59, 130, 246, 0.14)' },
  priorityHighText: { color: '#DC2626' },
  priorityMediumText: { color: '#D97706' },
  priorityLowText: { color: '#2563EB' },
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  actionIcon: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  tableBody: {
    minWidth: 1440,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cell: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actionsCell: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  skeletonWrapper: {
    padding: 16,
    gap: 12,
    minWidth: 1440,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCell: {
    flex: 1,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
});
