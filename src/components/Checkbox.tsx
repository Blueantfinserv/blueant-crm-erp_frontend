import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type Props = { label: string; value: boolean; onValueChange: (value: boolean) => void };
export function Checkbox({ label, value, onValueChange }: Props) {
  return (
    <Pressable onPress={() => onValueChange(!value)} style={styles.row}>
      <View style={[styles.box, value && styles.boxChecked]}>
        {value ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  check: { color: theme.colors.surface, fontSize: 13, fontWeight: '900', lineHeight: 14 },
  label: { color: theme.colors.secondary, fontSize: 14, fontWeight: '500' },
});
