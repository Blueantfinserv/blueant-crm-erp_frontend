import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { UsersRoleRow } from './usersRolesData';

export function UsersRolesTable({ rows, selectedIds }: { rows: UsersRoleRow[]; selectedIds?: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {rows.map((row) => (
          <View key={row.employeeId} style={styles.row}>
            <Text style={styles.cell}>{row.employeeId}</Text>
            <Text style={styles.cell}>{row.fullName}</Text>
            <Text style={styles.cell}>{row.email}</Text>
            <Text style={styles.cell}>{row.role}</Text>
            <Text style={styles.cell}>{row.department}</Text>
            <Text style={styles.cell}>{row.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 980,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 14,
    gap: 12,
  },
  cell: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
