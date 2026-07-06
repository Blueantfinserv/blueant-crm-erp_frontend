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
import { AuthButton } from '../../../components/AuthButton';
import { AuthInput } from '../../../components/AuthInput';
import { Checkbox } from '../../../components/Checkbox';
import { PasswordInput } from '../../../components/PasswordInput';
import { theme } from '../../../theme/theme';

const brandAsset = require('../../../../assets/blueAnt.png');

export type LoginScreenProps = {
  onLogin: () => void;
  onActivateAccount: () => void;
  onForgotPassword: () => void;
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
                <Text style={styles.activateAction}>Activate Account</Text>
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
              <Text style={styles.activateAction}>Sign In</Text>
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
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon} />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.68)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#2563EB',
    shadowOpacity: 0.18,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
    alignSelf: 'center',
  },
  cardCompact: {
    maxHeight: '100%',
  },
  topAccent: {
    height: 5,
    flexDirection: 'row',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    marginHorizontal: -18,
    marginTop: -16,
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
    gap: 14,
  },
  scrollArea: {
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkle: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: '900',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  cardSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    gap: 10,
  },
  panelCompact: {
    gap: 14,
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
    fontSize: 11,
    fontWeight: '500',
  },
  activateAction: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.16)',
  },
  secondaryActionBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
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
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    borderRadius: 20,
    padding: 12,
    gap: 7,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  featureTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  featureDescription: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
