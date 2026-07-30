import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import type { SalesTask } from './types/tasks';

type Props = {
  lead: SalesTask;
  onBack: () => void;
  onUpdateMeeting: (lead: SalesTask) => void;
};

const infoFields = (lead: SalesTask) => [
  { label: 'Email', value: lead.email ?? 'Not recorded', icon: 'email-outline' },
  { label: 'Profession', value: lead.profession ?? 'Not recorded', icon: 'briefcase-outline' },
  { label: 'Age Group', value: lead.ageGroup ?? 'Not recorded', icon: 'account-clock-outline' },
  { label: 'Any Prior Investment', value: lead.priorInvestment ?? 'Not recorded', icon: 'chart-line' },
  ...(lead.priorInvestment === 'Yes'
    ? [{ label: 'Investment Guidance', value: lead.adviceMode ?? 'Not recorded', icon: 'account-tie-outline' }]
    : []),
  { label: 'Any Kids', value: lead.kids ?? 'Not recorded', icon: 'account-child-outline' },
  { label: 'Best Time to Follow Up', value: lead.bestFollowUpTime ?? 'Not recorded', icon: 'clock-check-outline' },
  { label: 'Lead Qualification', value: lead.leadQualification ?? 'Not recorded', icon: 'fire' },
  { label: 'Marital Status', value: lead.maritalStatus ?? 'Not recorded', icon: 'account-heart-outline' },
] as const;

export function SalesManagerLeadDetailScreen({ lead, onBack, onUpdateMeeting }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const phone = lead.phone.replace(/[^\d+]/g, '');
  const whatsapp = lead.phone.replace(/\D/g, '');
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lead.coordinates.latitude},${lead.coordinates.longitude}`;

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
              <Text style={styles.stagePillText}>{lead.meetingStage}</Text>
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
            <View style={[styles.imageGrid, isMobile && styles.mobileImageGrid]}>
              <LeadImage
                title="Visiting Card"
                imageUri={lead.visitingCardImage}
                icon="card-account-details-outline"
                compact={isMobile}
              />
              <LeadImage
                title="Ad Board"
                imageUri={lead.adBoardImage}
                icon="billboard"
                compact={isMobile}
              />
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
              <View style={styles.locationCard}>
                <Icon source="map-marker" size={24} color="#EA580C" />
                <View style={styles.locationCopy}>
                  <Text style={styles.locationText}>{lead.locationText}</Text>
                  <Text style={styles.coordinates}>
                    {lead.coordinates.latitude.toFixed(6)}, {lead.coordinates.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
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

function LeadImage({ title, imageUri, icon, compact = false }: { title: string; imageUri?: string; icon: string; compact?: boolean }) {
  return (
    <View style={[styles.leadImageCard, compact && styles.mobileLeadImageCard]}>
      <View style={styles.leadImageHeader}>
        <Icon source={icon} size={15} color="#6D28D9" />
        <Text style={styles.leadImageTitle}>{title}</Text>
      </View>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.leadImage} resizeMode="cover" />
      ) : (
        <View style={styles.imageEmpty}>
          <Icon source="image-off-outline" size={24} color="#C4B5FD" />
          <Text style={styles.imageEmptyText}>Not uploaded</Text>
        </View>
      )}
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
  locationPanel: { flex: 1 },
  mobileLocationPanel: { minHeight: 205 },
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
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
  mobileImageGrid: { gap: 7 },
  leadImageCard: { minWidth: 190, flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#E8E5F1', borderRadius: 13, backgroundColor: '#FBFAFF' },
  mobileLeadImageCard: { minWidth: 0, flexBasis: '47%', borderRadius: 10 },
  leadImageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEEAF5' },
  leadImageTitle: { color: '#4C1D95', fontSize: 10, fontWeight: '900' },
  leadImage: { width: '100%', height: 130 },
  imageEmpty: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 5 },
  imageEmptyText: { color: '#A69BB8', fontSize: 9, fontWeight: '700' },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 13, backgroundColor: '#FFF7ED' },
  locationCopy: { minWidth: 0, flex: 1 },
  locationText: { color: '#7C2D12', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  coordinates: { marginTop: 3, color: '#C2410C', fontSize: 8, fontWeight: '700' },
  mapButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#FED7AA', borderRadius: 10, backgroundColor: '#FFFBF5' },
  mapButtonText: { color: '#EA580C', fontSize: 10, fontWeight: '900' },
  remarksCard: { flexDirection: 'row', gap: 10, padding: 15, borderLeftWidth: 3, borderLeftColor: '#8B5CF6', borderRadius: 12, backgroundColor: '#FAF8FF' },
  quoteMark: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EDE9FE' },
  remarksText: { minWidth: 0, flex: 1, color: '#475569', fontSize: 11, lineHeight: 18, fontWeight: '600' },
});
