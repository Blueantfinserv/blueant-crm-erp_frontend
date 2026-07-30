import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export function DashboardPlaceholderList() {
  return (
    <View style={styles.list}>
      {['Placeholder activity item', 'Placeholder activity item', 'Placeholder activity item'].map((item, index) => (
        <View key={`${item}-${index}`} style={styles.item}>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  item: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...theme.shadow.card,
  },
  text: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});

