import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthInput } from './AuthInput';
import { theme } from '../theme/theme';

type Props = React.ComponentProps<typeof AuthInput>;

export function PasswordInput(props: Props) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.wrap}>
      <AuthInput {...props} labelBadge="🔒" secureTextEntry={!show} />
      <Pressable onPress={() => setShow((value) => !value)} hitSlop={10} style={styles.toggle}>
        <Text style={styles.toggleText}>{show ? 'Hide' : 'Show'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  toggle: { position: 'absolute', right: 16, top: 42 },
  toggleText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
});
