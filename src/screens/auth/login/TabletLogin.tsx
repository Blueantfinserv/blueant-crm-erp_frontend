import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BackgroundCurves } from '../../../components/BackgroundCurves';
import { FeatureCard, LoginCard, LogoRow, LoginScreenProps } from './LoginShared';
import { theme } from '../../../theme/theme';
import { FooterLink } from '../../../components/LegalPage';

const mascotAsset = require('../../../../assets/download.gif');

export function TabletLogin(props: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const currentYear = new Date().getFullYear();
  const isLargeTablet = width >= 900;

  const logoWidth = Math.min(190, Math.max(160, width * 0.195));
  const logoHeight = Math.min(56, Math.max(46, height * 0.052));
  const cardWidth = Math.min(isLargeTablet ? 360 : 340, Math.max(300, width * 0.34));
  const titleSize = isLargeTablet ? 30 : 27;
  const mascotWidth = Math.min(170, Math.max(140, width * 0.165));
  const mascotHeight = Math.min(220, Math.max(180, height * 0.31));

  return (
    <View style={styles.screen}>
      <BackgroundCurves variant="tablet" />

      <View style={styles.header}>
        <LogoRow width={logoWidth} height={logoHeight} />
      </View>

      <View style={styles.body}>
        <View style={styles.left}>
          <View style={styles.copyBlock}>
            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Welcome!</Text>
          </View>

          <View style={styles.infoCards}>
            <FeatureCard
              title="Mission"
              description="Empowering through knowledge"
            />
            <FeatureCard
              title="Vision"
              description="Committed to your long-term success"
            />
          </View>
        </View>

        <View style={[styles.mascotWrap, { width: mascotWidth, height: mascotHeight }]}>
          <Image source={mascotAsset} style={styles.mascot} resizeMode="contain" />
        </View>

        <View style={[styles.right, { width: cardWidth, maxWidth: cardWidth }]}>
          <LoginCard {...props} density="compact" />
        </View>
      </View>

      <View style={styles.footer}>
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
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
    justifyContent: 'space-between',
    gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
    flexShrink: 0,
  },

  body: {
    flex: 1,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 0,
  },

  left: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    top: -2,
  },

  copyBlock: {
    width: '100%',
    gap: 4,
    top: -12,
  },
  infoCards: {
    width: '100%',
    maxWidth: 270,
    gap: 7,
    top: -10,
  },

  mascotWrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  mascot: {
    width: '100%',
    height: '100%',
  },

  title: {
    color: theme.colors.text,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  right: {
    flexShrink: 0,
    alignSelf: 'center',
  },

  footer: {
    zIndex: 1,
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },

  footerLink: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  footerText: {
    color: theme.colors.subtle,
    fontSize: 12,
  },
});
