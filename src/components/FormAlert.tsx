import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type Props = {
  message: string;
  tone?: 'error' | 'success';
};

export function FormAlert({ message, tone = 'error' }: Props) {
  const isSuccess = tone === 'success';
  return (
    <View
      style={[styles.wrap, isSuccess && styles.wrapSuccess]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.text, isSuccess && styles.textSuccess]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
  },
  wrapSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: 'rgba(22, 163, 74, 0.18)',
  },
  text: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  textSuccess: {
    color: theme.colors.success,
  },
});
