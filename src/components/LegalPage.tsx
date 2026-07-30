import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../theme/theme';
import { helpSections } from '../data/help';
import { contactInfo } from '../data/contact';
import { privacyPolicySections } from '../data/privacyPolicy';
import { termsSections } from '../data/terms';

const brandAsset = require('../../assets/blueAnt.png');
const lastUpdatedText = 'Last Updated: 09 July 2026';

export type LegalPageKind = 'help' | 'contact' | 'privacyPolicy' | 'terms';

const navItems: Array<{
  key: LegalPageKind;
  label: string;
  hint: string;
  icon: string;
}> = [
  { key: 'help', label: 'Help', hint: 'Get help and find answers', icon: '?' },
  { key: 'contact', label: 'Contact', hint: 'Connect with our team', icon: '☎' },
  { key: 'privacyPolicy', label: 'Privacy Policy', hint: 'How we protect your data', icon: '▣' },
  { key: 'terms', label: 'Terms & Conditions', hint: 'Terms of use and policies', icon: '▤' },
];

const sectionIcons: Record<LegalPageKind, string[]> = {
  help: ['💡', '❓', '📞', '⚡'],
  contact: ['🏢', '✉️', '📱', '⏰'],
  privacyPolicy: ['🔒', '🛡️', '👁️', '📘'],
  terms: ['📄', '⚖️', '📝', '🔍'],
};

const fallbackSectionIcon = '✦';
const fallbackContactIcon = '◌';

export function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.footerLinkWrap, pressed && styles.pressed]}>
      <Text style={styles.footerLink}>{label}</Text>
    </Pressable>
  );
}

export function LegalDocsScreen({
  kind,
  onClose,
  onNavigate,
}: {
  kind: LegalPageKind | null;
  onClose: () => void;
  onNavigate?: (next: LegalPageKind) => void;
}) {
  if (!kind) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <LegalDocsLayout kind={kind} onBackToLogin={onClose} onNavigate={onNavigate} presentation="modal" />
        </View>
      </View>
    </Modal>
  );
}

