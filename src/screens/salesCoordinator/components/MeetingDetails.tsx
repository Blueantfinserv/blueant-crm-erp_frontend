import { Linking,Pressable,Text,View } from 'react-native';
import { Icon } from 'react-native-paper';
import type { MeetingResponse } from '../../../types/meeting';
import { popupStyles,styles } from '../../salesCoordinatorStyles';
import { FIELDS } from '../coordinatorConstants';
import { employeeRoleLabels,mapUrlFor,maskedMobile,show,timeText } from '../coordinatorUtils';

export function Details({ meeting: m, visitOnly = false, presentation }: { meeting: MeetingResponse; visitOnly?: boolean; presentation?: 'sidebar' | 'summary' }) {
  const meetingPlace = m.meetingLocation ?? m.location ?? m.address;
  const mapUrl = mapUrlFor(m);
  const overviewFields: [string, unknown][] = [['Meeting Type', m.meetingTitle ?? m.meetingType], ['Meeting Date', m.meetingDate], ['Next Plan Date', m.nextMeetingDate]];
  if (!visitOnly) overviewFields.push(['Lead Status', m.leadStatus?.replace(/_/g, ' ')]);
  const employeeLabels = employeeRoleLabels(m);
  const clientDetails = m.isClientMeeting && (m.clinicAddress || m.speciality) ? [m.speciality, m.clinicAddress].filter(Boolean).join(' · ') : '';
  const contactFields: [string, unknown][] = [['Mobile Number', maskedMobile(m.mobileNumber)]];
  if (m.isClientMeeting) contactFields.push(['Alternate Mobile', maskedMobile(m.alternateMobileNumber)], ['Email', m.email]);
  contactFields.push([employeeLabels.person, m.employeeName], [employeeLabels.id, m.employeeCode]);
  if (m.meetingCode || m.id) contactFields.push(['Meeting ID', m.meetingCode ?? m.id]);
  if (!visitOnly) {
    contactFields.push(['Joined With', m.aloneWith]);
    if (clientDetails) contactFields.push(['Client Details', clientDetails]);
  }
  if (presentation === 'summary') return <View style={popupStyles.sidebarCards}><View style={popupStyles.summaryGrid}>{overviewFields.map(([label, field], index) => <View key={label} style={[popupStyles.summaryCard, index === 3 && popupStyles.summaryStatus]}><Icon source={index === 3 ? 'chart-timeline-variant' : 'calendar-outline'} size={20} color="#2563EB" /><View style={popupStyles.summaryCopy}><Text style={popupStyles.label}>{label}</Text><Text numberOfLines={index === 3 ? 1 : undefined} adjustsFontSizeToFit={index === 3} minimumFontScale={0.8} style={[popupStyles.value, index === 3 && popupStyles.statusValue]}>{show(field)}</Text></View></View>)}</View>
    {(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks) ? <View style={popupStyles.remarks}><View style={popupStyles.formHeading}><Icon source="comment-text-outline" size={18} color="#A16207" /><Text style={popupStyles.cardTitle}>Remarks</Text></View><Text style={popupStyles.bodyText}>{show(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks)}</Text></View> : null}
  </View>;
  if (presentation === 'sidebar') return <View style={popupStyles.sidebarCards}>
    <View style={popupStyles.infoCard}><View style={popupStyles.formHeading}><Icon source="account-box-outline" size={20} color="#2563EB" /><Text style={popupStyles.cardTitle}>Client Information</Text></View>
      {contactFields.map(([label, field]) => <View key={label} style={popupStyles.contactRow}><Text style={popupStyles.contactLabel}>{label}</Text><Text style={popupStyles.contactValue}>{show(field)}</Text></View>)}
    </View>
    {meetingPlace || mapUrl ? <View style={popupStyles.locationCard}>
      {meetingPlace ? <><View style={popupStyles.formHeading}><Icon source="map-marker-outline" size={20} color="#2563EB" /><Text style={popupStyles.cardTitle}>{m.isClientMeeting ? 'Client Location' : 'Meeting Location'}</Text></View><Text style={popupStyles.bodyText}>{show(meetingPlace)}</Text></> : null}
      {mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={popupStyles.mapButton}><Icon source="google-maps" size={18} color="#2563EB" /><Text style={popupStyles.mapText}>Open in Google Maps</Text></Pressable> : null}
    </View> : null}
  </View>;
  return <View style={styles.detailsWrap}>
    <View style={styles.overviewGrid}>{overviewFields.map(([label, field], index) => <View key={label} style={[styles.overviewCard, [styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.overviewStatusCard][index]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={[styles.overviewValue, index === 3 && styles.overviewStatusText]}>{show(field)}</Text></View>)}</View>
    <View style={styles.contactGrid}>{contactFields.map(([label, field], index) => <View key={label} style={[styles.contactCard, label === 'Joined With' && styles.contactCardCompact, label === 'Client Details' && styles.clientDetailsContactCard, [styles.toneSlate, styles.toneBlue, styles.toneViolet, styles.toneTeal, styles.toneAmber][index % 5]]}><Text style={styles.label}>{label}</Text><Text numberOfLines={label === 'Client Details' ? undefined : 1} style={styles.detailValue}>{show(field)}</Text></View>)}</View>
    <View style={styles.contextGrid}>
      {(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks) ? <View style={[styles.contextCard, styles.remarksCard, styles.remarksWide]}><View style={styles.contextHeading}><Icon source="comment-text-outline" size={15} color="#A16207" /><Text style={styles.contextLabel}>REMARKS</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(m.isClientMeeting ? m.meetingRemarks ?? m.remarks : m.remarks ?? m.meetingRemarks)}</Text></View> : null}
      {meetingPlace ? <View style={[styles.contextCard, styles.locationCard, styles.locationNarrow]}><View style={styles.contextHeading}><Icon source="map-marker-outline" size={15} color="#0F766E" /><Text style={styles.contextLabel}>{m.isClientMeeting ? 'CLIENT LOCATION' : 'MEETING LOCATION'}</Text></View><Text numberOfLines={2} style={styles.contextValue}>{show(meetingPlace)}</Text></View> : null}
      {mapUrl ? <Pressable onPress={() => void Linking.openURL(mapUrl)} style={[styles.mapButton, styles.mapButtonCompact]}><Icon source="map-marker-radius" size={17} color="#FFFFFF" /><Text style={styles.mapButtonText}>Open in Google Maps</Text></Pressable> : null}
    </View>
  </View>;
}

export function DetailGrid({ fields }: { fields: readonly (readonly [string, unknown])[] }) {
  return <View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{show(value)}</Text></View>)}</View>;
}

export function VerificationDetails({ meeting: m }: { meeting: MeetingResponse }) {
  const fields = [['Verified By', m.verifiedBy], ['Verification Date', m.meetingVerificationDate], ...FIELDS.map((field) => [field.label, m[field.key]] as const)] as const;
  return <View style={styles.formSection}><Text style={styles.sectionTitle}>Process Coordinator Response</Text><DetailGrid fields={fields} /></View>;
}

export function ClientVerificationDetails({ meeting: m }: { meeting: MeetingResponse }) {
  const fields = ([['Meeting Date', m.meetingDate], ['Meeting Time', timeText(m.meetingTime)], ['BlueAnt App Used', m.blueantAppUsed], ['Along With', m.aloneWith], ['Person Name', m.personName], ['Person Designation', m.position], ['Business/Service Request', m.businessGenerated], ['Investment Types', m.businessTypes?.join(', ') ?? m.investmentType], ['Total Investment Amount', m.investmentAmount], ['Remarks by PC', m.verificationRemarks ?? m.remarks]] as const).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return <View style={styles.formSection}><Text style={styles.sectionTitle}>Client PC Verification Response</Text><DetailGrid fields={fields} /></View>;
}
