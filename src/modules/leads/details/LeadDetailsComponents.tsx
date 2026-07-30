import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../../../components/AuthButton';
import { theme } from '../../../theme/theme';
import { LeadDocument, LeadInfo, LeadNote, FollowupItem, TimelineActivity } from './leadDetailsData';
import { LeadPriority, LeadStatus } from '../leadData';

export function LeadInfoCard({ lead }: { lead: LeadInfo }) {
  const fields = [
    ['Lead ID', lead.leadId],
    ['Customer Name', lead.customerName],
    ['Company', lead.company],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Source', lead.source],
    ['Industry', lead.industry],
    ['Assigned Sales Manager', lead.assignedSalesManager],
    ['Created Date', lead.createdDate],
    ['Last Updated', lead.lastUpdated],
  ];

  return (
    <View style={styles.card}>
      <SectionTitle title="Lead Information" />
      <View style={styles.infoGrid}>
        {fields.map(([label, value]) => (
          <View key={label} style={styles.infoItem}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ActivityTimeline({ activities }: { activities: TimelineActivity[] }) {
  return (
    <View style={styles.card}>
      <SectionTitle title="Communication Timeline" />
      <View style={styles.timeline}>
        {activities.map((activity, index) => (
          <TimelineItem key={`${activity.title}-${index}`} activity={activity} isLast={index === activities.length - 1} />
        ))}
      </View>
    </View>
  );
}

export function TimelineItem({ activity, isLast }: { activity: TimelineActivity; isLast?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot}>
          <Text style={styles.timelineDotText}>{activity.icon}</Text>
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineTitle}>{activity.title}</Text>
        <Text style={styles.timelineMeta}>{activity.dateTime}</Text>
        <Text style={styles.timelineDescription}>{activity.description}</Text>
        <Text style={styles.timelineBy}>Performed by {activity.performedBy}</Text>
      </View>
    </View>
  );
}

export function NotesCard({ notes }: { notes: LeadNote[] }) {
  return (
    <View style={styles.card}>
      <SectionTitle title="Notes" />
      <View style={styles.notesList}>
        {notes.map((note, index) => (
          <View key={`${note.user}-${index}`} style={styles.noteItem}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteUser}>{note.user}</Text>
              <Text style={styles.noteTime}>{note.time}</Text>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FollowupCard({ followups }: { followups: FollowupItem[] }) {
  return (
    <View style={styles.card}>
      <SectionTitle title="Upcoming Follow-ups" />
      <View style={styles.followupList}>
        {followups.map((followup, index) => (
          <View key={`${followup.date}-${index}`} style={styles.followupItem}>
            <Text style={styles.followupCell}>{followup.date}</Text>
            <Text style={styles.followupCell}>{followup.time}</Text>
            <Text style={styles.followupCell}>{followup.type}</Text>
            <Text style={styles.followupCell}>{followup.assignedTo}</Text>
            <FollowupStatusBadge status={followup.status} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function DocumentCard({ documents }: { documents: LeadDocument[] }) {
  return (
    <View style={styles.card}>
      <SectionTitle title="Documents" />
      <View style={styles.documentList}>
        {documents.map((document) => (
          <View key={document.fileName} style={styles.documentItem}>
            <View style={styles.documentIcon}>
              <Text style={styles.documentIconText}>▣</Text>
            </View>
            <View style={styles.documentMeta}>
              <Text style={styles.documentName}>{document.fileName}</Text>
              <Text style={styles.documentDate}>{document.uploadDate}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function LeadHeader({
  name,
  company,
  status,
  priority,
  onAddFollowup,
}: {
  name: string;
  company: string;
  status: LeadStatus;
  priority: LeadPriority;
  onAddFollowup?: () => void;
}) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTextBlock}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>{company}</Text>
      </View>
      <View style={styles.headerBadges}>
        <LeadStatusBadge status={status} />
        <PriorityBadge priority={priority} />
      </View>
      <View style={styles.headerActions}>
        <AuthButton title="Edit Lead" onPress={() => {}} variant="secondary" />
        <AuthButton title="Schedule Meeting" onPress={() => {}} />
        <AuthButton title="Add Follow-up" onPress={onAddFollowup ?? (() => {})} variant="secondary" />
        <Pressable style={styles.moreButton}>
          <Text style={styles.moreButtonText}>More</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const tone = getStatusTone(status);
  return (
    <View style={[styles.badge, tone.container]}>
      <Text style={[styles.badgeText, tone.text]}>{status}</Text>
    </View>
  );
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const tone = getPriorityTone(priority);
  return (
    <View style={[styles.badge, tone.container]}>
      <Text style={[styles.badgeText, tone.text]}>{priority}</Text>
    </View>
  );
}

function FollowupStatusBadge({ status }: { status: FollowupItem['status'] }) {
  const tone = getFollowupStatusTone(status);
  return (
    <View style={[styles.badge, tone.container]}>
      <Text style={[styles.badgeText, tone.text]}>{status}</Text>
    </View>
  );
}

function getStatusTone(status: LeadStatus) {
  if (status === 'New') return { container: styles.statusNew, text: styles.statusNewText };
  if (status === 'Contacted') return { container: styles.statusContacted, text: styles.statusContactedText };
  if (status === 'Qualified') return { container: styles.statusQualified, text: styles.statusQualifiedText };
  if (status === 'Proposal') return { container: styles.statusProposal, text: styles.statusProposalText };
  if (status === 'Won') return { container: styles.statusWon, text: styles.statusWonText };
  return { container: styles.statusLost, text: styles.statusLostText };
}

function getPriorityTone(priority: LeadPriority) {
  if (priority === 'High') return { container: styles.priorityHigh, text: styles.priorityHighText };
  if (priority === 'Medium') return { container: styles.priorityMedium, text: styles.priorityMediumText };
  return { container: styles.priorityLow, text: styles.priorityLowText };
}

function getFollowupStatusTone(status: FollowupItem['status']) {
  if (status === 'Scheduled') return { container: styles.followupScheduled, text: styles.followupScheduledText };
  if (status === 'Pending') return { container: styles.followupPending, text: styles.followupPendingText };
  return { container: styles.followupCompleted, text: styles.followupCompletedText };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 16,
    ...theme.shadow.card,
  },
  headerCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 16,
    ...theme.shadow.card,
  },
  headerTextBlock: {
    gap: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  headerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moreButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moreButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusNew: { backgroundColor: 'rgba(59, 130, 246, 0.14)' },
  statusContacted: { backgroundColor: 'rgba(14, 165, 233, 0.14)' },
  statusQualified: { backgroundColor: 'rgba(168, 85, 247, 0.14)' },
  statusProposal: { backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  statusWon: { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
  statusLost: { backgroundColor: 'rgba(239, 68, 68, 0.14)' },
  statusNewText: { color: '#2563EB' },
  statusContactedText: { color: '#0EA5E9' },
  statusQualifiedText: { color: '#7C3AED' },
  statusProposalText: { color: '#D97706' },
  statusWonText: { color: '#059669' },
  statusLostText: { color: '#DC2626' },
  priorityHigh: { backgroundColor: 'rgba(239, 68, 68, 0.14)' },
  priorityMedium: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  priorityLow: { backgroundColor: 'rgba(59, 130, 246, 0.14)' },
  priorityHighText: { color: '#DC2626' },
  priorityMediumText: { color: '#D97706' },
  priorityLowText: { color: '#2563EB' },
  followupScheduled: { backgroundColor: 'rgba(59, 130, 246, 0.14)' },
  followupPending: { backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  followupCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
  followupScheduledText: { color: '#2563EB' },
  followupPendingText: { color: '#D97706' },
  followupCompletedText: { color: '#059669' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: 200,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    padding: 14,
    gap: 6,
  },
  infoLabel: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  timeline: {
    gap: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineRail: {
    width: 28,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 6,
    minHeight: 28,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  timelineMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  timelineDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 20,
  },
  timelineBy: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    padding: 14,
    gap: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  noteUser: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  noteTime: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '600',
  },
  noteContent: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  followupList: {
    gap: 10,
  },
  followupItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    padding: 14,
  },
  followupCell: {
    flex: 1,
    minWidth: 120,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  documentList: {
    gap: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    padding: 14,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  documentIconText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  documentMeta: {
    flex: 1,
    gap: 4,
  },
  documentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  documentDate: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '600',
  },
});
