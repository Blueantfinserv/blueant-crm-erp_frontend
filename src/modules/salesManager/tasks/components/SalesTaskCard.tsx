import { memo } from 'react';
import { GestureResponderEvent, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { SalesTask } from '../types/tasks';

type Props = {
  task: SalesTask;
  width: `${number}%`;
  index: number;
  onUpdateMeeting?: (task: SalesTask) => void;
  onOpenDetails?: (task: SalesTask) => void;
};

const cardTones = [
  { accent: '#2563EB', soft: '#EFF6FF', border: '#DBEAFE' },
  { accent: '#8B5CF6', soft: '#F5F3FF', border: '#EDE9FE' },
  { accent: '#F97316', soft: '#FFF7ED', border: '#FFEDD5' },
  { accent: '#16A34A', soft: '#F0FDF4', border: '#DCFCE7' },
] as const;

export const SalesTaskCard = memo(function SalesTaskCard({ task, width, index, onUpdateMeeting, onOpenDetails }: Props) {
  const tone = cardTones[index % cardTones.length];
  const whatsappNumber = task.phone.replace(/\D/g, '');
  const dialerNumber = task.phone.replace(/[^\d+]/g, '');
  const mapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${task.coordinates.latitude},${task.coordinates.longitude}`;

  const openContactLink = (event: GestureResponderEvent, url: string) => {
    event.stopPropagation();
    void Linking.openURL(url);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${task.name}, ${task.meetingStage}`}
      onPress={() => onOpenDetails?.(task)}
      style={({ pressed }) => [
        styles.card,
        { flexBasis: width, borderColor: tone.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>{task.name}</Text>
          <View style={styles.contactActions}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open WhatsApp chat with ${task.name}`}
              hitSlop={6}
              onPress={(event) => openContactLink(event, `https://wa.me/${whatsappNumber}`)}
              style={({ pressed }) => [
                styles.contactButton,
                styles.whatsappButton,
                pressed && styles.contactButtonPressed,
              ]}
            >
              <Icon source="whatsapp" size={15} color="#16A34A" />
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Call ${task.name}`}
              hitSlop={6}
              onPress={(event) => openContactLink(event, `tel:${dialerNumber}`)}
              style={({ pressed }) => [
                styles.contactButton,
                styles.callButton,
                pressed && styles.contactButtonPressed,
              ]}
            >
              <Icon source="phone" size={14} color="#2563EB" />
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open meeting location for ${task.name} in maps`}
              hitSlop={6}
              onPress={(event) => openContactLink(event, mapsUrl)}
              style={({ pressed }) => [
                styles.contactButton,
                styles.locationButton,
                pressed && styles.contactButtonPressed,
              ]}
            >
              <Icon source="map-marker" size={15} color="#F97316" />
            </Pressable>
          </View>
        </View>
        <View style={[styles.stageBadge, { backgroundColor: tone.soft }]}>
          <Text style={[styles.stageText, { color: tone.accent }]}>{task.meetingStage}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Icon source="map-marker-outline" size={15} color={tone.accent} />
        <View style={styles.locationCopy}>
          <Text numberOfLines={1} style={styles.location}>{task.locationText}</Text>
        </View>
      </View>

      <View style={[styles.remarks, { backgroundColor: tone.soft }]}>
        <View style={styles.remarksHeader}>
          <Text style={styles.remarksLabel}>Remarks</Text>
          <Icon source="arrow-top-right" size={14} color={tone.accent} />
        </View>
        <Text numberOfLines={2} style={styles.remarksText}>{task.remarks}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Last updated</Text>
          <Text numberOfLines={1} style={styles.dateValue}>{task.lastUpdated}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Next follow-up</Text>
          <Text numberOfLines={1} style={[styles.dateValue, { color: tone.accent }]}>
            {task.nextFollowUpDate}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Update meeting for ${task.name}`}
          onPress={(event) => {
            event.stopPropagation();
            onUpdateMeeting?.(task);
          }}
          style={({ pressed }) => [
            styles.updateMeetingButton,
            { borderColor: tone.accent, backgroundColor: tone.accent },
            pressed && styles.contactButtonPressed,
          ]}
        >
          <Icon source="calendar-edit" size={12} color="#FFFFFF" />
          <Text style={styles.updateMeetingText}>Update Form</Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  cardPressed: {
    opacity: 0.82,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  identity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: { minWidth: 0, flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  whatsappButton: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  callButton: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  locationButton: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  contactButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  stageBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 5, borderRadius: 999 },
  stageText: { fontSize: 8, lineHeight: 10, fontWeight: '900' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationCopy: { minWidth: 0, flex: 1 },
  location: { minWidth: 0, flex: 1, color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  remarks: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remarksLabel: {
    color: theme.colors.muted,
    fontSize: 7,
    lineHeight: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remarksText: { color: theme.colors.text, fontSize: 9, lineHeight: 14, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dateBlock: { minWidth: 0, flex: 1 },
  dateLabel: { color: theme.colors.subtle, fontSize: 7, lineHeight: 10, fontWeight: '800', textTransform: 'uppercase' },
  dateValue: { color: theme.colors.text, fontSize: 9, lineHeight: 13, fontWeight: '800' },
  footerDivider: { width: 1, height: 25, backgroundColor: theme.colors.border },
  updateMeetingButton: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 7,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  updateMeetingText: {
    color: '#FFFFFF',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
  },
});
