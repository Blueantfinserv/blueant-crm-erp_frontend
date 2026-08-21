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
    </View>
  );
}

type CreateAccountFormSectionProps = {
  styles: SharedStyles;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  step: 'identity' | 'password';
  values: {
    employeeCode: string;
    password: string;
    confirmPassword: string;
    mobileNumber: string;
    email: string;
    otp: string;
  };
  employeeCodeError?: string;
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  mobileNumberError?: string;
  otpError?: string;
  onEmployeeCodeChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onMobileNumberChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onEmployeeCodeBlur: () => void;
  onEmailBlur: () => void;
  onPasswordBlur: () => void;
  onConfirmPasswordBlur: () => void;
  onMobileNumberBlur: () => void;
  onOtpBlur: () => void;
  onSendOtp: () => void;
  onSubmit: () => void;
  onSwitchToLogin: () => void;
};

export function CreateAccountFormSection({
  styles,
  loading,
  errorMessage,
  successMessage,
  step,
  values,
  employeeCodeError,
  emailError,
  passwordError,
  confirmPasswordError,
  mobileNumberError,
  otpError,
  onEmployeeCodeChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onMobileNumberChange,
  onOtpChange,
  onEmployeeCodeBlur,
  onEmailBlur,
  onPasswordBlur,
  onConfirmPasswordBlur,
  onMobileNumberBlur,
  onOtpBlur,
  onSendOtp,
  onSubmit,
  onSwitchToLogin,
}: CreateAccountFormSectionProps) {
  return (
    <View style={[styles.form, styles.activationForm]}>
      {errorMessage ? <FormAlert message={errorMessage} /> : null}
      {successMessage ? <FormAlert message={successMessage} tone="success" /> : null}
      {step === 'identity' ? (
        <>
          <AuthInput
            compact
            label="Employee Code"
            labelBadge={'\u{1F464}'}
            placeholder="Enter your employee code"
            value={values.employeeCode}
            onChangeText={onEmployeeCodeChange}
            onBlur={onEmployeeCodeBlur}
            autoCapitalize="none"
            autoComplete="username"
            error={employeeCodeError}
          />
          <AuthInput
            compact
            label="Mobile Number"
            labelBadge={'\u260E'}
            placeholder="Enter your mobile number"
            value={values.mobileNumber}
            onChangeText={onMobileNumberChange}
            onBlur={onMobileNumberBlur}
            keyboardType="phone-pad"
            autoComplete="tel"
            error={mobileNumberError}
          />
          <View style={styles.emailOtpRow}>
            <AuthInput
              compact
              containerStyle={styles.emailOtpInput}
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
            <View style={styles.sendOtpButtonWrap}>
              <AuthButton title="Send OTP" onPress={onSendOtp} loading={loading} style={styles.sendOtpButton} />
            </View>
          </View>
        </>
      ) : (
        <>
          <AuthInput
            compact
            label="OTP"
            labelBadge={'#'}
            placeholder="Enter OTP"
            value={values.otp}
            onChangeText={onOtpChange}
            onBlur={onOtpBlur}
            autoComplete="one-time-code"
            error={otpError}
          />
          <PasswordInput
            compact
            label="New Password"
            placeholder="Enter new password"
            value={values.password}
            onChangeText={onPasswordChange}
            onBlur={onPasswordBlur}
            autoComplete="new-password"
            error={passwordError}
          />
          <PasswordInput
            compact
            label="Confirm Password"
            placeholder="Confirm new password"
            value={values.confirmPassword}
            onChangeText={onConfirmPasswordChange}
            onBlur={onConfirmPasswordBlur}
            autoComplete="new-password"
            error={confirmPasswordError}
          />
          <AuthButton title="Submit" onPress={onSubmit} loading={loading} style={styles.activationSubmitButton} />
        </>
      )}
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
