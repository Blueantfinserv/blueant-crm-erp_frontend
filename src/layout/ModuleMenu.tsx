import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';
import type { ModuleItem, ModuleKey } from './navigationTypes';

type Props = {
  modules: ModuleItem[];
  activeModule: ModuleKey;
  onModulePress: (module: ModuleItem) => void;
  collapsed: boolean;
};

export function ModuleMenu({ modules, activeModule, onModulePress, collapsed }: Props) {
  return (
    <View style={styles.wrap}>
      {modules.map((module) => {
        const active = module.key === activeModule;
        return (
          <Pressable
            key={module.key}
            onPress={() => onModulePress(module)}
            style={[styles.item, collapsed && styles.itemCollapsed, active && styles.itemActive]}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <ModuleIcon moduleKey={module.key} />
            </View>
            {collapsed ? null : <Text style={[styles.label, active && styles.labelActive]}>{module.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 9,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  itemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.24)',
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
  },
  moduleIcon: {
    width: 18,
    height: 18,
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  labelActive: {
    color: theme.colors.primary,
  },
});

const salesIconAsset = require('../../assets/salesicon.png');
const newOnboardingIconAsset = require('../../assets/newonboardingicon.png');
const rmCrmIconAsset = require('../../assets/RM_CRMicon.png');
const helpdeskIconAsset = require('../../assets/helpdeskicon.png');
const accountsIconAsset = require('../../assets/acountsicon.png');
const hrIconAsset = require('../../assets/HRIcon.png');

function ModuleIcon({ moduleKey }: { moduleKey: ModuleKey }) {
  if (moduleKey === 'sales') {
    return <Image source={salesIconAsset} style={styles.moduleIcon} resizeMode="contain" />;
  }

  if (moduleKey === 'new-onboarding') {
    return <Image source={newOnboardingIconAsset} style={styles.moduleIcon} resizeMode="contain" />;
  }

  if (moduleKey === 'rm-crm') {
    return <Image source={rmCrmIconAsset} style={styles.moduleIcon} resizeMode="contain" />;
  }

  if (moduleKey === 'helpdesk') {
    return <Image source={helpdeskIconAsset} style={styles.moduleIcon} resizeMode="contain" />;
  }

  if (moduleKey === 'accounts') {
    return <Image source={accountsIconAsset} style={styles.moduleIcon} resizeMode="contain" />;
  }

  return <Image source={hrIconAsset} style={styles.moduleIcon} resizeMode="contain" />;
}
