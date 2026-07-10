import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AuthButton } from '../../../components/AuthButton';
import { AuthInput } from '../../../components/AuthInput';
import { Checkbox } from '../../../components/Checkbox';
import { PasswordInput } from '../../../components/PasswordInput';
import { theme } from '../../../theme/theme';

const brandAsset = require('../../../../assets/blueAnt.png');
const missionLogoAsset = require('../../../../assets/Mission Logo.png');
const visionLogoAsset = require('../../../../assets/Vision Logo.png');

export type LoginScreenProps = {
  onLogin: () => void;
  onActivateAccount: () => void;
  onForgotPassword: () => void;
  onHelp: () => void;
  onContact: () => void;
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
};

type LoginCardProps = Pick<LoginScreenProps, 'onLogin' | 'onActivateAccount' | 'onForgotPassword' | 'loading' | 'errorMessage' | 'successMessage'>;

export function LoginCard({
  onLogin,
  onActivateAccount,
  onForgotPassword,
  loading,
  errorMessage,
  successMessage,
}: LoginCardProps) {
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const animation = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  useEffect(() => {
    Animated.timing(animation, {
      toValue: mode === 'login' ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animation, mode]);

  const animateModeChange = (nextMode: 'login' | 'activate') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(nextMode);
  };

  const loginOpacity = animation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const loginTranslate = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const activateOpacity = animation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const activateTranslate = animation.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  const isCompact = height < 860;

  return (
    <View style={[styles.card, isCompact && styles.cardCompact]}>
      <View style={styles.topAccent}>
        <View style={[styles.topAccentSegment, styles.topAccentBlue]} />
        <View style={[styles.topAccentSegment, styles.topAccentPurple]} />
        <View style={[styles.topAccentSegment, styles.topAccentPink]} />
        <View style={[styles.topAccentSegment, styles.topAccentOrange]} />
      </View>

      <Animated.View
        style={[
          styles.panel,
          mode === 'activate' && styles.panelCompact,
          {
            opacity: loginOpacity,
            transform: [{ translateX: loginTranslate }],
            display: mode === 'login' ? 'flex' : 'none',
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>Login</Text>
          <Text style={styles.sparkle}>{'\u2726'}</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          mode === 'activate' && styles.panelCompact,
          {
            opacity: activateOpacity,
            transform: [{ translateX: activateTranslate }],
            display: mode === 'activate' ? 'flex' : 'none',
          },
        ]}
      >
        <Text style={styles.cardTitle}>Activate Your Account</Text>
        <Text style={styles.cardSubtitle}>Complete your first-time account setup.</Text>
      </Animated.View>

      <View style={styles.scrollArea}>
        {mode === 'login' ? (
          <View style={styles.form}>
            {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
            <AuthInput label="Email / Mobile" labelBadge="👤" placeholder="Enter your email or mobile number" />
            <PasswordInput label="Password" placeholder="Enter password" />

            <View style={styles.row}>
              <Checkbox label="Remember me" value={remember} onValueChange={setRemember} />
              <Pressable onPress={onForgotPassword} hitSlop={10}>
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Pressable>
            </View>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <AuthButton title="Login" onPress={onLogin} loading={loading} />

            <Pressable onPress={() => animateModeChange('activate')} style={({ pressed }) => [styles.activateLink, pressed && styles.linkPressed]}>
              <Text style={styles.activatePrompt}>First time using BlueAnt ERP?</Text>
              <View style={styles.secondaryActionPill}>
                <View style={styles.secondaryActionBadge}>
                  <Text style={styles.secondaryActionBadgeText}>👤+</Text>
                </View>
                <Text style={styles.activateAction}>Sign In</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <AuthInput label="Email" labelBadge="✉" placeholder="Enter your registered email" keyboardType="email-address" autoCapitalize="none" />
            <PasswordInput label="Create Password" placeholder="Create password" />
            <PasswordInput label="Confirm Password" placeholder="Confirm password" />

            <AuthButton title="Activate Account" onPress={onActivateAccount} loading={loading} />

            <Pressable onPress={() => animateModeChange('login')} style={({ pressed }) => [styles.activateLink, pressed && styles.linkPressed]}>
              <Text style={styles.activatePrompt}>Already have an account?</Text>
              <Text style={styles.activateAction}>Login</Text>
            </Pressable>
          </View>
        )}
      </View>
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
  return (
    <View style={featureCardStyle}>
      <View style={styles.featureTopAccent}>
        <Svg width="100%" height="100%" viewBox="0 0 100 5" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              {isMission ? (
                <>
                  <Stop offset="0%" stopColor="#92400E" />
                  <Stop offset="55%" stopColor="#D97706" />
                  <Stop offset="100%" stopColor="#FBBF24" />
                </>
              ) : isVision ? (
                <>
                  <Stop offset="0%" stopColor="#0F4C81" />
                  <Stop offset="52%" stopColor="#0891B2" />
                  <Stop offset="100%" stopColor="#38BDF8" />
                </>
              ) : (
                <>
                  <Stop offset="0%" stopColor="#3B82F6" />
                  <Stop offset="50%" stopColor="#7C6CF7" />
                  <Stop offset="100%" stopColor="#EC4899" />
                </>
              )}
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
  cardCompact: {
    maxHeight: '100%',
  },
  topAccent: {
    height: 4,
    flexDirection: 'row',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginHorizontal: -16,
    marginTop: -14,
  },
  topAccentSegment: {
    flex: 1,
  },
  topAccentBlue: {
    backgroundColor: '#4C8DFF',
  },
  topAccentPurple: {
    backgroundColor: '#7C6CF7',
  },
  topAccentPink: {
    backgroundColor: '#EC4899',
  },
  topAccentOrange: {
    backgroundColor: '#FB923C',
  },
  panel: {
    gap: 12,
  },
  scrollArea: {
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '900',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  form: {
    gap: 8,
  },
  panelCompact: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  forgot: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 13,
  },
  success: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: 13,
  },
  activateLink: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  activatePrompt: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  activateAction: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
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
  secondaryActionBadgeText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  linkPressed: {
    opacity: 0.8,
  },
  logoRow: {
    alignItems: 'flex-start',
  },
  logoImage: {
    width: 180,
    height: 56,
  },
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
  featureCardUltra: {
    borderRadius: 24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  featureCardMission: {
    backgroundColor: 'rgba(255, 248, 236, 0.96)',
    borderColor: 'rgba(214, 154, 58, 0.38)',
    shadowColor: '#92400E',
  },
  featureCardVision: {
    backgroundColor: 'rgba(246, 251, 255, 0.98)',
    borderColor: 'rgba(173, 223, 255, 0.96)',
    shadowColor: '#0EA5E9',
  },
  featureTopAccent: {
    height: 5,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
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
  featureIconUltra: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  featureIconMission: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderColor: 'rgba(217, 119, 6, 0.24)',
  },
  featureIconVision: {
    backgroundColor: 'rgba(8, 145, 178, 0.10)',
    borderColor: 'rgba(8, 145, 178, 0.18)',
  },
  featureLogo: {
    width: 28,
    height: 28,
  },
  featureIconText: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '900',
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    color: '#13203A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  featureTitleUltra: {
    fontSize: 16,
    marginBottom: 4,
    letterSpacing: -0.45,
  },
  featureTitleMission: {
    color: '#9A3412',
  },
  featureTitleVision: {
    color: '#0F3D57',
  },
  featureDescription: {
    color: '#5E6E7F',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  featureDescriptionUltra: {
    fontSize: 13,
    lineHeight: 19,
  },
  featureDescriptionMission: {
    color: '#9A3412',
  },
  featureDescriptionVision: {
    color: '#4B6472',
  },
});
