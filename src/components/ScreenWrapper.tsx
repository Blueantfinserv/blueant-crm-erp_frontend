import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';

type Props = PropsWithChildren<{
  center?: boolean;
}>;

export function ScreenWrapper({ children, center = false }: Props) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, center && styles.center]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: 'center' },
  inner: { flex: 1 },
});