export function LegalDocsLayout({
  kind,
  onBackToLogin,
  onNavigate,
  presentation = 'page',
}: {
  kind: LegalPageKind;
  onBackToLogin: () => void;
  onNavigate?: (next: LegalPageKind) => void;
  presentation?: 'page' | 'modal';
}) {
  const { width } = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const mobileDrawerWidth = Math.max(190, Math.round(width * 0.44));

  useEffect(() => {
    Animated.timing(slide, {
      toValue: drawerOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, slide]);

  const title =
    kind === 'help' ? 'Help' : kind === 'contact' ? 'Contact' : kind === 'privacyPolicy' ? 'Privacy Policy' : 'Terms of Service';
  const content = useMemo(() => {
    if (kind === 'contact') {
      return (
        <View style={styles.sectionList}>
          {contactInfo.map((item) => (
              <View key={item.label} style={styles.sectionRow}>
                <View style={styles.rowIcon}>
                  <Text style={styles.rowIconText}>
                    {'★'}
                  </Text>
                </View>
              <View style={styles.rowBody}>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    const sections = kind === 'help' ? helpSections : kind === 'privacyPolicy' ? privacyPolicySections : termsSections;
    return (
      <View style={styles.sectionList}>
        {sections.map((section, index) => (
            <View key={section.title} style={styles.sectionRow}>
              <View style={styles.rowIcon}>
                <Text style={styles.rowIconText}>{'★'}</Text>
              </View>
            <View style={styles.rowBody}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.bodyStack}>
                {section.body?.map((line) => (
                  <Text key={line} style={styles.bodyText}>
                    {line}
                  </Text>
                ))}
                {section.bullets?.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }, [kind]);

  const navigate = (next: LegalPageKind) => {
    setDrawerOpen(false);
    onNavigate?.(next);
  };

  const openDrawerButton = (
    <Pressable
      onPress={() => setDrawerOpen((current) => !current)}
      style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
      hitSlop={10}
    >
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </Pressable>
  );

  const sidebar = (
    <View style={[styles.leftPanel, isMobile && styles.leftPanelMobile]}>
      <ScrollView style={styles.leftScroll} contentContainerStyle={styles.leftScrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sidebarTitle}>SUPPORT CENTER</Text>
        <View style={styles.navList}>
          {navItems.map((item) => {
            const active = item.key === kind;
            return (
              <Pressable
                key={item.key}
                onPress={() => navigate(item.key)}
                style={({ pressed }) => [
                  styles.navItem,
                  isMobile && styles.navItemMobile,
                  active && styles.navItemActive,
                  pressed && styles.navItemPressed,
                ]}
              >
                {active ? (
                  <Svg pointerEvents="none" style={styles.navActiveGradient}>
                    <Defs>
                        <LinearGradient id={`nav-gradient-${item.key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.26" />
                          <Stop offset="18%" stopColor="#F59E0B" stopOpacity="0.18" />
                          <Stop offset="48%" stopColor="#F59E0B" stopOpacity="0.10" />
                          <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" rx="16" fill={`url(#nav-gradient-${item.key})`} />
                  </Svg>
                ) : null}
                <View style={[styles.navIconWrap, isMobile && styles.navIconWrapMobile, active && styles.navIconWrapActive]}>
                  <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
                </View>
                <View style={[styles.navTextWrap, isMobile && styles.navTextWrapMobile]}>
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
                  {!isMobile ? <Text style={[styles.navHint, active && styles.navHintActive]}>{item.hint}</Text> : null}
                </View>
                {!isMobile ? <Text style={[styles.navChevron, active && styles.navChevronActive]}>{'›'}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.root, presentation === 'modal' && styles.modalRoot]}>
      {presentation === 'page' ? (
        <>
          <View style={styles.bgGlowA} />
          <View style={styles.bgGlowB} />
        </>
      ) : null}

        <View style={[styles.shell, presentation === 'modal' && styles.shellModal]}>
          {isMobile ? (
            <View style={styles.mobileHeaderWrap}>
              <View style={styles.mobileHeaderTopRow}>
                <View style={styles.brandBlock}>
                  <Image source={brandAsset} style={styles.brandLogoMobile} resizeMode="contain" />
                </View>

                <Pressable onPress={onBackToLogin} style={styles.backButton}>
                  <Text style={styles.backButtonText}>← Back to Login</Text>
                </Pressable>
              </View>

              <View style={styles.headerActionsMobile}>
                {openDrawerButton}
                <View style={styles.mobileHeaderCopy}>
                  <Text style={styles.headerTitle}>{title}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.headerBar}>
              <View style={styles.brandBlock}>
                <Image source={brandAsset} style={styles.brandLogo} resizeMode="contain" />
              </View>

              <View style={[styles.headerCopyBlock, isTablet && styles.headerCopyBlockTablet]}>
                <Text style={styles.headerTitle}>{title}</Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable onPress={onBackToLogin} style={styles.backButton}>
                  <Text style={styles.backButtonText}>← Back to Login</Text>
                </Pressable>
              </View>
            </View>
          )}

        <View style={[styles.docsShell, presentation === 'modal' && styles.docsShellModal, isMobile && styles.docsShellMobile]}>
          {!isMobile ? sidebar : null}

          {!isMobile ? <View style={styles.divider} /> : null}

          <ScrollView style={styles.rightScroll} contentContainerStyle={styles.rightScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.rightPanel}>
              <View style={styles.topStripe}>
                <View style={styles.topStripeBlue} />
                <View style={styles.topStripePurple} />
                <View style={styles.topStripePink} />
                <View style={styles.topStripeOrange} />
              </View>

              <View style={styles.contentMetaRow}>
                <Text style={styles.contentKicker}>Documentation</Text>
                <Text style={styles.contentUpdated}>{lastUpdatedText}</Text>
              </View>

              {content}
            </View>
          </ScrollView>
        </View>
      </View>

      {isMobile && drawerOpen ? (
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <Animated.View
            style={[
              styles.drawer,
              {
                width: mobileDrawerWidth,
                transform: [
                  {
                    translateX: slide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-mobileDrawerWidth, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {sidebar}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  shell: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 },
  shellModal: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, flex: 1 },
  bgGlowA: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  bgGlowB: {
    position: 'absolute',
    right: -100,
    top: 100,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandLogo: { width: 118, height: 38, marginTop: -15 },
  brandLogoMobile: { width: 92, height: 30, marginTop: 0 },
  headerCopyBlock: { flex: 1, paddingLeft: '20%', minWidth: 0 },
  headerCopyBlockTablet: { paddingLeft: '12%' },
  mobileHeaderWrap: { gap: 10 },
  mobileHeaderTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mobileHeaderCopy: { alignSelf: 'flex-end', minWidth: 0, paddingTop: 1, marginLeft: 'auto', paddingRight: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#15213A' },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  headerActionsMobile: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.24)',
    backgroundColor: '#FFF8EC',
  },
  backButtonText: { color: '#D97706', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.50)', padding: 16, justifyContent: 'center' },
  modalCard: { flex: 1, maxHeight: '96%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#F4F5F7', ...theme.shadow.card },
  modalRoot: { backgroundColor: 'transparent' },

  docsShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
    minHeight: 0,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
  },
  docsShellModal: {
    flex: 1,
    minHeight: 0,
  },
  docsShellMobile: {
    flexDirection: 'column',
  },

  leftPanel: {
    flexBasis: '30%',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    height: '100%',
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: 'rgba(226,232,240,0.9)',
    overflow: 'hidden',
  },
  leftPanelMobile: { flex: 1, width: '100%', borderRightWidth: 0 },
  leftScroll: { flex: 1, minHeight: 0 },
  leftScrollContent: { padding: 18, paddingBottom: 14, flexGrow: 1, minHeight: '100%' },
  sidebarTitle: { fontSize: 13, fontWeight: '800', color: '#8091B3', marginBottom: 8, letterSpacing: 0.6 },
  navList: { gap: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  navItemMobile: { paddingVertical: 6, paddingHorizontal: 8, gap: 6 },
  navItemActive: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#F8E1B1',
    shadowColor: '#B45309',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  navItemPressed: { opacity: 0.96, transform: [{ translateX: 2 }] },
  navActiveGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  navIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapMobile: { width: 30, height: 30, borderRadius: 10 },
  navIconWrapActive: { backgroundColor: '#F59E0B', borderWidth: 1, borderColor: '#F59E0B' },
  navIcon: { color: '#5B6E9B', fontSize: 16, fontWeight: '900' },
  navIconActive: { color: '#fff' },
  navTextWrap: { flex: 1, minWidth: 0 },
  navTextWrapMobile: { flexShrink: 1 },
  navLabel: { color: theme.colors.text, fontWeight: '800', fontSize: 12, lineHeight: 14, flexWrap: 'wrap' },
  navLabelActive: { color: '#9A5B00' },
  navHint: { color: '#8A97B2', fontSize: 12.5, marginTop: 3 },
  navHintActive: { color: '#B1791C' },
  navChevron: { color: '#97A4BE', fontSize: 24, lineHeight: 24, fontWeight: '300' },
  navChevronActive: { color: '#F59E0B' },
  divider: { width: 1, backgroundColor: '#E8EDF5' },

  rightScroll: { flex: 1, minHeight: 0 },
  rightScrollContent: { flexGrow: 1, padding: 18, minHeight: '100%' },
  rightPanel: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 0,
  },
  topStripe: { flexDirection: 'row', height: 6, borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  topStripeBlue: { flex: 0.3, backgroundColor: '#2D6BFF' },
  topStripePurple: { flex: 0.25, backgroundColor: '#7A5AF8' },
  topStripePink: { flex: 0.3, backgroundColor: '#FF3D8D' },
  topStripeOrange: { flex: 0.15, backgroundColor: '#FF9B2F' },
  contentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  contentKicker: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  contentUpdated: { color: theme.colors.subtle, fontSize: 12, fontWeight: '600' },

  sectionList: { gap: 0 },
  sectionRow: { flexDirection: 'row', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  rowIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFF4DD', alignItems: 'center', justifyContent: 'center' },
  rowIconText: { color: '#F59E0B', fontSize: 18, fontWeight: '900' },
  rowBody: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#15213A', marginBottom: 8 },
  bodyStack: { gap: 8 },
  bodyText: { color: theme.colors.muted, lineHeight: 21, fontSize: 14 },
  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 999, marginTop: 8, backgroundColor: theme.colors.primary },
  bulletText: { flex: 1, color: theme.colors.muted, lineHeight: 21, fontSize: 14 },
  contactLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  contactValue: { color: '#15213A', fontSize: 15, fontWeight: '600', lineHeight: 22 },

  drawerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  drawer: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: theme.colors.background },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  menuButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  menuLine: { width: 16, height: 2, borderRadius: 999, backgroundColor: '#D97706' },

  footerLinkWrap: { paddingVertical: 2 },
  footerLink: { color: theme.colors.muted, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
