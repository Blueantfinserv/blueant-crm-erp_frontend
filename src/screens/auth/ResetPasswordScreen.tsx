import { Text, View, StyleSheet } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { AuthInput } from '../../components/AuthInput';
import { Header } from '../../components/Header';
import { PasswordInput } from '../../components/PasswordInput';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { theme } from '../../theme/theme';
type Props = { onBack: () => void; onUpdatePassword: () => void; loading: boolean; errorMessage: string | null };
export function ResetPasswordScreen({ onBack, onUpdatePassword, loading, errorMessage }: Props) {
  return (
    <ScreenWrapper>
      <View style={styles.page}>
        <Header title="Reset Password" subtitle="Enter OTP and create a new password" onBack={onBack} />
        <View style={styles.card}>
          <AuthInput label="OTP" placeholder="Enter OTP" keyboardType="number-pad" />
          <PasswordInput label="New Password" placeholder="Enter new password" />
          <PasswordInput label="Confirm Password" placeholder="Confirm new password" />
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <AuthButton title="Update Password" onPress={onUpdatePassword} loading={loading} />
        </View>
      </View>
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 24 },
  card: { gap: 16, backgroundColor: theme.colors.background, padding: 20, borderRadius: 24, ...theme.shadow.card },
  error: { color: theme.colors.error, fontWeight: '600' },
});
