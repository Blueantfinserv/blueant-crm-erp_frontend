import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { Logo } from '../../components/Logo';
import { theme } from '../../theme/theme';

type Props = {
  onLogin: () => void;
  onCreateAccount: () => void;
  onGuest: () => void;
  showGuestOption: boolean;
  version: string;
};
export function WelcomeScreen({ onLogin, onCreateAccount, onGuest, showGuestOption, version }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Logo />
        <Text style={styles.title}>Welcome to Blueant ERP</Text>
        <Text style={styles.desc}>Manage operations, teams, and workflows with a clean enterprise experience built for speed.</Text>
      </View>
      <View style={styles.actions}>
        <AuthButton title="Login" onPress={onLogin} />
        <AuthButton title="Activate Account" onPress={onCreateAccount} variant="secondary" />
        {showGuestOption ? <AuthButton title="Continue as Guest" onPress={onGuest} variant="ghost" /> : null}
      </View>
      <Text style={styles.version}>{version}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.secondary, padding: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  title: { color: theme.colors.surface, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  desc: { color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  actions: { gap: 12, paddingBottom: 16 },
  version: { color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 12 },
});
