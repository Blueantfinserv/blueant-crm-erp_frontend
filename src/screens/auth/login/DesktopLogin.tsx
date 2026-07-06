import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BackgroundCurves } from '../../../components/BackgroundCurves';
import { LoginCard, LogoRow, LoginScreenProps } from './LoginShared';
import { theme } from '../../../theme/theme';

export function DesktopLogin(props: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const isLargeDesktop = width >= 1440;
  const isWideDesktop = width >= 1280;

  const logoWidth = Math.min(220, Math.max(176, width * 0.15));
  const logoHeight = Math.min(66, Math.max(54, height * 0.05));
  const mascotWidth = Math.min(isLargeDesktop ? 440 : 380, Math.max(420, width * 0.22));
  const mascotHeight = Math.min(isLargeDesktop ? 540 : 500, Math.max(450, height * 0.51));
  const mascotImageWidth = mascotWidth * 0.96;
  const mascotImageHeight = mascotHeight * 0.96;
  const cardWidth = Math.min(isLargeDesktop ? 520 : 480, Math.max(420, width * 0.32));
  const titleSize = isLargeDesktop ? 44 : isWideDesktop ? 40 : 38;
  const subtitleSize = isLargeDesktop ? 17 : 16;

  return (
    <View style={[styles.screen, isLargeDesktop && styles.screenLarge]}>
      <BackgroundCurves variant="desktop" />
      <View style={styles.header}>
        <LogoRow width={logoWidth} height={logoHeight} />
        <View style={styles.headerLinks}>
          <Text style={styles.headerLink}>Help</Text>
          <Text style={styles.headerLink}>Contact</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.left}>
          <View style={styles.brandCopy}>
            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Welcome!</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Login to access your workspace</Text>
          </View>

          <View style={styles.helperCopy}>
            <Text style={styles.helper}>BlueAnt ERP keeps your enterprise access simple and secure.</Text>
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

      <View style={styles.footer}>
        <Text style={styles.footerLink}>Privacy Policy</Text>
        <Text style={styles.footerLink}>Terms</Text>
        <Text style={styles.footerText}>{'\u00A9'} 2024 BlueAnt Finserv</Text>
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
  headerLinks: {
    flexDirection: 'row',
    gap: 20,
  },
  headerLink: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    zIndex: 1,
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
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
  helperCopy: {
    maxWidth: 420,
  },
  title: {
    color: theme.colors.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  helper: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 420,
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
