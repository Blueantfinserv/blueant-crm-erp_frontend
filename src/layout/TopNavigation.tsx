import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { shellColors } from '../constants/shellColors';
import { theme } from '../theme/theme';
import type { TopTabItem } from './navigationTypes';
import type { AuthUser } from '../types/auth';

const brandAsset = require('../../assets/blueAnt.png');

type Props = {
  currentDate: string;
  tabs: TopTabItem[];
  activeTab: TopTabItem['key'];
  onTabPress: (tab: TopTabItem) => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
  user?: AuthUser | null;
};

export function TopNavigation({
  currentDate,
  tabs,
  activeTab,
  onTabPress,
  onNotificationsPress,
  onProfilePress,
  onLogout,
  user,
}: Props) {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [openMenu, setOpenMenu] = useState<'navigation' | 'profile' | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const closeMenu = () => setOpenMenu(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [activeTab]);

  const handleProfilePress = () => {
    onProfilePress?.();
    closeMenu();
    setProfileVisible(true);
  };

  const handleLogout = () => {
    closeMenu();
    onLogout?.();
  };

  const profileFields = [
    { label: 'User ID', value: user?.id },
    { label: 'Employee Code', value: user?.employeeId },
    { label: 'Email', value: user?.email },
    { label: 'Mobile Number', value: user?.mobileNumber },
    { label: 'Role', value: user?.roleName ?? user?.role },
    { label: 'Department', value: user?.department },
    { label: 'Designation', value: user?.designation },
    { label: 'Team', value: user?.team },
    { label: 'Reporting Manager', value: user?.reportingManager ?? 'Not assigned' },
    { label: 'Status', value: user?.status },
    { label: 'First Login', value: user?.firstLogin === undefined ? undefined : (user.firstLogin ? 'Yes' : 'No') },
    { label: 'Account Locked', value: user?.accountLocked === undefined ? undefined : (user.accountLocked ? 'Yes' : 'No') },
    { label: 'Enabled', value: user?.enabled == null ? undefined : (user.enabled ? 'Yes' : 'No') },
    { label: 'Login At', value: user?.loginAt },
  ].filter((field) => Boolean(field.value));

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
          <Pressable
            onPress={() => setOpenMenu((current) => current === 'navigation' ? null : 'navigation')}
            style={[styles.iconButton, styles.hamburgerButton]}
          >
            <View style={styles.hamburgerLines}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </View>
          </Pressable>
          <Pressable onPress={onNotificationsPress} style={[styles.iconButton, styles.iconButtonCompact]}>
            <Text style={styles.icon}>🔔</Text>
          </Pressable>
          <Pressable
            onPress={() => setOpenMenu((current) => current === 'profile' ? null : 'profile')}
            style={[styles.iconButton, styles.iconButtonCompact]}
          >
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
          <Pressable
            onPress={() => setOpenMenu((current) => current === 'profile' ? null : 'profile')}
            style={styles.iconButton}
          >
            <Text style={styles.icon}>👤</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={openMenu !== null} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <View style={[styles.dropdown, isCompact && styles.dropdownCompact]}>
            {openMenu === 'navigation' ? (
              <>
                {tabs.map((tab) => {
                  const active = tab.key === activeTab;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => {
                        onTabPress(tab);
                        closeMenu();
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={[styles.dropdownLabel, active && styles.dropdownLabelActive]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
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

      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <Pressable style={styles.profileModalBackdrop} onPress={() => setProfileVisible(false)}>
          <Pressable style={[styles.profileModalCard, isCompact && styles.profileModalCardCompact]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.profileHeader}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImageFallback}>
                  <Text style={styles.profileImageFallbackText}>{user?.fullName?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={styles.profileHeaderCopy}>
                <Text style={styles.profileModalTitle}>My Profile</Text>
                {user?.fullName ? <Text style={styles.profileName}>{user.fullName}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close profile" onPress={() => setProfileVisible(false)} style={styles.profileCloseButton}>
                <Text style={styles.profileCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.profileDetails} contentContainerStyle={styles.profileDetailsContent} showsVerticalScrollIndicator={false}>
              {profileFields.map((field) => (
                <View key={field.label} style={[styles.profileField, isCompact && styles.profileFieldCompact]}>
                  <Text style={styles.profileFieldLabel}>{field.label}</Text>
                  <Text selectable style={styles.profileFieldValue}>{field.value}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
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
  dropdownCompact: {
    top: 58,
    right: 12,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE6F3',
    backgroundColor: '#F8FAFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  profileModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  profileModalCard: {
    width: 620,
    maxWidth: '100%',
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: shellColors.topBarSurfaceBorder,
    borderRadius: 18,
    backgroundColor: shellColors.topBarSurface,
    ...theme.shadow.card,
  },
  profileModalCardCompact: {
    width: '100%',
    maxHeight: '88%',
  },
  profileModalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  profileCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  profileCloseText: {
    color: theme.colors.primary,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileImageFallback: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#E9E5FF',
  },
  profileImageFallbackText: {
    color: '#5B21B6',
    fontSize: 19,
    fontWeight: '900',
  },
  profileHeaderCopy: {
    minWidth: 0,
    flex: 1,
  },
  profileName: {
    marginTop: 3,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  profileDetails: {
    flexShrink: 1,
  },
  profileDetailsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    padding: 14,
  },
  profileField: {
    width: '48%',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F2',
    borderRadius: 11,
    backgroundColor: '#FAFBFE',
  },
  profileFieldCompact: {
    width: '100%',
    minHeight: 36,
  },
  profileFieldLabel: {
    color: '#8A9AB2',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  profileFieldValue: {
    marginTop: 2,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
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
