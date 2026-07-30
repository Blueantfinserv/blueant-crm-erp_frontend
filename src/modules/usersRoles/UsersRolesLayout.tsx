import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { theme } from '../../theme/theme';

export function UsersRolesLayout({ children }: PropsWithChildren) {
  return <View style={styles.container}>{children}</View>;
}

export function UsersRolesHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerTextBlock}>
        <Text style={styles.title}>Users & Roles</Text>
        <Text style={styles.subtitle}>Manage employees, roles and account status.</Text>
      </View>
      <View style={styles.headerActions}>
        <AuthButton title="Export" onPress={() => {}} variant="secondary" />
        <AuthButton title="Add Employee" onPress={() => {}} />
      </View>
    </View>
  );
}

export const UsersRolesPageHeader = UsersRolesHeader;

export function FilterBar() {
  return (
    <View style={styles.filterBar}>
      <View style={[styles.filterBox, styles.searchBox]}>
        <TextInput placeholder="Search Employee" placeholderTextColor={theme.colors.subtle} style={styles.input} />
      </View>
      {['Role Filter', 'Department Filter', 'Status Filter', 'Branch Filter'].map((label) => (
        <Pressable key={label} style={styles.filterBox}>
          <Text style={styles.filterText}>{label}</Text>
        </Pressable>
      ))}
      <Pressable style={[styles.filterBox, styles.resetBox]}>
        <Text style={styles.resetText}>Reset Filters</Text>
      </Pressable>
    </View>
  );
}

export const UsersRolesControls = FilterBar;

export function StatsGrid({ children }: PropsWithChildren) {
  return <View style={styles.statsGrid}>{children}</View>;
}

export function TableShell({ children }: PropsWithChildren) {
  return <View style={styles.tableShell}>{children}</View>;
}

export const UsersRolesTableShell = TableShell;

export function TableHeader() {
  return (
    <View style={styles.tableHeader}>
      {['Employee ID', 'Full Name', 'Email', 'Department', 'Role', 'Reporting To', 'Branch', 'Status', 'Last Login', 'Actions'].map((column) => (
        <Text key={column} style={styles.tableHeaderText}>
          {column}
        </Text>
      ))}
    </View>
  );
}

export const UsersRolesTableHeader = TableHeader;

export function PaginationFooter({
  showingText,
}: {
  showingText: string;
}) {
  return (
    <View style={styles.paginationFooter}>
      <View style={styles.paginationGroup}>
        <Pressable style={styles.paginationPill}>
          <Text style={styles.paginationPillText}>Previous</Text>
        </Pressable>
        <Pressable style={[styles.paginationPill, styles.paginationPillActive]}>
          <Text style={[styles.paginationPillText, styles.paginationPillTextActive]}>1</Text>
        </Pressable>
        <Pressable style={styles.paginationPill}>
          <Text style={styles.paginationPillText}>Next</Text>
        </Pressable>
      </View>
      <View style={styles.rowsPerPage}>
        <Text style={styles.paginationText}>Rows Per Page</Text>
        <Pressable style={styles.rowsPerPageBox}>
          <Text style={styles.rowsPerPageText}>10</Text>
        </Pressable>
      </View>
      <Text style={styles.paginationText}>{showingText}</Text>
    </View>
  );
}

export const UsersRolesPaginationFooter = PaginationFooter;


const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 220,
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
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
  input: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableShell: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  tableHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.background,
    minWidth: 1440,
  },
  tableHeaderText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  paginationFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  paginationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowsPerPage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paginationText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  paginationPill: {
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  paginationPillActive: {
    backgroundColor: theme.colors.primary,
  },
  paginationPillText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  paginationPillTextActive: {
    color: '#fff',
  },
  rowsPerPageBox: {
    minWidth: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...theme.shadow.card,
  },
  rowsPerPageText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
