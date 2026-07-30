import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { AuthInput } from '../../components/AuthInput';
import { FormAlert } from '../../components/FormAlert';
import { Header } from '../../components/Header';
import { PasswordInput } from '../../components/PasswordInput';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { theme } from '../../theme/theme';
import { RegisterCredentials } from '../../types/auth';
import { validateConfirmPassword, validateEmail, validatePassword } from '../../utils/authValidation';

type Props = {
  onBack: () => void;
  onCreateAccount: (credentials: RegisterCredentials) => void | Promise<void>;
  onLogin: () => void;
  loading: boolean;
  errorMessage: string | null;
};

export function CreateAccountScreen({ onBack, onCreateAccount, onLogin, loading, errorMessage }: Props) {
  const [values, setValues] = useState<RegisterCredentials>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });

  const emailError = touched.email ? validateEmail(values.email) || undefined : undefined;
  const passwordError = touched.password ? validatePassword(values.password) || undefined : undefined;
  const confirmPasswordError = touched.confirmPassword ? validateConfirmPassword(values.password, values.confirmPassword) || undefined : undefined;

  return (
    <ScreenWrapper>
      <View style={styles.page}>
        <Header title="Create Account" subtitle="Set up your BlueAnt ERP account" onBack={onBack} />
        <View style={styles.card}>
          <AuthInput
            label="Email"
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={values.email}
            onChangeText={(text) => setValues((current) => ({ ...current, email: text }))}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            error={emailError}
          />
          <PasswordInput
            label="Password"
            placeholder="Create password"
            autoComplete="new-password"
            value={values.password}
            onChangeText={(text) => setValues((current) => ({ ...current, password: text }))}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            error={passwordError}
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChangeText={(text) => setValues((current) => ({ ...current, confirmPassword: text }))}
            onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
            error={confirmPasswordError}
          />
          {errorMessage ? <FormAlert message={errorMessage} /> : null}
          <AuthButton title="Create Account" onPress={() => void onCreateAccount(values)} loading={loading} />
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
