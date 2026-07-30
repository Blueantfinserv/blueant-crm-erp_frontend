import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

export function DashboardGrid({ children }: PropsWithChildren) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});

