import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

export function Logo() {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <View style={styles.dot} />
        <View style={styles.bar} />
      </View>
      <Text style={styles.text}>Blueant ERP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mark: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    marginBottom: 8,
  },
  bar: {
    width: 44,
    height: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  text: {
    color: theme.colors.surface,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
