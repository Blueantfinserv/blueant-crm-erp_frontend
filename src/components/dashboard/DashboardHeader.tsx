import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type DashboardHeaderProps = {
  userName: string;
  roleLabel: string;
  currentDate: string;
};

export function DashboardHeader({ userName, roleLabel, currentDate }: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.userName}>{userName}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{roleLabel}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.metaText}>{currentDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dot: {
    color: theme.colors.subtle,
    fontSize: 14,
    fontWeight: '700',
  },
});

