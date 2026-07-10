import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BackgroundCurves } from '../../../components/BackgroundCurves';
import { FeatureCard, LoginCard, LogoRow, LoginScreenProps } from './LoginShared';
import { theme } from '../../../theme/theme';
import { FooterLink } from '../../../components/LegalPage';

export function DesktopLogin(props: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const currentYear = new Date().getFullYear();
  const isUltraWide = width >= 1800;
  const isLargeDesktop = width >= 1440;
  const isWideDesktop = width >= 1280;

  const logoWidth = isUltraWide ? Math.min(360, Math.max(240, width * 0.20)) : Math.min(250, Math.max(188, width * 0.17));
  const logoHeight = isUltraWide ? Math.min(108, Math.max(74, height * 0.078)) : Math.min(74, Math.max(58, height * 0.05));
  const mascotWidth = isUltraWide ? Math.min(760, Math.max(580, width * 0.33)) : Math.min(isLargeDesktop ? 440 : 380, Math.max(420, width * 0.22));
  const mascotHeight = isUltraWide ? Math.min(860, Math.max(700, height * 0.72)) : Math.min(isLargeDesktop ? 540 : 500, Math.max(450, height * 0.51));
  const mascotImageWidth = mascotWidth * 0.96;
  const mascotImageHeight = mascotHeight * 0.96;
  const cardWidth = isUltraWide ? Math.min(820, Math.max(560, width * 0.44)) : Math.min(isLargeDesktop ? 520 : 480, Math.max(420, width * 0.32));
  const titleSize = isUltraWide ? 68 : isLargeDesktop ? 44 : isWideDesktop ? 40 : 38;

  return (
    <View style={[styles.screen, isLargeDesktop && styles.screenLarge]}>
      <BackgroundCurves variant="desktop" />
      <View style={styles.header}>
        <LogoRow width={logoWidth} height={logoHeight} />
      </View>

      <View style={[styles.body, isUltraWide && styles.bodyUltra]}>
        <View style={[styles.left, isUltraWide && styles.leftUltra]}>
          <View style={styles.brandCopy}>
            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Welcome!</Text>
          </View>

          <View style={[styles.infoCards, isUltraWide && styles.infoCardsUltra]}>
            <FeatureCard title="Mission" description="Empowering through knowledge" />
            <FeatureCard title="Vision" description="Committed to your long-term success" />
          </View>
        </View>

        <View style={[styles.centerMascot, { width: mascotWidth, height: mascotHeight }]}>
          <Image
            source={require('../../../../assets/download.gif')}
            style={[styles.mascotGif, { width: mascotImageWidth, height: mascotImageHeight }]}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.right, { width: cardWidth, maxWidth: cardWidth }]}>
          <LoginCard {...props} />
        </View>
      </View>

      <View style={[styles.footer, isUltraWide && styles.footerUltra]}>
        <FooterLink label="Help" onPress={props.onHelp} />
        <FooterLink label="Contact" onPress={props.onContact} />
        <FooterLink label="Privacy Policy" onPress={props.onPrivacyPolicy} />
        <FooterLink label="Terms" onPress={props.onTerms} />
        <Text style={styles.footerText}>{'\u00A9'} {currentYear} BlueAnt Finserv</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 36,
    paddingVertical: 24,
    backgroundColor: '#EDF4FF',
    justifyContent: 'space-between',
    gap: 18,
    position: 'relative',
  },
  screenLarge: {
    paddingHorizontal: 44,
    paddingVertical: 28,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    zIndex: 1,
  },
  bodyUltra: {
    gap: 68,
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    transform: [{ translateY: -10 }],
  },
  leftUltra: {
    transform: [{ translateY: -22 }],
  },
  centerMascot: {
    paddingVertical: 10,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mascotGif: {
    overflow: 'visible',
  },
  brandCopy: {
    gap: 8,
    marginTop: 10,
  },
  infoCards: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  infoCardsUltra: {
    maxWidth: 760,
    gap: 24,
  },
  title: {
    color: theme.colors.text,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  right: {
    width: 480,
    maxWidth: 480,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  footerUltra: {
    gap: 42,
  },
  footerLink: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  footerText: {
    color: theme.colors.subtle,
    fontSize: 13,
  },
});
