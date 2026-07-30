import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { AuthInput } from '../../components/AuthInput';
import { FormAlert } from '../../components/FormAlert';
import { Header } from '../../components/Header';
import { PasswordInput } from '../../components/PasswordInput';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { theme } from '../../theme/theme';
import { ResetPasswordCredentials } from '../../types/auth';
import { validateConfirmPassword, validatePassword, validateResetToken } from '../../utils/authValidation';

type Props = {
  onBack: () => void;
  onUpdatePassword: (credentials: ResetPasswordCredentials) => void | Promise<void>;
  loading: boolean;
  errorMessage: string | null;
};

export function ResetPasswordScreen({ onBack, onUpdatePassword, loading, errorMessage }: Props) {
  const [values, setValues] = useState<ResetPasswordCredentials>({ token: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ token: false, password: false, confirmPassword: false });
  const tokenError = touched.token ? validateResetToken(values.token) || undefined : undefined;
  const passwordError = touched.password ? validatePassword(values.password) || undefined : undefined;
  const confirmError = touched.confirmPassword ? validateConfirmPassword(values.password, values.confirmPassword) || undefined : undefined;

  return (
    <ScreenWrapper>
      <View style={styles.page}>
        <Header title="Reset Password" subtitle="Create a new password" onBack={onBack} />
        <View style={styles.card}>
          <AuthInput
            label="Reset Token"
            placeholder="Enter reset token"
            value={values.token}
            onChangeText={(text) => setValues((current) => ({ ...current, token: text }))}
            onBlur={() => setTouched((current) => ({ ...current, token: true }))}
            error={tokenError}
          />
          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            autoComplete="new-password"
            value={values.password}
            onChangeText={(text) => setValues((current) => ({ ...current, password: text }))}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            error={passwordError}
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChangeText={(text) => setValues((current) => ({ ...current, confirmPassword: text }))}
            onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
            error={confirmError}
          />
          {errorMessage ? <FormAlert message={errorMessage} /> : null}
          <AuthButton
            title="Update Password"
            onPress={async () => {
              setTouched({ token: true, password: true, confirmPassword: true });
              if (validateResetToken(values.token) || validatePassword(values.password) || validateConfirmPassword(values.password, values.confirmPassword)) return;
              await onUpdatePassword(values);
            }}
            loading={loading}
          />
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
