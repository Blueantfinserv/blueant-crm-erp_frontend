import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';

type Props = PropsWithChildren<{
  collapsed?: boolean;
}>;

export function ContentContainer({ children, collapsed = false }: Props) {
  return <View style={[styles.shell, collapsed && styles.shellCollapsed]}>{children}</View>;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  shellCollapsed: {
    paddingLeft: 16,
  },
});
