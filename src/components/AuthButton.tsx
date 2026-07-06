import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function AuthButton({ title, onPress, variant = 'primary', disabled, loading, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={variant === 'secondary' ? theme.colors.primary : theme.colors.surface} /> : null}
        <Text style={[styles.text, variant === 'secondary' && styles.secondaryText, variant === 'ghost' && styles.ghostText]}>{title}</Text>
        {variant === 'primary' && !loading ? <Text style={styles.arrow}>→</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    ...theme.shadow.button,
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, shadowOpacity: 0.08 },
  ghost: { backgroundColor: 'transparent', shadowOpacity: 0 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.95 },
  disabled: { opacity: 0.65 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: theme.colors.surface, fontWeight: '800', fontSize: 16 },
  secondaryText: { color: theme.colors.text },
  ghostText: { color: theme.colors.primary },
  arrow: { color: theme.colors.surface, fontWeight: '800', fontSize: 18, marginLeft: 4 },
});
