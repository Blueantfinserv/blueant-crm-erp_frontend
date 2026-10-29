import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import type { MeetingResponse } from '../../../types/meeting';
import { isNotConductedMeeting, maskedMobile, meetingRole, show } from '../coordinatorUtils';

type Props = { items: readonly MeetingResponse[]; action?: string; verified?: boolean; hideMobileNumber?: boolean; onOpen?: (meeting: MeetingResponse) => void };
export function MobileMeetingCards({ items, action, verified, onOpen, hideMobileNumber = false }: Props) {
  return <View>{items.map((meeting, index) => {
    const verificationRow = verified || action === 'Verify Details';
    const conducted = isNotConductedMeeting(meeting) ? 'Not conducted' : meeting.meetingConducted === 'CONDUCTED' ? 'Conducted' : show(meeting.meetingConducted);
    if (verificationRow) return <View key={meeting.meetingCode ?? meeting.id ?? index} style={[mobile.row, mobile.verificationRow, verified ? mobile.verifiedRow : mobile.todayRow, index % 2 === 1 && (verified ? mobile.verifiedAlternate : mobile.todayAlternate)]}>
      <View style={mobile.copy}>
        <View style={mobile.verificationTop}>
          <View style={mobile.identity}>
            <Text numberOfLines={2} style={mobile.leadName}>{show(meeting.clientName)}</Text>
            <Text numberOfLines={1} style={[mobile.meetingType, verified && mobile.verifiedType]}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text>
            <View style={mobile.personRow}><Icon source="account-outline" size={13} color="#64748B" /><Text numberOfLines={1} style={mobile.personName}>{show(meeting.employeeName)}</Text><Text style={mobile.role}>{meetingRole(meeting)}</Text></View>
          </View>
          <View style={mobile.actionColumn}>
            <Text style={[mobile.status, isNotConductedMeeting(meeting) && mobile.notConducted]}>{conducted}</Text>
            {onOpen ? <Pressable accessibilityRole="button" accessibilityLabel={`${verified ? 'Details' : 'Verify'} for ${show(meeting.clientName)}`} onPress={() => onOpen(meeting)} style={[mobile.verify, verified && mobile.detailsButton]}><Text style={[mobile.verifyText, verified && mobile.detailsText]}>{verified ? 'Details' : 'Verify'}</Text><Icon source="chevron-right" size={15} color={verified ? '#0F766E' : '#4338CA'} /></Pressable> : null}
          </View>
        </View>
        {verified ? <View style={mobile.dateRow}><View style={mobile.dateCell}><Text style={mobile.dateLabel}>Meeting date</Text><Text style={mobile.meta}>{show(meeting.meetingDate)}</Text></View><View style={mobile.dateCell}><Text style={mobile.dateLabel}>Next plan date</Text><Text style={mobile.meta}>{show(meeting.nextMeetingDate)}</Text></View></View> : null}
      </View>
    </View>;
    const content = <><View style={mobile.copy}>
      <View style={mobile.top}><Text numberOfLines={1} style={mobile.name}>{show(meeting.clientName)}</Text><Text numberOfLines={1} style={mobile.type}>{show(meeting.meetingTitle ?? meeting.meetingType)}</Text></View>
      <Text numberOfLines={1} style={mobile.meta}>{show(meeting.employeeName)}{!hideMobileNumber ? `  |  ${show(maskedMobile(meeting.mobileNumber))}` : ''}</Text>
      <Text numberOfLines={1} style={mobile.dates}>{verified ? `Verified: ${show(meeting.verifiedBy)}  |  ` : ''}{show(meeting.meetingDate)}{meeting.nextMeetingDate ? `  >  ${meeting.nextMeetingDate}` : ''}</Text>
    </View>{onOpen ? <View style={mobile.chevron}><Icon source="chevron-right" size={19} color="#4F46E5" /></View> : null}</>;
    const key = meeting.meetingCode ?? meeting.id ?? index;
    const rowStyle = [mobile.row, index % 2 === 1 && mobile.alternate];
    return onOpen ? <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${action ?? 'View details'} for ${show(meeting.clientName)}`} onPress={() => onOpen(meeting)} style={({ pressed }) => [...rowStyle, pressed && mobile.pressed]}>{content}</Pressable> : <View key={key} style={rowStyle}>{content}</View>;
  })}</View>;
}
const mobile = StyleSheet.create({
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E7ECF4', backgroundColor: '#FFFFFF' },
  verificationRow: { borderLeftWidth: 3 },
  todayRow: { borderLeftColor: '#818CF8', backgroundColor: '#FAFAFF' },
  todayAlternate: { backgroundColor: '#EEF2FF' },
  verifiedRow: { borderLeftColor: '#2DD4BF', backgroundColor: '#F7FFFC' },
  verifiedAlternate: { backgroundColor: '#EAF8F3' },
  verifiedType: { color: '#0F766E' },
  detailsButton: { backgroundColor: '#CCF0E6' },
  detailsText: { color: '#0F766E' },
  verificationTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  leadName: { color: '#172B50', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  meetingType: { color: '#6366F1', fontSize: 11, lineHeight: 15 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personName: { flexShrink: 1, color: '#52627C', fontSize: 11, lineHeight: 16 },
  actionColumn: { width: 90, alignItems: 'flex-end', gap: 6 },
  dateRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E7ECF4', paddingTop: 8, marginTop: 4, gap: 12 },
  dateCell: { flex: 1, minWidth: 0 },
  alternate: { backgroundColor: '#F6F8FC' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#172B50' },
  type: { maxWidth: '36%', fontSize: 10, lineHeight: 17, fontWeight: '600', color: '#4F46E5' },
  meta: { fontSize: 11, lineHeight: 15, color: '#52627C' },
  dates: { fontSize: 10, lineHeight: 14, color: '#71809A' },
  role: { fontSize: 10, fontWeight: '700', color: '#4338CA', backgroundColor: '#E9EEFF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  dateLabel: { fontSize: 10, color: '#71809A', marginBottom: 2 },
  status: { fontSize: 10, lineHeight: 14, textAlign: 'right', fontWeight: '700', color: '#15803D' },
  notConducted: { color: '#B91C1C' },
  verify: { minHeight: 40, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', borderRadius: 7 },
  verifyText: { color: '#4338CA', fontSize: 12, fontWeight: '700' },
  chevron: { width: 24, alignItems: 'center' },
  pressed: { backgroundColor: '#EEF2FF' },
});
