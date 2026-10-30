import { MobileDetailSection } from './MobileDetailSection';
import { Linking,Platform,Pressable,Text,useWindowDimensions,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { LeadResponse } from '../../../types/lead';
import type { MeetingResponse } from '../../../types/meeting';
import { prospectInfoFields } from '../../../utils/prospectDetails';
import { historyStyles,styles } from '../../salesCoordinatorStyles';
import { mapUrlFor,show } from '../coordinatorUtils';
import { State } from './CoordinatorControls';

export function MeetingHistoryRow({ meeting, alternate }: { meeting: MeetingResponse; alternate: boolean }) {
  const status = String(meeting.meetingStatus ?? meeting.leadStatus ?? 'PENDING').replace(/_/g, ' ');
  const normalized = status.toUpperCase();
  const statusStyle = normalized.includes('COMPLETED') ? historyStyles.statusCompleted : normalized.includes('SCHEDULED') ? historyStyles.statusScheduled : historyStyles.statusPending;
  const completed = normalized.includes('COMPLETED') || normalized.includes('VERIFIED');
  const remark = completed ? meeting.remarks ?? meeting.meetingRemarks ?? meeting.discussion : null;
  const tags = [
    meeting.meetingTiming ? { key: 'time', icon: 'clock-outline', label: `Time: ${meeting.meetingTiming}`, style: historyStyles.tagTime, color: '#1D4ED8' } : null,
    meeting.meetingWith ? { key: 'join', icon: 'account-multiple-outline', label: `Joined: ${meeting.meetingWith.replace(/_/g, ' ')}`, style: historyStyles.tagJoin, color: '#0F766E' } : null,
    meeting.personName ? { key: 'person', icon: 'account-outline', label: `Person: ${meeting.personName}`, style: historyStyles.tagPerson, color: '#7C3AED' } : null,
    meeting.position ? { key: 'position', icon: 'briefcase-outline', label: `Position: ${meeting.position}`, style: historyStyles.tagPosition, color: '#9A3412' } : null,
  ].filter(Boolean) as { key: string; icon: string; label: string; style: object; color: string }[];
  return <View style={[historyStyles.meetingCard, alternate && historyStyles.meetingCardAlt]}>
    <View style={historyStyles.meetingCardTop}>
      <View style={historyStyles.meetingTitleBlock}><Text style={historyStyles.meetingTitle}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text><Text style={historyStyles.meetingDate}>{show(meeting.meetingDate)}</Text></View>
      <Text style={[historyStyles.meetingStatus, statusStyle]}>{status}</Text>
    </View>
    {tags.length ? <View style={historyStyles.meetingTagsRow}>{tags.map((tag) => <View key={tag.key} style={[historyStyles.meetingTag, tag.style]}><Icon source={tag.icon} size={11} color={tag.color} /><Text style={[historyStyles.meetingTagText, { color: tag.color }]}>{tag.label}</Text></View>)}</View> : null}
    {remark ? <View style={historyStyles.meetingRemarkBlock}><Text style={historyStyles.meetingRemarkLabel}>REMARKS</Text><Text style={historyStyles.meetingRemarkText}>{remark}</Text></View> : null}
  </View>;
}

export function LiveLocationButton({ url }: { url: string | null | undefined }) {
  const { isDark } = useAppTheme();
  const sourceColor = isDark && Platform.OS === 'web' ? '#000000' : '#FFFFFF';
  return <Pressable disabled={!url} onPress={() => { if (url) void Linking.openURL(url); }} style={[historyStyles.liveLocationButton, !url && historyStyles.liveLocationDisabled]}><Icon source="map-marker-radius" size={16} color={sourceColor} /><Text style={[historyStyles.liveLocationText, isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>Live location</Text></Pressable>;
}

export function LeadHistoryContent({ lead, meetings, loading, progress, error, onProgressComplete }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; progress: number; error: string | null; onProgressComplete?: () => void }) {
  const compact = useWindowDimensions().width < 760;
  const verifiedMeeting = meetings.find((m) => m.verificationStatus === 'VERIFIED' || Boolean(m.verifiedBy) || Boolean(m.meetingVerificationDate) || Boolean(m.ageGroup) || Boolean(m.profession));
  const liveLocationUrl = meetings.map(mapUrlFor).find(Boolean);
  const hiddenLeadFields = new Set(['Prospect ID', 'Mobile Number', 'Alternate Mobile', 'Email', 'Company Name', 'Best Time to Meet', 'Prospect Source', 'Assignment Date', 'Assignment Source', 'Assigned By', 'Assigned By Code']);
  const leadFields = prospectInfoFields(lead).filter(({ label }) => !hiddenLeadFields.has(label)).map(({ label, value }) => [label, value]);
  const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting], ['Meeting date', verifiedMeeting.meetingDate], ['Meeting time', verifiedMeeting.meetingTiming], ['Alone / accompanied', verifiedMeeting.aloneWith], ['Meeting with', verifiedMeeting.meetingWith], ['Joined person', verifiedMeeting.personName], ['Position', verifiedMeeting.position]].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const section = (title: string, fields: (string | undefined)[][], tone: 'lead' | 'assignment' | 'verification') => <View style={[historyStyles.section, tone === 'lead' ? historyStyles.leadSection : tone === 'assignment' ? historyStyles.assignmentSection : historyStyles.verificationSection]}>
    {!compact ? <Text style={historyStyles.sectionTitle}>{title}</Text> : null}
    <View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, historyStyles.detail, compact && { width: '47%', flexBasis: '47%', minWidth: 0, paddingHorizontal: 7, paddingVertical: 6 }]}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View>
    {tone === 'lead' ? <LiveLocationButton url={liveLocationUrl} /> : null}
  </View>;
  return <View style={styles.historyWrap}>
    {compact ? <MobileDetailSection title="Lead details" initiallyOpen>{section('Lead details', leadFields, 'lead')}</MobileDetailSection> : section('Lead details', leadFields, 'lead')}
    {compact ? <MobileDetailSection title="Assignment details">{section('Assignment details', assignmentFields, 'assignment')}</MobileDetailSection> : section('Assignment details', assignmentFields, 'assignment')}
    {compact ? <MobileDetailSection title="PC verification details">{section('PC verification details', scFields, 'verification')}</MobileDetailSection> : section('PC verification details', scFields, 'verification')}
    <View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <State loading progress={progress} message="Loading lead history..." onProgressComplete={onProgressComplete} /> : meetings.length ? <View style={historyStyles.meetingList}>{meetings.map((meeting, index) => <MeetingHistoryRow key={meeting.meetingCode ?? `${meeting.id ?? index}`} meeting={meeting} alternate={index % 2 === 1} />)}</View> : <State message="No meeting history is available for this lead yet." />}
  </View>;
}
