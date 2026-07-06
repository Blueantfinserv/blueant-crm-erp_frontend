import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BackgroundCurves } from '../../../components/BackgroundCurves';
import { LoginCard, LogoRow, LoginScreenProps } from './LoginShared';
import { theme } from '../../../theme/theme';

export function TabletLogin(props: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const isLargeTablet = width >= 900;

  const logoWidth = Math.min(208, Math.max(168, width * 0.22));
  const logoHeight = Math.min(62, Math.max(52, height * 0.06));
  const mascotWidth = Math.min(isLargeTablet ? 320 : 280, Math.max(240, width * 0.34));
  const mascotHeight = Math.min(isLargeTablet ? 420 : 360, Math.max(300, height * 0.42));
  const mascotImageWidth = mascotWidth + (isLargeTablet ? 30 : 22);
  const mascotImageHeight = mascotHeight + (isLargeTablet ? 36 : 28);
  const cardWidth = Math.min(isLargeTablet ? 440 : 400, Math.max(360, width * 0.42));
  const titleSize = isLargeTablet ? 34 : 30;
  const subtitleSize = isLargeTablet ? 16 : 14;

  return (
    <View style={styles.screen}>
      <BackgroundCurves variant="tablet" />

      <View style={styles.header}>
        <LogoRow width={logoWidth} height={logoHeight} />
        <View style={styles.headerLinks}>
          <Text style={styles.headerLink}>Help</Text>
          <Text style={styles.headerLink}>Contact</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.left}>
          <View style={styles.copyBlock}>
            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Welcome!</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Login to access your workspace</Text>
          </View>

          <View style={[styles.mascotStage, { width: mascotWidth, height: mascotHeight }]}>
            <Image
              source={require('../../../../assets/download.gif')}
              style={[styles.mascotGif, { width: mascotImageWidth, height: mascotImageHeight }]}
              resizeMode="contain"
            />
          </View>
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

  headerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  headerLink: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  body: {
    flex: 1,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    minHeight: 0,
  },

  left: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },

  copyBlock: {
    width: '100%',
    gap: 5,
    top: -65,
  },

  title: {
    color: theme.colors.text,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    color: theme.colors.muted,
    fontWeight: '500',
  },

  helper: {
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
  },

  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    overflow: 'visible',
    top: -65,
    left: 10,
  },

  mascotGif: {
    overflow: 'visible',
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
