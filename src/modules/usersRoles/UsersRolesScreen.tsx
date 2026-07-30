import { ScrollView, StyleSheet, View } from 'react-native';
import {
  UsersRolesLayout,
  UsersRolesControls,
  UsersRolesHeader,
  UsersRolesPaginationFooter,
  UsersRolesTableHeader,
  UsersRolesTableShell,
} from './UsersRolesLayout';
import { EmptyState, LoadingSkeleton, StatsCard } from './UsersRolesComponents';
import { theme } from '../../theme/theme';
import { usersRoleRows } from './usersRolesData';
import { UsersRolesTable } from './UsersRolesTable';

export function UsersRolesScreen() {
  const rows = usersRoleRows;
  const isLoading = false;
  const total = rows.length;
  const showingStart = total > 0 ? 1 : 0;
  const showingEnd = total;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <UsersRolesLayout>
        <UsersRolesHeader />
        <UsersRolesControls />

        <View style={styles.statsRow}>
          <StatsCard title="Total Employees" value="248" />
          <StatsCard title="Total Active Users" value="196" tone="success" />
          <StatsCard title="Pending Invitations" value="14" tone="warning" />
          <StatsCard title="Inactive Users" value="38" />
        </View>

        <UsersRolesTableShell>
          <UsersRolesTableHeader />
          {isLoading ? (
            <LoadingSkeleton />
          ) : rows.length ? (
            <UsersRolesTable rows={rows} />
          ) : (
            <EmptyState title="No employees found." description="Try adjusting filters or add a new employee to get started." />
          )}
        </UsersRolesTableShell>

        <UsersRolesPaginationFooter showingText={`Showing ${showingStart}–${showingEnd} of ${total} Employees`} />
      </UsersRolesLayout>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
