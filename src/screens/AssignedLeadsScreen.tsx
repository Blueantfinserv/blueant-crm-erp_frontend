import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';

export function AssignedLeadsScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.icon}><Icon source="clipboard-account-outline" size={22} color="#3156C8" /></View>
        <View>
          <Text style={styles.title}>Assigned Tasks</Text>
          <Text style={styles.subtitle}>Leads assigned to you today by the Sales Coordinator.</Text>
        </View>
      </View>
      <View style={styles.empty}>
        <Icon source="database-clock-outline" size={34} color="#8A95A7" />
        <Text style={styles.emptyTitle}>Assigned leads will appear here</Text>
        <Text style={styles.emptyText}>The page is ready. Lead cards will be connected when the assigned-leads list endpoint is available.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, gap: 12, padding: 18, backgroundColor: '#F7F8FA' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF' },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#EEF3FF' },
  title: { color: '#15213A', fontSize: 16, fontWeight: '900' },
  subtitle: { marginTop: 2, color: '#7C879A', fontSize: 9, fontWeight: '600' },
  empty: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 24, borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF' },
  emptyTitle: { color: '#263248', fontSize: 13, fontWeight: '900' },
  emptyText: { maxWidth: 440, color: '#7C879A', textAlign: 'center', fontSize: 9, fontWeight: '600', lineHeight: 15 },
});
