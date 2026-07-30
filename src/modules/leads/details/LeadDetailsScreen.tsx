import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme/theme';
import {
  ActivityTimeline,
  DocumentCard,
  FollowupCard,
  LeadHeader,
  LeadInfoCard,
  NotesCard,
} from './LeadDetailsComponents';
import {
  followupItems as defaultFollowupItems,
  leadDocuments,
  leadInfo,
  leadNotes,
  timelineActivities,
} from './leadDetailsData';
import type { FollowupItem } from './leadDetailsData';

export function LeadDetailsScreen({
  onBack,
  followups = defaultFollowupItems,
  onAddFollowup,
}: {
  onBack?: () => void;
  followups?: FollowupItem[];
  onAddFollowup?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <LeadHeader
          name={leadInfo.customerName}
          company={leadInfo.company}
          status={leadInfo.leadStatus}
          priority={leadInfo.priority}
          onAddFollowup={onAddFollowup}
        />

        <LeadInfoCard lead={leadInfo} />
        <ActivityTimeline activities={timelineActivities} />
        <NotesCard notes={leadNotes} />
        <FollowupCard followups={followups} />
        <DocumentCard documents={leadDocuments} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  shell: {
    gap: 20,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
