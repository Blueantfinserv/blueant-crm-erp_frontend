import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';
import { darkPalette, useAppTheme } from '../theme/ThemeProvider';

type Props = PropsWithChildren<{
  collapsed?: boolean;
}>;

export function ContentContainer({ children, collapsed = false }: Props) {
  const { isDark } = useAppTheme();
  return <View style={[styles.shell, collapsed && styles.shellCollapsed, isDark && Platform.OS !== 'web' && styles.shellDark]}>{children}</View>;
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
  shellDark: {
    backgroundColor: darkPalette.page,
  },
});
