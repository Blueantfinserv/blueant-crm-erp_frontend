import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  variant: 'mobile' | 'tablet' | 'desktop';
};

export function BackgroundCurves({ variant }: Props) {
  if (variant === 'mobile') {
    return (
      <View pointerEvents="none" style={styles.layer}>
        <View style={[styles.blob, styles.mobileBlobTop]} />
        <View style={[styles.blobShade, styles.mobileBlobTopShade]} />
        <View style={[styles.blobShadeDark, styles.mobileBlobTopShadeDark]} />
        <View style={[styles.wave, styles.mobileWaveLeft]} />
        <View style={[styles.waveShade, styles.mobileWaveLeftShade]} />
        <View style={[styles.waveShadeDark, styles.mobileWaveLeftShadeDark]} />
        <View style={[styles.wave, styles.mobileWaveRight]} />
        <View style={[styles.waveShade, styles.mobileWaveRightShade]} />
        <View style={[styles.waveShadeDark, styles.mobileWaveRightShadeDark]} />
        <View style={[styles.ringBlob, styles.mobileRingBlob]} />
        <View style={[styles.ringBlobShade, styles.mobileRingBlobShade]} />
        <View style={[styles.ringBlobShadeDark, styles.mobileRingBlobShadeDark]} />
        <View style={[styles.dots, styles.mobileDotsLeft]} />
        <View style={[styles.dots, styles.mobileDotsRight]} />
        <View style={[styles.curve, styles.mobileCurve]} />
      </View>
    );
  }

  if (variant === 'tablet') {
    return (
      <View pointerEvents="none" style={styles.layer}>
        <View style={[styles.blob, styles.tabletBlobTop]} />
        <View style={[styles.blobShade, styles.tabletBlobTopShade]} />
        <View style={[styles.blobShadeDark, styles.tabletBlobTopShadeDark]} />
        <View style={[styles.wave, styles.tabletWaveLeft]} />
        <View style={[styles.waveShade, styles.tabletWaveLeftShade]} />
        <View style={[styles.waveShadeDark, styles.tabletWaveLeftShadeDark]} />
        <View style={[styles.wave, styles.tabletWaveRight]} />
        <View style={[styles.waveShade, styles.tabletWaveRightShade]} />
        <View style={[styles.waveShadeDark, styles.tabletWaveRightShadeDark]} />
        <View style={[styles.ringBlob, styles.tabletRingBlob]} />
        <View style={[styles.dots, styles.tabletDotsLeft]} />
        <View style={[styles.dots, styles.tabletDotsRight]} />
        <View style={[styles.curve, styles.tabletCurveA]} />
        <View style={[styles.curve, styles.tabletCurveB]} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={[styles.blob, styles.desktopBlobTop]} />
      <View style={[styles.blobShade, styles.desktopBlobTopShade]} />
      <View style={[styles.blobShadeDark, styles.desktopBlobTopShadeDark]} />
      <View style={[styles.wave, styles.desktopWaveLeft]} />
      <View style={[styles.waveShade, styles.desktopWaveLeftShade]} />
      <View style={[styles.waveShadeDark, styles.desktopWaveLeftShadeDark]} />
      <View style={[styles.wave, styles.desktopWaveRight]} />
      <View style={[styles.waveShade, styles.desktopWaveRightShade]} />
      <View style={[styles.waveShadeDark, styles.desktopWaveRightShadeDark]} />
      <View style={[styles.ringBlob, styles.desktopRingBlob]} />
      <View style={[styles.dots, styles.desktopDotsLeft]} />
      <View style={[styles.dots, styles.desktopDotsRight]} />
      <View style={[styles.curve, styles.desktopCurveA]} />
      <View style={[styles.curve, styles.desktopCurveB]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#F8FAFF',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
  },
  blobShade: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.22,
  },
  blobShadeDark: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.18,
  },
  wave: {
    position: 'absolute',
    borderRadius: 9999,
  },
  waveShade: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.24,
  },
  waveShadeDark: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.16,
  },
  ringBlob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.18,
  },
  ringBlobShade: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.14,
  },
  ringBlobShadeDark: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.1,
  },
  dots: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  mobileBlobTop: {
    width: 180,
    height: 180,
    top: -72,
    left: -84,
    backgroundColor: 'rgba(96, 165, 250, 0.28)',
    opacity: 1,
  },
  mobileBlobTopShade: {
    width: 130,
    height: 130,
    top: -44,
    left: -58,
    backgroundColor: 'rgba(37, 99, 235, 0.72)',
  },
  mobileBlobTopShadeDark: {
    width: 92,
    height: 92,
    top: -28,
    left: -34,
    backgroundColor: 'rgba(29, 78, 216, 0.82)',
  },
  mobileWaveLeft: {
  width: 290,
  height: 680,
  bottom: -280,
  left: -206,
  backgroundColor: 'rgba(79, 70, 229, 0.20)',
  borderTopLeftRadius: 160,
  borderTopRightRadius: 120,
  borderBottomRightRadius: 320,
  borderBottomLeftRadius: 170,
  transform: [{ rotate: '14deg' }],
},
mobileWaveLeftShade: {
  width: 270,
  height: 630,
  bottom: -280,
  left: -206,
  backgroundColor: 'rgb(78, 70, 229)',
  borderTopLeftRadius: 140,
  borderTopRightRadius: 300,
  borderBottomRightRadius: 30,
  borderBottomLeftRadius: 170,
  transform: [{ rotate: '17deg' }],
},
mobileWaveLeftShadeDark: {
  width: 190,
  height: 460,
  bottom: -220,
  left: -178,
  backgroundColor: 'rgba(30, 41, 59, 0.88)',
  borderTopLeftRadius: 110,
  borderTopRightRadius: 260,
  borderBottomRightRadius: 20,
  borderBottomLeftRadius: 150,
  transform: [{ rotate: '19deg' }],
},

