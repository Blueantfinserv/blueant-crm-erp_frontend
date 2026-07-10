import { Image, View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { BackgroundCurves } from '../../../components/BackgroundCurves';
import { LoginCard, LogoRow, LoginScreenProps } from './LoginShared';
import { FooterLink } from '../../../components/LegalPage';

export function MobileLogin(props: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const currentYear = new Date().getFullYear();
  const mascotWidth = Math.min(286, Math.max(232, width * 0.69));
  const mascotHeight = Math.min(258, Math.max(208, height * 0.275));
  const mascotScale = width < 375 ? 1.16 : width < 410 ? 1.18 : 1.2;
  const logoWidth = Math.min(188, Math.max(160, width * 0.46));
  const logoHeight = Math.min(58, Math.max(50, height * 0.064));
  const footerFontSize = width < 375 ? 11 : 12;

  return (
    <View style={styles.screen}>
      <BackgroundCurves variant="mobile" />

      <View style={styles.top}>
        <LogoRow width={logoWidth} height={logoHeight} />
        <View style={[styles.mascotStage, { width: mascotWidth, height: mascotHeight }]}>
          <Image
            source={require('../../../../assets/download.gif')}
            style={[styles.gifSlot, { transform: [{ scale: mascotScale }] }]}
            resizeMode="contain"
          />
        </View>
      </View>

      <LoginCard {...props} />

      <View style={styles.footer}>
        <View style={styles.footerLinks}>
          <FooterLink label="Help" onPress={props.onHelp} />
          <FooterLink label="Contact" onPress={props.onContact} />
          <FooterLink label="Privacy Policy" onPress={props.onPrivacyPolicy} />
          <FooterLink label="Terms" onPress={props.onTerms} />
        </View>
        <Text style={[styles.footerSubtext, { fontSize: footerFontSize }]}>{'\u00A9'} {currentYear} BlueAnt Finserv</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#F8FAFF',
    gap: 6,
    overflow: 'hidden',
  },
  top: {
    alignItems: 'center',
    gap: 0,
    flexShrink: 0,
  },
  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: 'transparent',
  },
  gifSlot: {
    width: '100%',
    height: '100%',
  },
  footer: {
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  footerText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  footerSubtext: {
    color: '#75829D',
    fontSize: 12,
    fontWeight: '500',
  },
});
