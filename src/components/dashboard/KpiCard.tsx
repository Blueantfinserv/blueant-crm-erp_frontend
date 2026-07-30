import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type KpiCardProps = {
  title: string;
  value: string;
};

export function KpiCard({ title, value }: KpiCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'space-between',
    ...theme.shadow.card,
  },
  value: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  title: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

