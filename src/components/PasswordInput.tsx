import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthInput } from './AuthInput';
import { theme } from '../theme/theme';

type Props = React.ComponentProps<typeof AuthInput>;

export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.wrap}>
      <AuthInput {...props} ref={ref} labelBadge={'\u{1F512}'} secureTextEntry={!show} />
      <Pressable
        onPress={() => setShow((value) => !value)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
        accessibilityHint="Toggles password visibility"
        accessibilityState={{ expanded: show }}
        style={[styles.toggle, props.compact && styles.compactToggle]}
      >
        <Text style={styles.toggleText}>{show ? 'Hide' : 'Show'}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  toggle: { position: 'absolute', right: 16, top: 42 },
  compactToggle: { top: 29 },
  toggleText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
});
