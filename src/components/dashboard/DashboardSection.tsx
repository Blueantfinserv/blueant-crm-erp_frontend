import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';
import { SectionTitle } from './SectionTitle';

export function DashboardSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.container}>
      <SectionTitle title={title} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
});

