import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

export function ComingSoon({ title }: { title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
      <Text style={styles.description}>This module is not active yet. We are currently building Sales first.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 420,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
    ...theme.shadow.card,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 420,
  },
});
