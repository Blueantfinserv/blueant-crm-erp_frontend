import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { AuthInput } from '../../components/AuthInput';
import { FormAlert } from '../../components/FormAlert';
import { Header } from '../../components/Header';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { theme } from '../../theme/theme';
import { ForgotPasswordCredentials } from '../../types/auth';
import { validateEmail } from '../../utils/authValidation';

type Props = {
  onBack: () => void;
  onSendResetLink: (credentials: ForgotPasswordCredentials) => void | Promise<void>;
  loading: boolean;
  errorMessage: string | null;
  onSuccess: () => void;
};

export function ForgotPasswordScreen({ onBack, onSendResetLink, loading, errorMessage, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const emailError = touched ? validateEmail(email) || undefined : undefined;

  return (
    <ScreenWrapper>
      <View style={styles.page}>
        <Header title="Forgot Password" subtitle="Send a reset link to your email" onBack={onBack} />
        <View style={styles.card}>
          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Success</Text>
              <FormAlert message="Password reset link has been sent to your registered email." tone="success" />
              <AuthButton title="Continue" onPress={onSuccess} />
            </View>
          ) : (
            <>
              <AuthInput
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched(true)}
                error={emailError}
              />
              {errorMessage ? <FormAlert message={errorMessage} /> : null}
              <AuthButton
                title="Send Reset Link"
                onPress={async () => {
                  setTouched(true);
                  if (validateEmail(email)) return;
                  await onSendResetLink({ email });
                  setSent(true);
                }}
                loading={loading}
              />
            </>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 24 },
  card: { gap: 16, backgroundColor: theme.colors.background, padding: 20, borderRadius: 24, ...theme.shadow.card },
  error: { color: theme.colors.error, fontWeight: '600' },
  successBox: { gap: 12 },
  successTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.success },
  successText: { color: theme.colors.muted, lineHeight: 20 },
});