mobileWaveRight: {
  width: 310,
  height: 250,
  bottom: -118,
  right: -95,
  backgroundColor: 'rgba(251, 113, 133, 0.20)',
  borderTopLeftRadius: 210,
  borderTopRightRadius: 120,
  borderBottomRightRadius: 230,
  borderBottomLeftRadius: 90,
  transform: [{ rotate: '-24deg' }],
},
mobileWaveRightShade: {
  width: 240,
  height: 180,
  bottom: -76,
  right: -112,
  backgroundColor: 'rgba(234, 88, 12, 0.70)',
  transform: [{ rotate: '-22deg' }],
},
mobileWaveRightShadeDark: {
  width: 186,
  height: 140,
  bottom: -58,
  right: -92,
  backgroundColor: 'rgba(120, 53, 15, 0.88)',
  borderTopLeftRadius: 150,
  borderTopRightRadius: 90,
  borderBottomRightRadius: 170,
  borderBottomLeftRadius: 60,
  transform: [{ rotate: '-20deg' }],
},
  mobileRingBlob: {
    width: 110,
    height: 180,
    top: 86,
    right: -40,
    backgroundColor: 'rgba(236, 72, 228, 0.24)',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 150,
    borderBottomRightRadius: 110,
    borderBottomLeftRadius: 60,
    transform: [{ rotate: '10deg' }],
  },
  mobileRingBlobShade: {
    width: 84,
    height: 140,
    top: 112,
    right: -30,
    backgroundColor: 'rgba(219, 39, 192, 0.78)',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 120,
    borderBottomRightRadius: 90,
    borderBottomLeftRadius: 50,
    transform: [{ rotate: '12deg' }],
  },
  mobileRingBlobShadeDark: {
    width: 58,
    height: 96,
    top: 138,
    right: -30,
    backgroundColor: 'rgba(190, 24, 165, 0.9)',
    borderTopLeftRadius: 42,
    borderTopRightRadius: 80,
    borderBottomRightRadius: 64,
    borderBottomLeftRadius: 36,
    transform: [{ rotate: '14deg' }],
  },
  mobileDotsLeft: {
    width: 58,
    height: 92,
    left: 20,
    top: 126,
    borderWidth: 0,
    borderRadius: 0,
    borderStyle: 'dotted',
    borderColor: 'rgba(191, 219, 254, 0.55)',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    opacity: 1,
  },
  mobileDotsRight: {
    width: 58,
    height: 92,
    right: 20,
    top: 392,
    borderWidth: 0,
    borderRadius: 0,
    borderStyle: 'dotted',
    borderColor: 'rgba(191, 219, 254, 0.45)',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    opacity: 1,
  },
  tabletBlobTop: {
    width: 280,
    height: 280,
    top: -116,
    left: -120,
    backgroundColor: 'rgba(96, 165, 250, 0.26)',
    opacity: 1,
  },
  tabletBlobTopShade: {
    width: 200,
    height: 200,
    top: -84,
    left: -82,
    backgroundColor: 'rgba(37, 99, 235, 0.72)',
  },
  tabletBlobTopShadeDark: {
    width: 142,
    height: 142,
    top: -58,
    left: -52,
    backgroundColor: 'rgba(29, 78, 216, 0.82)',
  },
  tabletWaveLeft: {
    width: 620,
    height: 320,
    bottom: -190,
    left: -160,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    transform: [{ rotate: '16deg' }],
    opacity: 1,
  },
  tabletWaveLeftShade: {
    width: 360,
    height: 240,
    bottom: -118,
    left: -126,
    backgroundColor: 'rgba(49, 46, 129, 0.72)',
    transform: [{ rotate: '14deg' }],
  },
  tabletWaveLeftShadeDark: {
    width: 300,
    height: 180,
    bottom: -88,
    left: -98,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    borderTopLeftRadius: 140,
    borderTopRightRadius: 240,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 130,
    transform: [{ rotate: '16deg' }],
  },
  tabletWaveRight: {
    width: 370,
    height: 660,
    bottom: -150,
    right: -118,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    transform: [{ rotate: '-17deg' }],
    opacity: 1,
  },
  tabletWaveRightShade: {
    width: 280,
    height: 540,
    bottom: -94,
    right: -92,
    backgroundColor: 'rgba(234, 88, 12, 0.68)',
    transform: [{ rotate: '-15deg' }],
  },
  tabletWaveRightShadeDark: {
    width: 170,
    height: 380,
    bottom: -72,
    right: -68,
    backgroundColor: 'rgba(120, 53, 15, 0.88)',
    borderTopLeftRadius: 160,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 180,
    borderBottomLeftRadius: 60,
    transform: [{ rotate: '-13deg' }],
  },
  tabletRingBlob: {
    width: 160,
    height: 220,
    top: 44,
    right: -40,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderTopLeftRadius: 90,
    borderTopRightRadius: 160,
    borderBottomRightRadius: 120,
    borderBottomLeftRadius: 70,
    transform: [{ rotate: '8deg' }],
  },
  tabletDotsLeft: {
    width: 68,
    height: 104,
    left: 24,
    top: 150,
    opacity: 1,
  },
  tabletDotsRight: {
    width: 68,
    height: 104,
    right: 24,
    top: 470,
    opacity: 1,
  },
  desktopBlobTop: {
    width: 340,
    height: 340,
    top: -132,
    left: -150,
    backgroundColor: 'rgba(96, 165, 250, 0.24)',
    opacity: 1,
  },
  desktopBlobTopShade: {
    width: 240,
    height: 240,
    top: -92,
    left: -100,
    backgroundColor: 'rgba(37, 99, 235, 0.72)',
  },
  desktopBlobTopShadeDark: {
    width: 170,
    height: 170,
    top: -64,
    left: -70,
    backgroundColor: 'rgba(29, 78, 216, 0.82)',
  },
  desktopWaveLeft: {
    width: 920,
    height: 390,
    bottom: -260,
    left: -240,
    backgroundColor: 'rgba(99, 102, 241, 0.20)',
    transform: [{ rotate: '15deg' }],
    opacity: 1,
  },
  desktopWaveLeftShade: {
    width: 520,
    height: 320,
    bottom: -176,
    left: -170,
    backgroundColor: 'rgba(49, 46, 129, 0.72)',
    transform: [{ rotate: '13deg' }],
  },
  desktopWaveLeftShadeDark: {
    width: 420,
    height: 200,
    bottom: -132,
    left: -126,
    backgroundColor: 'rgba(2, 56, 142, 0.88)',
    borderTopLeftRadius: 180,
    borderTopRightRadius: 300,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 150,
    transform: [{ rotate: '15deg' }],
  },
  desktopWaveRight: {
    width: 560,
    height: 780,
    bottom: -230,
    right: -220,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    transform: [{ rotate: '-16deg' }],
    opacity: 1,
  },
  desktopWaveRightShade: {
    width: 440,
    height: 580,
    bottom: -138,
    right: -150,
    backgroundColor: 'rgba(234, 88, 12, 0.68)',
    transform: [{ rotate: '-14deg' }],
  },
  desktopWaveRightShadeDark: {
    width: 340,
    height: 350,
    bottom: -104,
    right: -104,
    backgroundColor: 'rgba(120, 53, 15, 0.88)',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 120,
    borderBottomRightRadius: 220,
    borderBottomLeftRadius: 70,
    transform: [{ rotate: '-12deg' }],
  },
  desktopRingBlob: {
    width: 220,
    height: 300,
    top: 34,
    right: -70,
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 190,
    borderBottomRightRadius: 140,
    borderBottomLeftRadius: 80,
    transform: [{ rotate: '7deg' }],
  },
  desktopDotsLeft: {
    width: 82,
    height: 122,
    left: 34,
    top: 184,
    opacity: 1,
  },
  desktopDotsRight: {
    width: 82,
    height: 122,
    right: 40,
    top: 560,
    opacity: 1,
  },
  curve: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(215, 232, 255, 0.36)',
  },
  mobileCurve: {
    width: 420,
    height: 210,
    top: 42,
    right: -176,
    transform: [{ rotate: '-28deg' }],
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    opacity: 0.26,
  },
  tabletCurveA: {
    width: 1020,
    height: 360,
    top: -10,
    right: -360,
    transform: [{ rotate: '-28deg' }],
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    opacity: 0.36,
  },
  tabletCurveB: {
    width: 1000,
    height: 350,
    bottom: -150,
    left: -360,
    transform: [{ rotate: '-28deg' }],
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    opacity: 0.24,
  },
  desktopCurveA: {
    width: 1380,
    height: 520,
    top: -50,
    right: -540,
    transform: [{ rotate: '-27deg' }],
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    opacity: 0.38,
  },
  desktopCurveB: {
    width: 1340,
    height: 510,
    bottom: -200,
    left: -560,
    transform: [{ rotate: '-27deg' }],
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    opacity: 0.28,
  },
});
