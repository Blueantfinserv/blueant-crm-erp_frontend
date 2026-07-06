import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../components/AuthButton';
import { theme } from '../theme/theme';
export function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Blueant ERP</Text>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Dashboard placeholder ready for future modules.</Text>
      </View>
      <AuthButton title="Logout" onPress={onLogout} variant="secondary" />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 30, fontWeight: '800', color: theme.colors.text },
  card: { backgroundColor: theme.colors.surface, padding: 20, borderRadius: 24, ...theme.shadow.card },
  subtitle: { color: theme.colors.muted, fontSize: 16 },
});
