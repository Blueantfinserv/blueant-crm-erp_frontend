import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type QuickActionCardProps = {
  title: string;
  onPress?: () => void;
};

export function QuickActionCard({ title, onPress }: QuickActionCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.inner}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: 16,
    ...theme.shadow.card,
  },
  inner: {
    minHeight: 64,
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

