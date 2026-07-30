import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

type Props = {
  title: string;
  description: string;
};

export function InsightCard({ title, description }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 220,
    minHeight: 140,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    padding: 18,
    justifyContent: 'space-between',
    gap: 10,
    ...theme.shadow.card,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
});
