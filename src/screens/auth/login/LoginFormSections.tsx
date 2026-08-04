import { type RefObject } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { AuthButton } from '../../../components/AuthButton';
import { AuthInput } from '../../../components/AuthInput';
import { Checkbox } from '../../../components/Checkbox';
import { FormAlert } from '../../../components/FormAlert';
import { PasswordInput } from '../../../components/PasswordInput';
import { LoginFormValues } from '../../../utils/authValidation';
import type { LoginSharedStyles } from './LoginShared';

type SharedStyles = LoginSharedStyles;

type LoginFormSectionProps = {
  styles: SharedStyles;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  values: LoginFormValues;
  remember: boolean;
  employeeCodeError?: string;
  passwordError?: string;
  emailRef: RefObject<TextInput | null>;
  passwordRef: RefObject<TextInput | null>;
  onEmployeeCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onEmployeeCodeBlur: () => void;
  onPasswordBlur: () => void;
  onRememberChange: (value: boolean) => void;
  onForgotPassword: () => void;
  onSubmit: () => void;
  onSwitchToCreateAccount: () => void;
};

export function LoginFormSection({
  styles,
  loading,
  errorMessage,
  successMessage,
  values,
  remember,
  employeeCodeError,
  passwordError,
  emailRef,
  passwordRef,
  onEmployeeCodeChange,
  onPasswordChange,
  onEmployeeCodeBlur,
  onPasswordBlur,
  onRememberChange,
  onForgotPassword,
  onSubmit,
  onSwitchToCreateAccount,
}: LoginFormSectionProps) {
  return (
    <View style={styles.form}>
      {errorMessage ? <FormAlert message={errorMessage} /> : null}
      {successMessage ? <FormAlert message={successMessage} tone="success" /> : null}
      <AuthInput
        ref={emailRef}
        label="Employee Code"
        labelBadge={'\u{1F464}'}
        placeholder="Enter your employee code"
        value={values.employeeCode}
        onChangeText={onEmployeeCodeChange}
        onBlur={onEmployeeCodeBlur}
        keyboardType="default"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={employeeCodeError}
      />
      <PasswordInput
        ref={passwordRef}
        label="Password"
        placeholder="Enter password"
        value={values.password}
        onChangeText={onPasswordChange}
        onBlur={onPasswordBlur}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        error={passwordError}
      />

      <View style={styles.row}>
        <Checkbox label="Remember me" value={remember} onValueChange={onRememberChange} />
        <Pressable onPress={onForgotPassword} hitSlop={10}>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </Pressable>
      </View>

      <AuthButton title={loading ? 'Logging in...' : 'Login'} onPress={onSubmit} loading={loading} />

      <Pressable onPress={onSwitchToCreateAccount} style={({ pressed }) => [styles.activateLink, pressed && styles.linkPressed]}>
        <Text style={styles.activatePrompt}>First time using BlueAnt ERP?</Text>
        <View style={styles.secondaryActionPill}>
          <View style={styles.secondaryActionBadge}>
            <Text style={styles.secondaryActionBadgeText}>{'\u{1F464}+'}</Text>
          </View>
          <Text style={styles.activateAction}>Sign In</Text>
        </View>
      </Pressable>
    </View>
  );
}

type CreateAccountFormSectionProps = {
  styles: SharedStyles;
  loading: boolean;
  errorMessage: string | null;
  values: { email: string; password: string; confirmPassword: string };
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordBlur: () => void;
  onConfirmPasswordBlur: () => void;
  onSubmit: () => void;
  onSwitchToLogin: () => void;
};

export function CreateAccountFormSection({
  styles,
  loading,
  errorMessage,
  values,
  emailError,
  passwordError,
  confirmPasswordError,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onEmailBlur,
  onPasswordBlur,
  onConfirmPasswordBlur,
  onSubmit,
  onSwitchToLogin,
}: CreateAccountFormSectionProps) {
  return (
    <View style={styles.form}>
      {errorMessage ? <FormAlert message={errorMessage} /> : null}
      <AuthInput
        label="Email"
        labelBadge={'\u2709'}
        placeholder="Enter your registered email"
        value={values.email}
        onChangeText={onEmailChange}
        onBlur={onEmailBlur}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
      />
      <PasswordInput
        label="Create Password"
        placeholder="Create password"
        value={values.password}
        onChangeText={onPasswordChange}
        onBlur={onPasswordBlur}
        autoComplete="new-password"
        error={passwordError}
      />
      <PasswordInput
        label="Confirm Password"
        placeholder="Confirm password"
        value={values.confirmPassword}
        onChangeText={onConfirmPasswordChange}
        onBlur={onConfirmPasswordBlur}
        autoComplete="new-password"
        error={confirmPasswordError}
      />
      <AuthButton title="Create Account" onPress={onSubmit} loading={loading} />
      <Pressable onPress={onSwitchToLogin} style={({ pressed }) => [styles.activateLink, pressed && styles.linkPressed]}>
        <Text style={styles.activatePrompt}>Already have an account?</Text>
        <Text style={styles.activateAction}>Login</Text>
      </Pressable>
    </View>
  );
}

type ForgotPasswordModalSectionProps = {
  styles: SharedStyles;
  visible: boolean;
  sent: boolean;
  loading: boolean;
  email: string;
  emailError?: string;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ForgotPasswordModalSection({
  styles,
  visible,
  sent,
  loading,
  email,
  emailError,
  onEmailChange,
  onEmailBlur,
  onClose,
  onSubmit,
}: ForgotPasswordModalSectionProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop} accessibilityViewIsModal>
        <View style={styles.modalCard}>
          {sent ? (
            <View style={styles.forgotSuccessBox}>
              <Text style={styles.forgotSuccessTitle}>Success</Text>
              <FormAlert message="Password reset link has been sent to your registered email." tone="success" />
              <AuthButton title="Close" onPress={onClose} loading={false} />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Forgot Password</Text>
                <Text style={styles.sparkle}>{'\u2726'}</Text>
              </View>
              <AuthInput
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={onEmailChange}
                onBlur={onEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
              />
              <AuthButton title="Send Reset Link" onPress={onSubmit} loading={loading} />
              <Pressable onPress={onClose} style={({ pressed }) => [styles.activateLink, pressed && styles.linkPressed]}>
                <Text style={styles.activatePrompt}>Back to</Text>
                <Text style={styles.activateAction}>Login</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
