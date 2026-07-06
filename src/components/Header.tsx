import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type Props = { title: string; subtitle?: string; onBack?: () => void };
export function Header({ title, subtitle, onBack }: Props) {
  return (
    <View style={styles.wrap}>
      {onBack ? <Pressable onPress={onBack} hitSlop={10}><Text style={styles.back}>Back</Text></Pressable> : <View style={styles.backSpace} />}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: theme.colors.primary, fontWeight: '700' },
  backSpace: { width: 40 },
  copy: { flex: 1, gap: 6 },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  subtitle: { color: theme.colors.muted, lineHeight: 20 },
});
