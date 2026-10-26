import type { LeadResponse } from '../types/lead';

const providedText = (value?: string | number | null) => {
  const text = value == null ? '' : String(value).trim();
  return !text || /^(null|undefined)$/i.test(text) ? undefined : text;
};
export const getProspectMeetingTime = (...sources: (LeadResponse | null | undefined)[]) => {
  for (const source of sources) {
    const time = providedText(source?.bestTimeToMeet) ?? providedText(source?.bestTimeForMeeting);
    if (time) return time;
  }
  return undefined;
};
const valueText = (value?: string | number | null) => providedText(value) ?? 'Not provided';
const meetingTimes: Record<string, string> = {
  NINE_TO_TWELVE: '9:00 AM - 12:00 PM', TWELVE_TO_THREE: '12:00 PM - 3:00 PM',
  THREE_TO_SIX: '3:00 PM - 6:00 PM', SIX_TO_NINE: '6:00 PM - 9:00 PM',
};
const labelText = (value?: string) => value ? value.replace(/_/g, ' ') : 'Not provided';

export const prospectInfoFields = (lead: LeadResponse) => [
  { label: 'Prospect ID', value: valueText(lead.uniqueLeadId ?? lead.leadCode ?? lead.leadId), icon: 'identifier' },
  { label: 'Client Name', value: valueText(lead.clientName), icon: 'account-outline' },
  { label: 'Mobile Number', value: valueText(lead.mobileNumber), icon: 'phone-outline' },
  { label: 'Alternate Mobile', value: valueText(lead.alternateMobileNumber), icon: 'phone-plus-outline' },
  { label: 'Email', value: valueText(lead.email), icon: 'email-outline' },
  { label: 'Location', value: valueText(lead.location), icon: 'map-marker-outline' },
  { label: 'Clinic Address', value: valueText(lead.clinicAddress), icon: 'hospital-building' },
  { label: 'Profession / Speciality', value: valueText(lead.speciality), icon: 'briefcase-outline' },
  { label: 'Company Name', value: valueText(lead.companyName), icon: 'office-building-outline' },
  { label: 'Best Time to Meet', value: meetingTimes[getProspectMeetingTime(lead) ?? ''] ?? valueText(getProspectMeetingTime(lead)), icon: 'calendar-clock-outline' },
  { label: 'Prospect Source', value: labelText(lead.leadSource), icon: 'source-branch' },
  { label: 'Original Prospect Remarks', value: valueText(lead.remarks), icon: 'text-box-outline' },
  { label: 'Assigned To', value: valueText(lead.assignedEmployeeName), icon: 'account-check-outline' },
  { label: 'Employee Code', value: valueText(lead.assignedEmployeeCode), icon: 'badge-account-outline' },
  { label: 'Assigned By', value: valueText(lead.assignedByEmployeeName), icon: 'account-arrow-right-outline' },
  { label: 'Assigned By Code', value: valueText(lead.assignedByEmployeeCode), icon: 'badge-account-outline' },
  { label: 'Assignment Date', value: valueText(lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt), icon: 'calendar-outline' },
  { label: 'Assignment Source', value: valueText(lead.assignmentLabel ?? lead.assignmentSource), icon: 'source-branch' },
];
