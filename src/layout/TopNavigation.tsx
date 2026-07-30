import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { shellColors } from '../constants/shellColors';
import { theme } from '../theme/theme';
import type { TopTabItem } from './navigationTypes';

const brandAsset = require('../../assets/blueAnt.png');

type Props = {
  currentDate: string;
  tabs: TopTabItem[];
  activeTab: TopTabItem['key'];
  onTabPress: (tab: TopTabItem) => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
};

export function TopNavigation({
  currentDate,
  tabs,
  activeTab,
  onTabPress,
  onNotificationsPress,
  onProfilePress,
  onLogout,
}: Props) {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleProfilePress = () => {
    onProfilePress?.();
    closeMenu();
  };

  const handleLogout = () => {
    closeMenu();
    onLogout?.();
  };

  return (
    <View style={[styles.shell, isCompact && styles.shellCompact]}>
      {!isCompact ? (
        <>
          <View pointerEvents="none" style={styles.blobWrap}>
            <Svg width="100%" height="100%" viewBox="0 0 420 120" preserveAspectRatio="none">
              <Path d="M8 98C24 14, 104 10, 150 22C196 34, 224 62, 256 78C279 94, 334 96, 392 78V120H18Z" fill={shellColors.topBlobPrimary} />
            </Svg>
          </View>
          <View pointerEvents="none" style={styles.blobWrapSecondary}>
            <Svg width="100%" height="100%" viewBox="0 0 420 120" preserveAspectRatio="none">
              <Path d="M18 89C31 24, 101 20, 143 30C187 40, 212 63, 240 76C263 87, 309 89, 375 75V118H28Z" fill={shellColors.topBlobSecondary} />
            </Svg>
          </View>
        </>
      ) : null}

      <View style={[styles.brandBlock, isCompact && styles.brandBlockCompact]}>
        <Image source={brandAsset} style={[styles.brandLogo, isCompact && styles.brandLogoCompact]} resizeMode="contain" />
        {!isCompact ? <Text style={styles.date}>{currentDate}</Text> : null}
      </View>

      {isCompact ? (
        <View style={styles.actions}>
          <Pressable onPress={() => setMenuOpen((current) => !current)} style={[styles.iconButton, styles.hamburgerButton]}>
            <View style={styles.hamburgerLines}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </View>
          </Pressable>
          <Pressable onPress={onNotificationsPress} style={[styles.iconButton, styles.iconButtonCompact]}>
            <Text style={styles.icon}>🔔</Text>
          </Pressable>
          <Pressable onPress={() => setMenuOpen((current) => !current)} style={[styles.iconButton, styles.iconButtonCompact]}>
            <Text style={styles.icon}>👤</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable key={tab.key} onPress={() => onTabPress(tab)} style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {!isCompact ? (
        <View style={styles.actions}>
          <Pressable onPress={onNotificationsPress} style={styles.iconButton}>
            <Text style={styles.icon}>🔔</Text>
          </Pressable>
          <Pressable onPress={() => setMenuOpen((current) => !current)} style={styles.iconButton}>
            <Text style={styles.icon}>👤</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <View style={styles.dropdown}>
            {isCompact ? (
              <>
                {tabs.map((tab) => {
                  const active = tab.key === activeTab;
                  return (
                    <Pressable key={tab.key} onPress={() => onTabPress(tab)} style={styles.dropdownItem}>
                      <Text style={[styles.dropdownLabel, active && styles.dropdownLabelActive]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
                <View style={styles.dropdownDivider} />
                <Pressable onPress={handleProfilePress} style={styles.dropdownItem}>
                  <Text style={styles.dropdownLabel}>My Profile</Text>
                </Pressable>
                <View style={styles.dropdownDivider} />
                <Pressable onPress={handleLogout} style={styles.dropdownItem}>
                  <Text style={[styles.dropdownLabel, styles.logoutLabel]}>Logout</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={handleProfilePress} style={styles.dropdownItem}>
                  <Text style={styles.dropdownLabel}>My Profile</Text>
                </Pressable>
                <View style={styles.dropdownDivider} />
                <Pressable onPress={handleLogout} style={styles.dropdownItem}>
                  <Text style={[styles.dropdownLabel, styles.logoutLabel]}>Logout</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingLeft: 18,
    paddingRight: 18,
    paddingVertical: 7,
    backgroundColor: shellColors.topBarBackground,
    borderBottomWidth: 1,
    borderBottomColor: shellColors.topBarBorder,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  shellCompact: {
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
  },
  brandBlock: {
    minWidth: 160,
    zIndex: 1,
  },
  brandBlockCompact: {
    minWidth: 0,
    flexShrink: 1,
  },
  brandLogo: {
    width: 130,
    height: 34,
  },
  brandLogoCompact: {
    width: 92,
    height: 24,
  },
  date: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabsScroll: {
    flex: 1,
  },
  tabsScrollCompact: {
    flexBasis: '100%',
    width: '100%',
  },
  tabsRow: {
    flex: 1,
    paddingLeft: 18,
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
    zIndex: 1,
  },
  tabsRowCompact: {
    flexGrow: 0,
    paddingLeft: 0,
    paddingRight: 0,
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: shellColors.topBarSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  hamburgerButton: {
    paddingHorizontal: 9,
  },
  hamburgerLines: {
    gap: 3,
  },
  hamburgerLine: {
    width: 15,
    height: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  icon: {
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    top: 62,
    right: 18,
    minWidth: 170,
    borderRadius: 16,
    backgroundColor: shellColors.topBarSurface,
    borderWidth: 1,
    borderColor: shellColors.topBarSurfaceBorder,
    paddingVertical: 6,
    ...theme.shadow.card,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  dropdownLabelActive: {
    color: theme.colors.primary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: shellColors.topBarSurfaceBorder,
    marginHorizontal: 10,
  },
  logoutLabel: {
    color: '#D12E2E',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: shellColors.topBarSurface,
    borderWidth: 1,
    borderColor: shellColors.topBarSurfaceBorder,
  },
  tabCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.24)',
  },
  tabText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextCompact: {
    fontSize: 11,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  blobWrap: {
    position: 'absolute',
    right: -38,
    top: -10,
    width: 500,
    height: 100,
    overflow: 'hidden',
  },
  blobWrapSecondary: {
    position: 'absolute',
    right: -68,
    top: -10,
    width: 500,
    height: 100,
    overflow: 'hidden',
  },
});
