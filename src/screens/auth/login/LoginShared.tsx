import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../../../theme/theme';
import {
  LoginFormValues,
  validateConfirmPassword,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
  validateStrongPassword,
} from '../../../utils/authValidation';
import { CreateAccountFormSection, ForgotPasswordModalSection, LoginFormSection } from './LoginFormSections';

const brandAsset = require('../../../../assets/blueAnt.png');
const missionLogoAsset = require('../../../../assets/Mission Logo.png');
const visionLogoAsset = require('../../../../assets/Vision Logo.png');

export type LoginScreenProps = {
  onLogin: (credentials: LoginFormValues) => Promise<void> | void;
  onCreateAccount: (credentials: { email: string; password: string; confirmPassword: string }) => Promise<void> | void;
  onForgotPassword: () => void;
  onForgotPasswordSubmit: (credentials: { email: string }) => Promise<void> | void;
  onHelp: () => void;
  onContact: () => void;
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
};

type LoginCardProps = Pick<LoginScreenProps, 'onLogin' | 'onCreateAccount' | 'loading' | 'errorMessage' | 'successMessage'> & {
  onForgotPasswordSubmit: LoginScreenProps['onForgotPasswordSubmit'];
  density?: 'default' | 'compact';
};

export function LoginCard({
  onLogin,
  onCreateAccount,
  onForgotPasswordSubmit,
  loading,
  errorMessage,
  successMessage,
  density = 'default',
}: LoginCardProps) {
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<'login' | 'createAccount'>('login');
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '', rememberMe: true });
  const [createAccountValues, setCreateAccountValues] = useState({ email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [createAccountTouched, setCreateAccountTouched] = useState({ email: false, password: false, confirmPassword: false });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [createAccountAttemptedSubmit, setCreateAccountAttemptedSubmit] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotTouched, setForgotTouched] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const { height } = useWindowDimensions();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const isCompact = height < 860;
  const isDense = density === 'compact';
  const emailError = (touched.email || attemptedSubmit) ? validateEmail(values.email) || undefined : undefined;
  const passwordError = (touched.password || attemptedSubmit) ? validatePassword(values.password) || undefined : undefined;
  const createAccountEmailError = (createAccountTouched.email || createAccountAttemptedSubmit) ? validateEmail(createAccountValues.email) || undefined : undefined;
  const createAccountPasswordError = (createAccountTouched.password || createAccountAttemptedSubmit) ? validateStrongPassword(createAccountValues.password) || undefined : undefined;
  const createAccountConfirmPasswordError = (createAccountTouched.confirmPassword || createAccountAttemptedSubmit) ? validateConfirmPassword(createAccountValues.password, createAccountValues.confirmPassword) || undefined : undefined;
  const forgotEmailError = forgotTouched ? validateEmail(forgotEmail) || undefined : undefined;

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    const nextErrors = validateLoginForm(values);
    if (nextErrors.email || nextErrors.password) return;
    await onLogin({ ...values, rememberMe: remember });
  };

  const handleCreateAccountSubmit = async () => {
    setCreateAccountAttemptedSubmit(true);
    const nextErrors = validateRegisterForm(createAccountValues);
    if (nextErrors.email || nextErrors.password || nextErrors.confirmPassword) return;
    await onCreateAccount(createAccountValues);
  };

  const handleForgotSubmit = async () => {
    setForgotTouched(true);
    if (validateEmail(forgotEmail)) return;
    setForgotLoading(true);
    try {
      await onForgotPasswordSubmit({ email: forgotEmail });
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View style={[styles.card, isCompact && styles.cardCompact, isDense && styles.cardDense]}>
      <View style={styles.topAccent}>
        <View style={[styles.topAccentSegment, styles.topAccentBlue]} />
        <View style={[styles.topAccentSegment, styles.topAccentPurple]} />
        <View style={[styles.topAccentSegment, styles.topAccentPink]} />
        <View style={[styles.topAccentSegment, styles.topAccentOrange]} />
      </View>

      <View style={[styles.panel, isDense && styles.panelDense]}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{mode === 'login' ? 'Login' : 'Activate Your Account'}</Text>
          <Text style={styles.sparkle}>{'\u2726'}</Text>
        </View>
      </View>

      <View style={[styles.scrollArea, isDense && styles.scrollAreaDense]}>
        {mode === 'login' ? (
          <LoginFormSection
            styles={styles}
            loading={loading}
            errorMessage={errorMessage}
            successMessage={successMessage}
            values={values}
            remember={remember}
            emailError={emailError}
            passwordError={passwordError}
            emailRef={emailRef}
            passwordRef={passwordRef}
            onEmailChange={(text) => setValues((current) => ({ ...current, email: text }))}
            onPasswordChange={(text) => setValues((current) => ({ ...current, password: text }))}
            onEmailBlur={() => setTouched((current) => ({ ...current, email: true }))}
            onPasswordBlur={() => setTouched((current) => ({ ...current, password: true }))}
            onRememberChange={setRemember}
            onForgotPassword={() => setForgotVisible(true)}
            onSubmit={handleSubmit}
            onSwitchToCreateAccount={() => setMode('createAccount')}
          />
        ) : (
          <CreateAccountFormSection
            styles={styles}
            loading={loading}
            errorMessage={errorMessage}
            values={createAccountValues}
            emailError={createAccountEmailError}
            passwordError={createAccountPasswordError}
            confirmPasswordError={createAccountConfirmPasswordError}
            onEmailChange={(text) => setCreateAccountValues((current) => ({ ...current, email: text }))}
            onPasswordChange={(text) => setCreateAccountValues((current) => ({ ...current, password: text }))}
            onConfirmPasswordChange={(text) => setCreateAccountValues((current) => ({ ...current, confirmPassword: text }))}
            onEmailBlur={() => setCreateAccountTouched((current) => ({ ...current, email: true }))}
            onPasswordBlur={() => setCreateAccountTouched((current) => ({ ...current, password: true }))}
            onConfirmPasswordBlur={() => setCreateAccountTouched((current) => ({ ...current, confirmPassword: true }))}
            onSubmit={handleCreateAccountSubmit}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </View>

      <ForgotPasswordModalSection
        styles={styles}
        visible={forgotVisible}
        sent={forgotSent}
        loading={forgotLoading}
        email={forgotEmail}
        emailError={forgotEmailError}
        onEmailChange={setForgotEmail}
        onEmailBlur={() => setForgotTouched(true)}
        onClose={() => {
          setForgotVisible(false);
          setForgotEmail('');
          setForgotTouched(false);
          setForgotSent(false);
          setForgotLoading(false);
        }}
        onSubmit={handleForgotSubmit}
      />
    </View>
  );
}

export function BrandLogo({ size }: { size: number }) {
  return <Image source={brandAsset} style={{ width: size, height: size }} resizeMode="contain" />;
}

export function LogoRow({ width = 180, height = 56 }: { width?: number; height?: number } = {}) {
  return (
    <View style={styles.logoRow}>
      <Image source={brandAsset} style={[styles.logoImage, { width, height }]} resizeMode="contain" />
    </View>
  );
}

export function FeatureCard({ title, description }: { title: string; description: string }) {
  const { width } = useWindowDimensions();
  const isUltraWide = width >= 1800;
  const isMission = title === 'Mission';
  const isVision = title === 'Vision';
  const featureCardStyle = [
    styles.featureCard,
    isUltraWide && styles.featureCardUltra,
    isMission && styles.featureCardMission,
    isVision && styles.featureCardVision,
  ];
  const iconStyle = [
    styles.featureIcon,
    isUltraWide && styles.featureIconUltra,
    isMission && styles.featureIconMission,
    isVision && styles.featureIconVision,
  ];
  const titleStyle = [styles.featureTitle, isUltraWide && styles.featureTitleUltra, isMission && styles.featureTitleMission, isVision && styles.featureTitleVision];
  const descStyle = [styles.featureDescription, isUltraWide && styles.featureDescriptionUltra, isMission && styles.featureDescriptionMission, isVision && styles.featureDescriptionVision];
  const gradientId = isMission ? 'mission-card-gradient' : isVision ? 'vision-card-gradient' : 'default-card-gradient';
  const gradientStops = isMission
    ? [
        <Stop key="0" offset="0%" stopColor="#92400E" />,
        <Stop key="1" offset="55%" stopColor="#D97706" />,
        <Stop key="2" offset="100%" stopColor="#FBBF24" />,
      ]
    : isVision
      ? [
          <Stop key="0" offset="0%" stopColor="#0F4C81" />,
          <Stop key="1" offset="52%" stopColor="#0891B2" />,
          <Stop key="2" offset="100%" stopColor="#38BDF8" />,
        ]
      : [
          <Stop key="0" offset="0%" stopColor="#3B82F6" />,
          <Stop key="1" offset="50%" stopColor="#7C6CF7" />,
          <Stop key="2" offset="100%" stopColor="#EC4899" />,
        ];

  return (
    <View style={featureCardStyle}>
      <View style={styles.featureTopAccent}>
        <Svg width="100%" height="100%" viewBox="0 0 100 5" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="5" rx="2.5" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
      <View style={styles.featureRow}>
        <View style={iconStyle}>
          {isMission ? (
            <Image source={missionLogoAsset} style={styles.featureLogo} resizeMode="contain" />
          ) : isVision ? (
            <Image source={visionLogoAsset} style={styles.featureLogo} resizeMode="contain" />
          ) : (
            <Text style={styles.featureIconText}>V</Text>
          )}
        </View>
        <View style={styles.featureCopy}>
          <Text style={titleStyle}>{title}</Text>
          <Text style={descStyle}>{description}</Text>
        </View>
      </View>
    </View>
  );
}

export type LoginSharedStyles = typeof styles;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.68)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#2563EB',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
    alignSelf: 'center',
  },
  cardCompact: { maxHeight: '100%' },
  cardDense: { paddingTop: 12, paddingBottom: 8, gap: 10 },
  topAccent: {
    height: 4,
    flexDirection: 'row',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginHorizontal: -16,
    marginTop: -14,
  },
  topAccentSegment: { flex: 1 },
  topAccentBlue: { backgroundColor: '#4C8DFF' },
  topAccentPurple: { backgroundColor: '#7C6CF7' },
  topAccentPink: { backgroundColor: '#EC4899' },
  topAccentOrange: { backgroundColor: '#FB923C' },
  panel: { gap: 12 },
  panelDense: { gap: 10 },
  scrollArea: { flexShrink: 1 },
  scrollAreaDense: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sparkle: { color: '#F59E0B', fontSize: 16, fontWeight: '900' },
  cardTitle: { color: theme.colors.text, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 },
  cardSubtitle: { color: theme.colors.muted, fontSize: 12, lineHeight: 17 },
  form: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  forgot: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  error: { color: theme.colors.error, fontWeight: '600', fontSize: 13 },
  success: { color: theme.colors.success, fontWeight: '700', fontSize: 13 },
  activateLink: { alignItems: 'center', gap: 6, paddingTop: 2 },
  activatePrompt: { color: theme.colors.muted, fontSize: 10, fontWeight: '500' },
  activateAction: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  secondaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.16)',
  },
  secondaryActionBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBadgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: '900' },
  buttonPressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  linkPressed: { opacity: 0.8 },
  logoRow: { alignItems: 'flex-start' },
  logoImage: { width: 180, height: 56 },
  featureCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(207,220,255,0.96)',
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  featureCardUltra: { borderRadius: 24, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 4 },
  featureCardMission: { backgroundColor: 'rgba(255, 248, 236, 0.96)', borderColor: 'rgba(214, 154, 58, 0.38)', shadowColor: '#92400E' },
  featureCardVision: { backgroundColor: 'rgba(246, 251, 255, 0.98)', borderColor: 'rgba(173, 223, 255, 0.96)', shadowColor: '#0EA5E9' },
  featureTopAccent: { height: 5, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.14)',
    flexShrink: 0,
  },
  featureIconUltra: { width: 44, height: 44, borderRadius: 14 },
  featureIconMission: { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.24)' },
  featureIconVision: { backgroundColor: 'rgba(8, 145, 178, 0.10)', borderColor: 'rgba(8, 145, 178, 0.18)' },
  featureLogo: { width: 32, height: 32 },
  featureIconText: { color: '#1D4ED8', fontSize: 16, fontWeight: '900' },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { color: '#13203A', fontSize: 14, fontWeight: '700', marginBottom: 3, letterSpacing: -0.3 },
  featureTitleUltra: { fontSize: 16, marginBottom: 4, letterSpacing: -0.45 },
  featureTitleMission: { color: '#9A3412' },
  featureTitleVision: { color: '#0F3D57' },
  featureDescription: { color: '#5E6E7F', fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0 },
  featureDescriptionUltra: { fontSize: 13, lineHeight: 19 },
  featureDescriptionMission: { color: '#9A3412' },
  featureDescriptionVision: { color: '#4B6472' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#2563EB',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  forgotSuccessBox: { gap: 12 },
  forgotSuccessTitle: { color: theme.colors.success, fontSize: 22, fontWeight: '800' },
});
