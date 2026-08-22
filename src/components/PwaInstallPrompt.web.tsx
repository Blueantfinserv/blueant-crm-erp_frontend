import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const DISMISSED_AT_KEY = 'blueant.pwaInstallDismissedAt';
const INSTALLED_KEY = 'blueant.pwaInstalled';
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const isStandalone = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || Boolean((window.navigator as NavigatorWithStandalone).standalone)
);

const isIosSafari = () => {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAlternativeIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && /Safari/.test(userAgent) && !isAlternativeIosBrowser;
};

const isAndroid = () => /Android/i.test(window.navigator.userAgent);

const getPublicBaseUrl = () => {
  const expoScript = Array.from(document.scripts).find((script) => script.src.includes('/_expo/'));
  if (expoScript) return new URL(`${expoScript.src.split('/_expo/')[0]}/`);
  return new URL('./', document.baseURI);
};

const wasRecentlyDismissed = () => {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY));
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISSAL_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const storeDismissal = () => {
  try {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in private/restricted browsing contexts.
  }
};

const storeInstalled = () => {
  try {
    window.localStorage.setItem(INSTALLED_KEY, 'true');
    window.localStorage.removeItem(DISMISSED_AT_KEY);
  } catch {
    // Standalone detection remains the authoritative fallback.
  }
};

const wasInstalled = () => {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === 'true';
  } catch {
    return false;
  }
};

const ensurePwaDocumentMetadata = () => {
  const publicBaseUrl = getPublicBaseUrl();
  const publicUrl = (fileName: string) => new URL(fileName, publicBaseUrl).toString();
  let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifest) {
    manifest = document.createElement('link');
    manifest.rel = 'manifest';
    document.head.appendChild(manifest);
  }
  manifest.href = publicUrl('manifest.webmanifest');

  const metaValues = [
    ['theme-color', '#2563EB'],
    ['apple-mobile-web-app-capable', 'yes'],
    ['apple-mobile-web-app-status-bar-style', 'default'],
    ['apple-mobile-web-app-title', 'BlueAnt ERP'],
  ];
  metaValues.forEach(([name, content]) => {
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  });

  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = publicUrl('pwa-icon-192.png');
    document.head.appendChild(appleIcon);
  }
};

export function PwaInstallPrompt() {
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const androidPromptTimerRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);

  useEffect(() => {
    ensurePwaDocumentMetadata();

    if ('serviceWorker' in navigator) {
      const scopeUrl = getPublicBaseUrl();
      const serviceWorkerUrl = new URL('service-worker.js', scopeUrl);
      void navigator.serviceWorker.register(serviceWorkerUrl.toString(), { scope: scopeUrl.pathname }).catch(() => {
        // An unavailable service worker simply makes the site non-installable.
      });
    }

    if (isStandalone() || wasInstalled()) return undefined;

    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      installEventRef.current = installEvent;
      if (isAndroid() && !wasRecentlyDismissed()) {
        if (androidPromptTimerRef.current !== null) window.clearTimeout(androidPromptTimerRef.current);
        androidPromptTimerRef.current = window.setTimeout(() => {
          setIosInstructions(false);
          setVisible(true);
        }, 2500);
      }
    };
    const onAppInstalled = () => {
      installEventRef.current = null;
      if (androidPromptTimerRef.current !== null) {
        window.clearTimeout(androidPromptTimerRef.current);
        androidPromptTimerRef.current = null;
      }
      storeInstalled();
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const iosTimer = isIosSafari() && !wasRecentlyDismissed()
      ? window.setTimeout(() => {
          setIosInstructions(true);
          setVisible(true);
        }, 2500)
      : undefined;

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (androidPromptTimerRef.current !== null) window.clearTimeout(androidPromptTimerRef.current);
      if (iosTimer !== undefined) window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    storeDismissal();
    setVisible(false);
  };

  const install = async () => {
    const installEvent = installEventRef.current;
    if (!installEvent) return;
    installEventRef.current = null;
    setVisible(false);
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'dismissed') storeDismissal();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>BA</Text>
          </View>
          <Text style={styles.title}>Install BlueAnt ERP</Text>
          <Text style={styles.message}>
            {iosInstructions
              ? 'Install BlueAnt ERP on your Home Screen for faster access.'
              : 'Install BlueAnt ERP for faster, app-like access from your device.'}
          </Text>
          {iosInstructions ? (
            <View style={styles.instructionBox}>
              <Text style={styles.instructionStep}>1. Tap the Share button in Safari.</Text>
              <Text style={styles.instructionStep}>2. Select “Add to Home Screen”.</Text>
              <Text style={styles.instructionStep}>3. Tap “Add” to confirm.</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={dismiss} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>Not Now</Text>
            </Pressable>
            {iosInstructions ? (
              <Pressable accessibilityRole="button" onPress={dismiss} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>Got It</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => void install()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>Install</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  card: {
    width: 390,
    maxWidth: '100%',
    alignItems: 'center',
    padding: 22,
    borderWidth: 1,
    borderColor: '#D7E2F2',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#EAF1FF',
  },
  icon: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    marginTop: 14,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionBox: {
    width: '100%',
    gap: 7,
    marginTop: 16,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F2F6FF',
  },
  instructionStep: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  secondaryButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9D7EB',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
  },
  secondaryText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
});
