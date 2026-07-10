import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthProvider';
import { useAuth } from './src/context/AuthContext';
import { SplashScreen } from './src/screens/auth/SplashScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { CreateAccountScreen } from './src/screens/auth/CreateAccountScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/auth/ResetPasswordScreen';
import { theme } from './src/theme/theme';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LegalDocsScreen, type LegalPageKind } from './src/components/LegalPage';

type ScreenState =
  | 'splash'
  | 'login'
  | 'activateAccount'
  | 'forgotPassword'
  | 'resetPassword'
  | 'dashboard';

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const auth = useAuth();
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [message, setMessage] = useState<string | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPageKind | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, screen]);

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => setScreen('login'), 2400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [screen]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      setScreen('dashboard');
    }
  }, [auth.isAuthenticated]);

  const navigate = (next: ScreenState) => {
    setMessage(null);
    setScreen(next);
  };

  const openLegalPage = (next: LegalPageKind) => {
    setMessage(null);
    setLegalPage(next);
  };

  const runAction = async (action: () => Promise<unknown>, next?: ScreenState) => {
    setMessage(null);
    try {
      await action();
      if (next) {
        setScreen(next);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  const content = useMemo(() => {
    switch (screen) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return (
          <LoginScreen
            onLogin={() => runAction(() => auth.login())}
            onForgotPassword={() => navigate('forgotPassword')}
            onActivateAccount={() => navigate('activateAccount')}
            onHelp={() => openLegalPage('help')}
            onContact={() => openLegalPage('contact')}
            onPrivacyPolicy={() => openLegalPage('privacyPolicy')}
            onTerms={() => openLegalPage('terms')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            successMessage={auth.success}
          />
        );
      case 'activateAccount':
        return (
          <CreateAccountScreen
            onBack={() => navigate('login')}
            onCreateAccount={() => runAction(() => auth.activateAccount())}
            onLogin={() => navigate('login')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPasswordScreen
            onBack={() => navigate('login')}
            onSendResetLink={() => runAction(() => auth.forgotPassword(), 'resetPassword')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            onSuccess={() => navigate('login')}
          />
        );
      case 'resetPassword':
        return (
          <ResetPasswordScreen
            onBack={() => navigate('login')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            onUpdatePassword={() => runAction(() => auth.resetPassword(), 'login')}
          />
        );
      case 'dashboard':
        return (
          <DashboardScreen
            onLogout={() => runAction(() => auth.logout(), 'login')}
          />
        );
      default:
        return null;
    }
  }, [auth, message, screen]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.secondary} />
      <Animated.View style={[styles.animatedShell, { opacity: fade }]}>
        {content}
        <LegalDocsScreen
          kind={legalPage}
          onClose={() => setLegalPage(null)}
          onNavigate={(next) => setLegalPage(next)}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  animatedShell: {
    flex: 1,
  },
});
