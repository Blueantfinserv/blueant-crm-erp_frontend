import { Picker } from '@react-native-picker/picker';
import { createElement } from 'react';
import { Platform,Pressable,ScrollView,Text,TextInput,useWindowDimensions,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { VerificationDropdown } from '../../../components/VerificationDropdown';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { MeetingResponse } from '../../../types/meeting';
import { popupStyles,styles,verificationStyles } from '../../salesCoordinatorStyles';
import { AGE_GROUP_LABELS,AGE_GROUP_OPTIONS,BEST_TIME_OPTIONS,CLIENT_BUSINESS_TYPES,CLIENT_POSITION_OPTIONS,clientBusinessDefinition,FIELDS,HOURS,MEETING_WITH_OPTIONS,NOT_CONDUCTED_FIELDS,POPUP_MIN_HEIGHT_FOR_NO_SCROLL,POPUP_STACK_WIDTH,POSITION_OPTIONS,PRIOR_INVESTMENT_OPTIONS,PROFESSION_LABELS,PROFESSION_OPTIONS } from '../coordinatorConstants';
import type { ClientBusinessType,ClientVerificationForm,VerificationForm } from '../coordinatorTypes';
import { isNotConductedMeeting,isValidAmount,isVerificationFieldVisible,localToday } from '../coordinatorUtils';
import { DatePickerField } from './CoordinatorCalendars';
import { SubmitButton } from './CoordinatorControls';
import { Details } from './MeetingDetails';

export const verificationPopupCss = `
#blueant-verification-popup { box-sizing: border-box; }
#blueant-verification-fields select {
  appearance: none !important; -webkit-appearance: none !important;
  width: 100%; min-width: 0; height: 40px !important; min-height: 40px !important;
  border: 1px solid #D5E1F1 !important; border-radius: 9px !important;
  padding: 0 32px 0 10px !important; background-color: #FFFFFF;
  color: #1E3353; font-size: 12px !important; line-height: normal;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23647793' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 9px center;
  cursor: pointer; transition: border-color .15s, box-shadow .15s;
}
#blueant-verification-fields select:hover { border-color: #9DB7E4 !important; }
#blueant-verification-fields select:focus-visible,
#blueant-verification-fields input:focus-visible {
  outline: 2px solid #2563EB; outline-offset: 1px;
  border-color: #2563EB !important;
}
#blueant-verification-fields select:disabled { background-color: #EFF3F8; color: #8693A8; cursor: not-allowed; }
#blueant-verification-fields input { min-width: 0; height: 40px !important; box-sizing: border-box; }
`;

export function LeadVerificationPopup({ meeting, form, setForm, submitError, submitting, onSubmit, onClose }: {
  meeting: MeetingResponse; form: VerificationForm; setForm: React.Dispatch<React.SetStateAction<VerificationForm>>;
  submitError: string | null; submitting: boolean; onSubmit: () => void; onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  // Browser zoom viewport ko chhota karta hai. Isliye layout sirf real mobile width par stack hota hai.
  // Height kam ho to 2 columns rahte hain, bas poora popup scroll hota hai.
  const stacked = width < POPUP_STACK_WIDTH;
  const scrollable = stacked || height < POPUP_MIN_HEIGHT_FOR_NO_SCROLL;
  const Container = scrollable ? ScrollView : View;
  const visitOnly = isNotConductedMeeting(meeting);
  return <Container nativeID="blueant-verification-popup" style={scrollable ? popupStyles.scroll : popupStyles.layout} {...(scrollable ? { contentContainerStyle: [popupStyles.layout, stacked && popupStyles.stacked], keyboardShouldPersistTaps: 'handled' as const } : {})}>
    {Platform.OS === 'web' ? createElement('style', null, verificationPopupCss) : null}
    <View style={[popupStyles.sidebar, stacked && popupStyles.sidebarStacked]}>
      <View style={popupStyles.status}><View style={popupStyles.statusDot} /><Text style={popupStyles.statusText}>PENDING VERIFICATION</Text></View>
      <Text style={popupStyles.clientName}>{meeting.clientName ?? meeting.meetingCode}</Text>
      <Details meeting={meeting} visitOnly={visitOnly} presentation="sidebar" />
    </View>
    <View style={popupStyles.main}>
      <View style={popupStyles.heading}>
        <View style={popupStyles.headingIcon}><Icon source="calendar-check-outline" size={28} color="#2563EB" /></View>
        <View style={popupStyles.headingCopy}><Text style={popupStyles.title}>Meeting Details</Text></View>
        <Pressable accessibilityLabel="Close meeting verification" onPress={onClose} style={popupStyles.close}><Icon source="close" size={23} color="#23416A" /></Pressable>
      </View>
      <View style={popupStyles.mainBody}>
        <Details meeting={meeting} visitOnly={visitOnly} presentation="summary" />
        <View style={popupStyles.formCard}>
          <View style={popupStyles.formHeading}><Icon source="file-document-outline" size={20} color="#2563EB" /><Text style={popupStyles.formTitle}>{visitOnly ? 'Verify Location Visit' : 'PC Additional Information'}</Text></View>
          {visitOnly ? <Text style={styles.help}>Confirm only the date and time of this visited-but-not-met record.</Text> : null}
          <View nativeID="blueant-verification-fields" style={[styles.formGrid, popupStyles.formGrid]}>{(visitOnly ? NOT_CONDUCTED_FIELDS : FIELDS).map((field) => <VerificationFormField key={field.key} field={field} form={form} setForm={setForm} />)}</View>
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        </View>
        <View style={popupStyles.footer}>
          <View style={popupStyles.submitWrap}><SubmitButton submitting={submitting} onPress={onSubmit} label={visitOnly ? 'Verify Visit' : 'Verify Meeting'} blue /></View>
        </View>
      </View>
    </View>
  </Container>;
}

export function ClientVerificationFields({ meeting, form, setForm, submitError, submitting, onSubmit }: { meeting: MeetingResponse; form: ClientVerificationForm; setForm: React.Dispatch<React.SetStateAction<ClientVerificationForm>>; submitError: string | null; submitting: boolean; onSubmit: () => void }) {
  const { isDark } = useAppTheme();
  const notConducted = isNotConductedMeeting(meeting);
  const pickerOptionColor = isDark ? '#FFFFFF' : '#000000';
  const amountError = Boolean(submitError?.startsWith('Enter a valid amount'));
  const update = <K extends keyof ClientVerificationForm>(key: K, value: ClientVerificationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const dateField = (label: string, key: 'newMeetingDate' | 'meetingDate') => <DatePickerField key={key} label={label} value={form[key]} placeholder="Choose date" maxDate={localToday()} onSelect={(value) => update(key, value)} style={verificationStyles.field} />;
  const remarksField = <View style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>Remarks</Text><TextInput value={form.remarks} onChangeText={(value) => update('remarks', value)} placeholder="Verification remarks" placeholderTextColor="#94A3B8" multiline style={[styles.input, verificationStyles.input, verificationStyles.textarea]} /></View>;
  const select = (label: string, key: 'aloneWith' | 'businessGenerated' | 'blueantAppUsed' | 'position', options: readonly string[]) => <View key={key} style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>{label}</Text><View style={[styles.pickerShell, verificationStyles.control]}><Picker enabled={!(key === 'blueantAppUsed' && form.blueantAppLocked)} selectedValue={form[key]} onValueChange={(value) => { const next = String(value); if (key === 'aloneWith' && next === 'SELF') setForm((current) => ({ ...current, aloneWith: next, personName: '', position: '' })); else if (key === 'businessGenerated' && next !== 'YES') setForm((current) => ({ ...current, businessGenerated: next, businessItems: [] })); else update(key, next); }} style={[styles.picker, verificationStyles.control]}><Picker.Item label={`Select ${label.toLowerCase()}`} value="" color={pickerOptionColor} />{options.map((option) => <Picker.Item key={option} label={option === 'SOMEONE' ? 'Someone' : option === 'SELF' ? 'Alone' : option === 'SUPER_ADMIN' ? 'Super Admin' : option === 'TL' ? 'Team Leader' : option === 'SM' ? 'Sales Manager' : option} value={option} color={pickerOptionColor} />)}</Picker></View></View>;
  const toggleBusinessItem = (businessType: ClientBusinessType) => setForm((current) => ({
    ...current,
    businessItems: current.businessItems.some((item) => item.businessType === businessType)
      ? current.businessItems.filter((item) => item.businessType !== businessType)
      : [...current.businessItems, { businessType, amount: '' }],
  }));
  const updateBusinessAmount = (businessType: ClientBusinessType, amount: string) => setForm((current) => ({
    ...current,
    businessItems: current.businessItems.map((item) => item.businessType === businessType ? { ...item, amount } : item),
  }));
  const selectedBusinessDetails = () => <View style={verificationStyles.investmentDetailsGrid}>{form.businessItems.map((item) => {
    const definition = clientBusinessDefinition(item.businessType);
    const invalid = amountError && (definition.requiresAmount || item.amount.trim()) && !isValidAmount(item.amount);
    return <View key={item.businessType} style={verificationStyles.investmentDetailCard}><View style={verificationStyles.investmentDetailHeading}><View style={verificationStyles.investmentDetailIcon}><Icon source={definition.icon} size={14} color="#3156C8" /></View><View><Text style={verificationStyles.investmentDetailTitle}>{definition.label}</Text><Text style={verificationStyles.investmentDetailCaption}>{definition.requiresAmount ? 'Amount required — enter 0 if applicable.' : 'Amount optional — leave blank if it does not apply.'}</Text></View></View><View style={verificationStyles.investmentInputField}><Text style={styles.fieldLabel}>{definition.requiresAmount ? 'Amount *' : 'Amount (optional)'}</Text><TextInput value={item.amount} onChangeText={(amount) => updateBusinessAmount(item.businessType, amount)} placeholder="Enter amount" placeholderTextColor="#94A3B8" keyboardType="numeric" style={[styles.input, verificationStyles.input, invalid && verificationStyles.investmentInputInvalid]} />{invalid ? <Text style={verificationStyles.investmentInputError}>Enter 0 or a positive number.</Text> : null}</View></View>;
  })}</View>;
  const [selectedHour = ''] = form.meetingTime.split(':');
  const meetingTime = <View style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>Meeting Time</Text><View style={[styles.pickerShell, verificationStyles.control]}><Picker selectedValue={selectedHour} onValueChange={(hour) => update('meetingTime', hour ? `${hour}:00:00` : '')} style={[styles.picker, verificationStyles.control]}><Picker.Item label="Hour" value="" color={pickerOptionColor} />{HOURS.map((hour) => <Picker.Item key={hour} label={hour} value={hour} color={pickerOptionColor} />)}</Picker></View></View>;
  return <View style={[styles.formSection, verificationStyles.section]}>
    <Text style={styles.sectionTitle}>{notConducted ? 'Client Meeting Not Conducted' : 'Client PC Verification'}</Text>
    <Text style={styles.help}>{notConducted ? 'Confirm the meeting date, remarks and next follow-up plan.' : 'Complete the Client Meeting verification details.'}</Text>
    <View style={styles.formGrid}>
      {notConducted ? <>{dateField('Meeting Date', 'meetingDate')}{remarksField}</> : <>
        {dateField('Meeting Date', 'newMeetingDate')}{meetingTime}{select('BlueAnt App Used', 'blueantAppUsed', ['YES', 'NO'])}
        {select('Along With', 'aloneWith', ['SELF', 'SOMEONE'])}
        {form.aloneWith === 'SOMEONE' ? <><View style={[styles.field, verificationStyles.field]}><Text style={styles.fieldLabel}>Person Name *</Text><TextInput value={form.personName} onChangeText={(value) => update('personName', value)} placeholder="Person name" placeholderTextColor="#94A3B8" style={[styles.input, verificationStyles.input]} /></View>{select('Person Designation *', 'position', CLIENT_POSITION_OPTIONS)}</> : null}
        {select('Business/Service Request', 'businessGenerated', ['YES', 'NO'])}
        {form.businessGenerated === 'YES' ? <View style={verificationStyles.investmentPanel}><View style={verificationStyles.investmentPanelHeader}><View style={verificationStyles.investmentPanelIcon}><Icon source="chart-box-outline" size={17} color="#3156C8" /></View><View style={verificationStyles.investmentPanelCopy}><Text style={verificationStyles.investmentPanelTitle}>Business Details</Text><Text style={verificationStyles.investmentPanelSubtitle}>Choose every applicable business category. Amount is required only for monetary categories.</Text></View></View><View style={verificationStyles.referenceTypes}>{CLIENT_BUSINESS_TYPES.map((definition) => { const chosen = form.businessItems.some((item) => item.businessType === definition.type); return <Pressable key={definition.type} onPress={() => toggleBusinessItem(definition.type)} style={[verificationStyles.referenceType, chosen && verificationStyles.referenceTypeSelected]}><Text style={[verificationStyles.referenceTypeText, chosen && verificationStyles.referenceTypeTextSelected]}>{definition.label}</Text></Pressable>; })}</View>{selectedBusinessDetails()}</View> : null}
        {remarksField}
      </>}
    </View>
    {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
    <SubmitButton submitting={submitting} onPress={onSubmit} label="Verify Client Meeting" />
  </View>;
}

export function VerificationFormField({ field, form, setForm }: { field: typeof FIELDS[number]; form: VerificationForm; setForm: React.Dispatch<React.SetStateAction<VerificationForm>> }) {
  const update = (value: string) => setForm((current) => ({
    ...current,
    [field.key]: value,
    ...(field.key === 'meetingWith' && value === 'SELF' ? { personName: '', position: '' } : {}),
  }));
  const tone = field.key === 'meetingTiming' || field.key === 'ageGroup' ? styles.fieldToneBlue : field.key === 'existingSip' || field.key === 'profession' ? styles.fieldToneTeal : field.key === 'professionDetail' || field.key === 'bestTimeForMeeting' ? styles.fieldToneViolet : styles.fieldToneAmber;
  const { width } = useWindowDimensions();
  const layoutStyle = [popupStyles.formField, width < POPUP_STACK_WIDTH && { flexBasis: '100%' as const }];

  if (!isVerificationFieldVisible(field.key, form.meetingWith)) return null;

  if (field.key === 'meetingDate') {
    return <DatePickerField label={field.label} value={form.meetingDate} placeholder={field.placeholder} maxDate={localToday()} onSelect={update} style={[verificationStyles.field, layoutStyle]} tone={tone} controlStyle={popupStyles.control} />;
  }
  if (field.key === 'meetingTiming') {
    const [selectedHour = ''] = form.meetingTiming.split(':');
    return (
      <View style={[styles.field, tone, verificationStyles.field, layoutStyle]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <VerificationDropdown label={field.label} value={selectedHour} onChange={(hour) => update(hour ? `${hour}:00:00` : '')} options={[{ label: 'Hour', value: '' }, ...HOURS.map((hour) => ({ label: hour, value: hour }))]} />
      </View>
    );
  }

  const options = field.key === 'existingSip' ? PRIOR_INVESTMENT_OPTIONS
    : field.key === 'bestTimeForMeeting' ? BEST_TIME_OPTIONS
    : field.key === 'ageGroup' ? AGE_GROUP_OPTIONS
    : field.key === 'profession' ? PROFESSION_OPTIONS
    : field.key === 'meetingWith' ? MEETING_WITH_OPTIONS
    : field.key === 'position' ? POSITION_OPTIONS
    : null;
  const optionLabel = (option: string) => field.key === 'ageGroup' ? AGE_GROUP_LABELS[option] : field.key === 'profession' ? PROFESSION_LABELS[option] : field.key === 'meetingWith' ? option === 'SELF' ? 'Self' : 'With someone' : option;
  if (options) {
    return (
      <View style={[styles.field, tone, verificationStyles.field, layoutStyle]}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <VerificationDropdown label={field.label} value={form[field.key]} onChange={update} options={[{ label: 'Select an option', value: '' }, ...options.map((option) => ({ label: optionLabel(option), value: option }))]} />
      </View>
    );
  }
  return <View style={[styles.field, tone, verificationStyles.field, layoutStyle]}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput value={form[field.key]} onChangeText={update} placeholder={field.placeholder} style={[styles.input, verificationStyles.input, popupStyles.control]} /></View>;
}
