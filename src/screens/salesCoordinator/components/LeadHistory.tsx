import { Linking,Platform,Pressable,Text,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { LeadResponse } from '../../../types/lead';
import type { MeetingResponse } from '../../../types/meeting';
import { prospectInfoFields } from '../../../utils/prospectDetails';
import { historyStyles,styles } from '../../salesCoordinatorStyles';
import { mapUrlFor,maskedMobile,show } from '../coordinatorUtils';
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

export function LeadHistoryContent({ lead, meetings, loading, progress, error }: { lead: LeadResponse; meetings: MeetingResponse[]; loading: boolean; progress: number; error: string | null }) {
  const isDone = (m: MeetingResponse) => ['COMPLETED', 'VERIFIED'].includes(String(m.meetingStatus ?? m.verificationStatus ?? '').toUpperCase());
  const verifiedMeeting = meetings.find((m) => m.verificationStatus === 'VERIFIED' || Boolean(m.verifiedBy) || Boolean(m.meetingVerificationDate) || Boolean(m.ageGroup) || Boolean(m.profession));
  const latest = meetings.find((m) => isDone(m) && (m.remarks || m.meetingRemarks || m.discussion));
  const latestRemarks = latest?.remarks ?? latest?.meetingRemarks ?? latest?.discussion ?? lead.remarks;
  const liveLocationUrl = meetings.map(mapUrlFor).find(Boolean);
  const leadFields = prospectInfoFields(lead).map(({ label, value }) => [label, label === 'Mobile Number' || label === 'Alternate Mobile' ? maskedMobile(value) : value]);
  const assignmentFields = [['Sales person', lead.assignedEmployeeName], ['Sales person ID', lead.assignedEmployeeCode], ['Sales coordinator', lead.assignedByEmployeeName], ['SC ID', lead.assignedByEmployeeCode], ['Assigned date', lead.assignedAt], ['Current status', lead.leadStatus?.replace(/_/g, ' ')]];
  const scFields = verifiedMeeting ? [['Verified by', verifiedMeeting.verifiedBy], ['Verification date', verifiedMeeting.meetingVerificationDate], ['Verification remarks', verifiedMeeting.verificationRemarks], ['Age group', verifiedMeeting.ageGroup], ['Prior investment', verifiedMeeting.existingSip], ['Profession', verifiedMeeting.profession], ['Firm / clinic', verifiedMeeting.professionDetail], ['Best time', verifiedMeeting.bestTimeForMeeting], ['Meeting date', verifiedMeeting.meetingDate], ['Meeting time', verifiedMeeting.meetingTiming], ['Alone / accompanied', verifiedMeeting.aloneWith], ['Meeting with', verifiedMeeting.meetingWith], ['Joined person', verifiedMeeting.personName], ['Position', verifiedMeeting.position]].filter(([, value]) => value !== undefined && value !== null && value !== '') : [];
  const section = (title: string, fields: (string | undefined)[][], tone: 'lead' | 'assignment' | 'verification') => <View style={[historyStyles.section, tone === 'lead' ? historyStyles.leadSection : tone === 'assignment' ? historyStyles.assignmentSection : historyStyles.verificationSection]}>
    <Text style={historyStyles.sectionTitle}>{title}</Text>
    <View style={styles.compactDetailGrid}>{fields.map(([label, value]) => <View key={label} style={[styles.detail, styles.compactDetail, historyStyles.detail]}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View>
    {tone === 'lead' ? <View style={historyStyles.latestRow}><View style={historyStyles.latestRemarks}><Text style={styles.label}>LATEST REMARKS</Text><Text numberOfLines={2} style={styles.detailValue}>{show(latestRemarks)}</Text></View><LiveLocationButton url={liveLocationUrl} /></View> : null}
  </View>;
  return <View style={styles.historyWrap}>
    {section('Lead details', leadFields, 'lead')}
    {section('Assignment details', assignmentFields, 'assignment')}
    {section('PC verification details', scFields, 'verification')}
    <View style={styles.historyTitleRow}><Text style={styles.sectionTitle}>Meeting history</Text><Text style={styles.historyCount}>{loading ? 'Loading...' : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}</Text></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <State loading progress={progress} message="Loading lead history..." /> : meetings.length ? <View style={historyStyles.meetingList}>{meetings.map((meeting, index) => <MeetingHistoryRow key={meeting.meetingCode ?? `${meeting.id ?? index}`} meeting={meeting} alternate={index % 2 === 1} />)}</View> : <State message="No meeting history is available for this lead yet." />}
  </View>;
}
