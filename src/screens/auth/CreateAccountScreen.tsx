import { Text, View, StyleSheet } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { AuthInput } from '../../components/AuthInput';
import { Header } from '../../components/Header';
import { PasswordInput } from '../../components/PasswordInput';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { theme } from '../../theme/theme';
type Props = { onBack: () => void; onCreateAccount: () => void; onLogin: () => void; loading: boolean; errorMessage: string | null };
export function CreateAccountScreen({ onBack, onCreateAccount, onLogin, loading, errorMessage }: Props) {
  return (
    <ScreenWrapper>
      <View style={styles.page}>
        <Header title="Activate Account" subtitle="Create your password to activate your employee account" onBack={onBack} />
        <View style={styles.card}>
          <AuthInput label="Employee ID" placeholder="Enter employee ID" />
          <PasswordInput label="Create Password" placeholder="Create password" />
          <PasswordInput label="Confirm Password" placeholder="Confirm password" />
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <AuthButton title="Activate Account" onPress={onCreateAccount} loading={loading} />
          <Text onPress={onLogin} style={styles.link}>Already have account? Login</Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 24 },
  card: { gap: 16, backgroundColor: theme.colors.background, padding: 20, borderRadius: 24, ...theme.shadow.card },
  error: { color: theme.colors.error, fontWeight: '600' },
  link: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center' },
});
