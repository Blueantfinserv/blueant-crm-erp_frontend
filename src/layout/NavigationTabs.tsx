import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';
import type { TopTabItem } from './navigationTypes';

type Props = {
  activeTab: TopTabItem['key'];
  tabs: TopTabItem[];
  onTabPress: (tab: TopTabItem) => void;
};

export function NavigationTabs({ activeTab, tabs, onTabPress }: Props) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} onPress={() => onTabPress(tab)} style={[styles.item, active && styles.itemActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  item: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.24)',
  },
  label: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  labelActive: {
    color: theme.colors.primary,
  },
});
