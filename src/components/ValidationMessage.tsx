import { StyleSheet, Text } from 'react-native';
import { theme } from '../theme/theme';

export function ValidationMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
