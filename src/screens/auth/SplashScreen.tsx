import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Logo } from '../../components/Logo';
import { theme } from '../../theme/theme';

export function SplashScreen() {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.02, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.92, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Logo />
      </Animated.View>
      <Text style={styles.copy}>Enterprise operations, simplified.</Text>
      <View style={styles.loaderTrack}>
        <Animated.View style={styles.loaderFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  copy: { color: 'rgba(255,255,255,0.82)', fontSize: 15, fontWeight: '500' },
  loaderTrack: { width: 140, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  loaderFill: { width: '45%', height: '100%', borderRadius: 999, backgroundColor: theme.colors.primary },
});
