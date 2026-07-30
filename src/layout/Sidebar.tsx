import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { shellColors } from '../constants/shellColors';
import { theme } from '../theme/theme';
import { ModuleMenu } from './ModuleMenu';
import type { ModuleItem, ModuleKey } from './navigationTypes';

type Props = {
  modules: ModuleItem[];
  activeModule: ModuleKey;
  onModulePress: (module: ModuleItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function Sidebar({ modules, activeModule, onModulePress, collapsed, onToggleCollapse }: Props) {
  return (
    <View style={[styles.shell, collapsed && styles.shellCollapsed]}>
      <View style={styles.headerRow}>
        {!collapsed ? <Text style={styles.title}>Modules</Text> : <View style={styles.titleSpacer} />}
        <Pressable onPress={onToggleCollapse} style={styles.toggleButton}>
          <CollapseIcon collapsed={collapsed} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ModuleMenu modules={modules} activeModule={activeModule} onModulePress={onModulePress} collapsed={collapsed} />
      </ScrollView>
      <View pointerEvents="none" style={styles.shapeWrap}>
        <Svg width="100%" height="100%" viewBox="0 0 220 300" preserveAspectRatio="none">
          <Path
            d="M0 89
               C35 98, 44 118, 56 145
               C68 171, 70 198, 80 222
               C92 250, 116 268, 144 220
               C193 144, 284 358, 210 262
               L220 300
               L0 300
               Z"
            fill={shellColors.sidebarBlobPrimary}
          />
        </Svg>
      </View>
      <View pointerEvents="none" style={styles.shapeWrapTop}>
        <Svg width="100%" height="100%" viewBox="0 0 220 300" preserveAspectRatio="none">
          <Path
            d="M10 79
               C41 87, 48 106, 60 131
               C72 156, 77 183, 85 206
               C95 232, 117 246, 140 242
               C156 239, 170 228, 181 214
               C190 201, 196 183, 202 171
               C206 164, 210 159, 210 156
               L210 286
               L10 286
               Z"
            fill={shellColors.sidebarBlobSecondary}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 182,
    padding: 12,
    backgroundColor: shellColors.sidebarBackground,
    borderRightWidth: 1,
    borderRightColor: shellColors.sidebarBorder,
    gap: 12,
    overflow: 'hidden',
  },
  shellCollapsed: {
    width: 64,
    paddingHorizontal: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  titleSpacer: {
    height: 16,
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: shellColors.sidebarSurface,
    borderWidth: 1,
    borderColor: shellColors.sidebarSurfaceBorder,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
  shapeWrap: {
    position: 'absolute',
    left: -28,
    right: -40,
    bottom:0,
    height: 340,
    overflow: 'hidden',
  },
  shapeWrapTop: {
    position: 'absolute',
    left: -38,
    right: -30,
    bottom: -20,
    height: 300,
    overflow: 'hidden',
  },
});

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  const stroke = theme.colors.primary;
  return (
    <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {collapsed ? (
        <Path d="M5 3.5L8.5 7L5 10.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <Path d="M9 3.5L5.5 7L9 10.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}
