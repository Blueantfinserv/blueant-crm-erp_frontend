import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import { meetingService } from '../../../services/MeetingService';
import type { MeetingResponse } from '../../../types/meeting';
import type { SalesTask } from './types/tasks';

const formatLeadSource = (leadSource?: string) => {
  if (!leadSource) return '------';
  return leadSource
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

type Props = {
  lead: SalesTask;
  onBack: () => void;
  onUpdateMeeting: (lead: SalesTask) => void;
};

const infoFields = (lead: SalesTask) => [
  { label: 'Lead ID', value: lead.leadId !== undefined ? String(lead.leadId) : '------', icon: 'identifier' },
  { label: 'Email', value: lead.email ?? '------', icon: 'email-outline' },
  { label: 'Lead Source', value: formatLeadSource(lead.leadSource), icon: 'source-branch' },
] as const;

const verificationFields = (meeting: MeetingResponse) => [
  { label: 'Meeting Time', value: meeting.meetingTiming, icon: 'clock-outline' },
  { label: 'Age Group', value: meeting.ageGroup, icon: 'account-clock-outline' },
  { label: 'Prior Investment', value: meeting.existingSip, icon: 'chart-line' },
  { label: 'Profession', value: meeting.profession, icon: 'briefcase-outline' },
  { label: 'Clinic / Company / Firm', value: meeting.professionDetail, icon: 'office-building-outline' },
  { label: 'Best Meeting Time', value: meeting.bestTimeForMeeting, icon: 'calendar-clock-outline' },
  { label: 'Meeting With', value: meeting.meetingWith, icon: 'account-group-outline' },
  { label: 'Joined Person', value: meeting.personName, icon: 'account-outline' },
  { label: 'Position', value: meeting.position, icon: 'badge-account-outline' },
] as const;

const displayVerificationValue = (value?: string) => {
  if (!value?.trim()) return 'Not provided';
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function SalesManagerLeadDetailScreen({ lead, onBack, onUpdateMeeting }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [verifiedMeeting, setVerifiedMeeting] = useState<MeetingResponse | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const phone = lead.phone.replace(/[^\d+]/g, '');
  const whatsapp = lead.phone.replace(/\D/g, '');
  const hasCoordinates = Boolean(lead.hasLocationPin)
    && Number.isFinite(lead.coordinates.latitude)
    && Number.isFinite(lead.coordinates.longitude);
  const mapQuery = hasCoordinates
    ? `${lead.coordinates.latitude},${lead.coordinates.longitude}`
    : lead.locationText;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  useEffect(() => {
    let active = true;
    const loadVerification = async () => {
      setVerificationLoading(true);
      setVerificationError(null);
      try {
        const meetings = await meetingService.getVerificationMeetings('VERIFIED');
        if (!active) return;
        const matching = meetings
          .filter((meeting) => (
            (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || (Boolean(lead.meetingCode) && meeting.meetingCode === lead.meetingCode)
          ))
          .sort((a, b) => (
            b.meetingVerificationDate ?? b.updatedAt ?? b.meetingDate ?? ''
          ).localeCompare(
            a.meetingVerificationDate ?? a.updatedAt ?? a.meetingDate ?? ''
          ));
        setVerifiedMeeting(matching[0] ?? null);
      } catch (error) {
        if (!active) return;
        setVerifiedMeeting(null);
        setVerificationError(error instanceof Error ? error.message : 'Verified meeting information could not be loaded.');
      } finally {
        if (active) setVerificationLoading(false);
      }
    };
    void loadVerification();
    return () => {
      active = false;
    };
  }, [lead.leadCode, lead.leadId, lead.meetingCode]);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, isMobile && styles.mobileHero]}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />
          <View style={[styles.heroRow, isMobile && styles.mobileHeroRow]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to tasks" onPress={onBack} style={styles.backButton}>
              <Icon source="arrow-left" size={19} color="#FFFFFF" />
            </Pressable>
            <View style={[styles.heroIdentity, isMobile && styles.mobileHeroIdentity]}>
              <View style={styles.heroIcon}>
                <Icon source="account-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>LEAD DETAILS</Text>
                <Text numberOfLines={1} style={styles.title}>{lead.name}</Text>
              </View>
            </View>

            <View style={[styles.stagePill, isMobile && styles.mobileStagePill]}>
              <View style={styles.stageDot} />
              <Text style={styles.stagePillText}>{lead.taskLabel}</Text>
            </View>

            <View style={[styles.heroActions, isMobile && styles.mobileHeroActions]}>
              <Pressable onPress={() => void Linking.openURL(`tel:${phone}`)} style={[styles.heroAction, isMobile && styles.mobileHeroAction]}>
                <Icon source="phone-outline" size={isMobile ? 12 : 15} color="#FFFFFF" />
                <Text style={[styles.heroActionText, isMobile && styles.mobileHeroActionText]}>Call</Text>
              </Pressable>
              <Pressable onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)} style={[styles.heroAction, isMobile && styles.mobileHeroAction]}>
                <Icon source="whatsapp" size={isMobile ? 12 : 15} color="#FFFFFF" />
                <Text style={[styles.heroActionText, isMobile && styles.mobileHeroActionText]}>WhatsApp</Text>
              </Pressable>
              <Pressable
                onPress={() => onUpdateMeeting(lead)}
                style={[
                  styles.heroAction,
                  styles.updateAction,
                  isMobile && styles.mobileHeroAction,
                  isMobile && styles.mobileUpdateAction,
                ]}
              >
                <Icon source="calendar-edit" size={isMobile ? 12 : 15} color="#4C1D95" />
                <Text style={[styles.updateActionText, isMobile && styles.mobileHeroActionText]}>Update Form</Text>
              </Pressable>
            </View>

          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.panel, styles.infoPanel, isMobile && styles.mobilePanel]}>
            <SectionHeading icon="account-details-outline" title="Lead Information" subtitle="Key contact and meeting details" />
            <View style={[styles.infoGrid, isMobile && styles.mobileInfoGrid]}>
              {infoFields(lead).map((field) => (
                <View
                  key={field.label}
                  style={[
                    styles.infoItem,
                    isMobile && styles.mobileInfoItem,
                    isMobile && field.label === 'Email' && styles.mobileEmailItem,
                  ]}
                >
                  <View style={[styles.infoIcon, isMobile && styles.mobileInfoIcon]}>
                    <Icon source={field.icon} size={isMobile ? 13 : 15} color="#6D28D9" />
                  </View>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoLabel}>{field.label}</Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.infoValue}>{field.value}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.verificationSection}>
              <View style={styles.verificationHeading}>
                <View style={styles.verificationHeadingIcon}>
                  <Icon source="check-decagram-outline" size={17} color="#047857" />
                </View>
                <View style={styles.verificationHeadingCopy}>
                  <View style={styles.verificationTitleRow}>
                    <Text style={styles.verificationTitle}>Coordinator Verification</Text>
                    {verifiedMeeting ? <Text style={styles.verifiedPill}>VERIFIED</Text> : null}
                  </View>
                  <Text style={styles.verificationSubtitle}>Additional information confirmed by the Sales Coordinator</Text>
                </View>
              </View>

              {verificationLoading ? (
                <View style={styles.verificationState}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text style={styles.verificationStateText}>Loading verified meeting information...</Text>
                </View>
              ) : verificationError ? (
                <View style={styles.verificationState}>
                  <Icon source="alert-circle-outline" size={18} color="#DC2626" />
                  <Text style={[styles.verificationStateText, styles.verificationError]}>{verificationError}</Text>
                </View>
              ) : verifiedMeeting ? (
                <View style={[styles.verificationGrid, isMobile && styles.mobileVerificationGrid]}>
                  {verificationFields(verifiedMeeting).map((field) => (
                    <View key={field.label} style={[styles.verificationItem, isMobile && styles.mobileVerificationItem]}>
                      <View style={styles.verificationItemIcon}>
                        <Icon source={field.icon} size={14} color="#4F46E5" />
                      </View>
                      <View style={styles.infoCopy}>
                        <Text style={styles.verificationLabel}>{field.label}</Text>
                        <Text numberOfLines={2} style={styles.verificationValue}>{displayVerificationValue(field.value)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.verificationState}>
                  <Icon source="clock-outline" size={18} color="#94A3B8" />
                  <Text style={styles.verificationStateText}>This lead does not have a verified meeting response yet.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.rightColumn}>
            <View style={[
              styles.panel,
              styles.locationPanel,
              isMobile && styles.mobilePanel,
              isMobile && styles.mobileLocationPanel,
            ]}>
              <SectionHeading icon="map-marker-radius-outline" title="Location" subtitle="Saved meeting location" />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open location for ${lead.name} in Google Maps`}
                onPress={() => void Linking.openURL(mapUrl)}
                style={({ pressed }) => [styles.locationCard, pressed && styles.locationCardPressed]}
              >
                <View style={styles.locationPin}>
                  <Icon source="map-marker" size={22} color="#EA580C" />
                </View>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationText}>{lead.locationText}</Text>
                  <View style={styles.coordinateRow}>
                    <View style={styles.coordinateItem}>
                      <Text style={styles.coordinateLabel}>LAT</Text>
                      <Text style={styles.coordinates}>{hasCoordinates ? lead.coordinates.latitude.toFixed(6) : 'Not captured'}</Text>
                    </View>
                    <View style={styles.coordinateDivider} />
                    <View style={styles.coordinateItem}>
                      <Text style={styles.coordinateLabel}>LONG</Text>
                      <Text style={styles.coordinates}>{hasCoordinates ? lead.coordinates.longitude.toFixed(6) : 'Not captured'}</Text>
                    </View>
                  </View>
                </View>
                <Icon source="open-in-new" size={15} color="#F97316" />
              </Pressable>
              <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapButton}>
                <Icon source="map-outline" size={16} color="#EA580C" />
                <Text style={styles.mapButtonText}>Open in Maps</Text>
              </Pressable>
            </View>
            <View style={[styles.panel, styles.remarksPanel, isMobile && styles.mobilePanel]}>
              <SectionHeading icon="text-box-outline" title="Latest Remarks" subtitle={`Updated ${lead.lastUpdated}`} />
              <View style={styles.remarksCard}>
                <View style={styles.quoteMark}>
                  <Icon source="format-quote-open" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.remarksText}>{lead.remarks}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}><Icon source={icon} size={17} color="#6D28D9" /></View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: '#F5F7FB' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 14, paddingBottom: 28 },
  hero: { position: 'relative', overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: '#312E81' },
  mobileHero: { paddingHorizontal: 11, paddingVertical: 10, borderRadius: 16 },
  heroGlowLarge: { position: 'absolute', width: 260, height: 260, right: -80, top: -150, borderRadius: 130, backgroundColor: 'rgba(167,139,250,0.22)' },
  heroGlowSmall: { position: 'absolute', width: 120, height: 120, left: 180, bottom: -90, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroRow: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  mobileHeroRow: { minHeight: 0, rowGap: 9, columnGap: 7 },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  stagePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  mobileStagePill: { paddingHorizontal: 8, paddingVertical: 5 },
  stageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A7F3D0' },
  stagePillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  heroIdentity: { minWidth: 180, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mobileHeroIdentity: { minWidth: 130, gap: 7 },
  heroIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroCopy: { minWidth: 0, flex: 1 },
  eyebrow: { color: '#C4B5FD', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mobileHeroActions: {
    flexBasis: '100%', flexGrow: 1, flexWrap: 'nowrap', gap: 2,
    padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, backgroundColor: 'rgba(15,23,42,0.16)',
  },
  heroAction: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.1)' },
  mobileHeroAction: {
    minWidth: 0, minHeight: 26, flex: 1, gap: 4, paddingHorizontal: 4,
    borderWidth: 0, borderRadius: 7, backgroundColor: 'transparent',
  },
  mobileUpdateAction: { backgroundColor: '#FFFFFF' },
  heroActionText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  mobileHeroActionText: { fontSize: 8 },
  updateAction: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  updateActionText: { color: '#4C1D95', fontSize: 10, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  panel: { padding: 18, gap: 15, borderWidth: 1, borderColor: '#E4E8F0', borderRadius: 18, backgroundColor: '#FFFFFF', ...theme.shadow.card },
  mobilePanel: { padding: 11, gap: 10, borderRadius: 14 },
  infoPanel: { minWidth: 300, flex: 2 },
  rightColumn: { minWidth: 260, flex: 1, gap: 14 },
  locationPanel: { height: 218, flexGrow: 0, flexShrink: 0, gap: 10, padding: 14, overflow: 'hidden' },
  mobileLocationPanel: { height: 'auto', minHeight: 205 },
  remarksPanel: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEF0F5' },
  sectionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#F3F0FF' },
  sectionTitle: { color: '#1E1B4B', fontSize: 13, fontWeight: '900' },
  sectionSubtitle: { marginTop: 2, color: '#94A3B8', fontSize: 9, fontWeight: '600' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mobileInfoGrid: { gap: 7 },
  infoItem: { minWidth: 180, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#F8F9FD' },
  mobileInfoItem: { minWidth: 0, flexBasis: '47%', flexGrow: 1, gap: 6, paddingHorizontal: 7, paddingVertical: 8, borderRadius: 10 },
  mobileEmailItem: { flexBasis: '100%' },
  infoIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EEEAFD' },
  mobileInfoIcon: { width: 25, height: 25, borderRadius: 8 },
  infoCopy: { minWidth: 0, flex: 1 },
  infoLabel: { color: '#94A3B8', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { marginTop: 2, color: '#334155', fontSize: 11, fontWeight: '900' },
  verificationSection: { marginTop: 4, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEF0F5' },
  verificationHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  verificationHeadingIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#ECFDF5' },
  verificationHeadingCopy: { minWidth: 0, flex: 1 },
  verificationTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  verificationTitle: { color: '#1E1B4B', fontSize: 13, fontWeight: '900' },
  verifiedPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', color: '#047857', fontSize: 7, fontWeight: '900', letterSpacing: 0.6, backgroundColor: '#D1FAE5' },
  verificationSubtitle: { marginTop: 2, color: '#94A3B8', fontSize: 9, fontWeight: '600' },
  verificationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  mobileVerificationGrid: { gap: 7 },
  verificationItem: { minWidth: 210, flexBasis: '31%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58, padding: 10, borderWidth: 1, borderColor: '#E7E9F5', borderRadius: 12, backgroundColor: '#FAFAFF' },
  mobileVerificationItem: { minWidth: 0, flexBasis: '100%' },
  verificationItemIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EEF2FF' },
  verificationLabel: { color: '#94A3B8', fontSize: 7, fontWeight: '900', letterSpacing: 0.35, textTransform: 'uppercase' },
  verificationValue: { marginTop: 3, color: '#27324A', fontSize: 10, lineHeight: 14, fontWeight: '900' },
  verificationState: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#E7EAF0', borderRadius: 12, backgroundColor: '#F8FAFC' },
  verificationStateText: { color: '#64748B', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  verificationError: { color: '#B91C1C' },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#FFEDD5', borderRadius: 13, backgroundColor: '#FFF7ED' },
  locationCardPressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
  locationPin: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFEDD5' },
  locationCopy: { minWidth: 0, flex: 1 },
  locationText: { color: '#7C2D12', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  coordinateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  coordinateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coordinateLabel: { color: '#FDBA74', fontSize: 7, fontWeight: '900', letterSpacing: 0.45 },
  coordinateDivider: { width: 1, height: 11, backgroundColor: '#FED7AA' },
  coordinates: { color: '#C2410C', fontSize: 8, fontWeight: '800' },
  mapButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#FED7AA', borderRadius: 10, backgroundColor: '#FFFBF5' },
  mapButtonText: { color: '#EA580C', fontSize: 10, fontWeight: '900' },
  remarksCard: { flexDirection: 'row', gap: 10, padding: 15, borderLeftWidth: 3, borderLeftColor: '#8B5CF6', borderRadius: 12, backgroundColor: '#FAF8FF' },
  quoteMark: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EDE9FE' },
  remarksText: { minWidth: 0, flex: 1, color: '#475569', fontSize: 11, lineHeight: 18, fontWeight: '600' },
});
