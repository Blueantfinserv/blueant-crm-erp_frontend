import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';
export function Divider({ label = 'OR' }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  label: { color: theme.colors.subtle, fontWeight: '700', fontSize: 12 },
});
