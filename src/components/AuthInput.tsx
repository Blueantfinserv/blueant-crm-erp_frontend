import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme/theme';
import { ValidationMessage } from './ValidationMessage';

type Props = TextInputProps & {
  label: string;
  error?: string;
  labelBadge?: string;
};

export const AuthInput = forwardRef<TextInput, Props>(function AuthInput({ label, labelBadge, error, style, ...props }, ref) {
  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        {labelBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{labelBadge}</Text>
          </View>
        ) : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.subtle}
        style={[styles.input, error && styles.inputError, style]}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={props.accessibilityHint}
        {...props}
      />
      <ValidationMessage message={error} />
    </View>
  );
});

const styles = StyleSheet.create({
  block: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.secondary },
  input: {
    minHeight: 40,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.text,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  inputError: { borderColor: theme.colors.error },
  error: { color: theme.colors.error, fontSize: 12, fontWeight: '500' },
});
