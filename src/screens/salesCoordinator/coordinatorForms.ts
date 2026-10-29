import type { MeetingResponse } from '../../types/meeting';
import type { ClientVerificationForm,VerificationForm } from './coordinatorTypes';
import { localToday,timeText } from './coordinatorUtils';

export const emptyAssignForm = () => ({ clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', bestTimeForMeeting: '', salesPersonEmployeeCode: '', assignedAt: localToday() });

export const emptyForm = (): VerificationForm => ({ meetingDate: '', meetingTiming: '', ageGroup: '', existingSip: '', profession: '', professionDetail: '', bestTimeForMeeting: '', meetingWith: '', personName: '', position: '' });

export const emptyClientVerificationForm = (meeting?: MeetingResponse): ClientVerificationForm => {
  const business = String(meeting?.businessGenerated ?? '').trim().toUpperCase();
  const time = timeText(meeting?.meetingTime);
  return {
    newMeetingDate: meeting?.meetingDate?.slice(0, 10) ?? localToday(), meetingTime: time === '—' ? '' : time,
    blueantAppUsed: '', aloneWith: meeting?.aloneWith === 'SOMEONE' ? 'SOMEONE' : 'SELF', personName: '', position: '',
    businessGenerated: business === 'YES' || business === 'NO' ? business : '', businessItems: [],
    // RM/SC meeting remarks are shown in the meeting context. Keep the PC
    // verification remark blank so it is stored as the PC's own response.
    remarks: '', nextFollowupDate: meeting?.nextMeetingDate?.slice(0, 10) ?? '', meetingDate: meeting?.meetingDate?.slice(0, 10) ?? localToday(), blueantAppLocked: false,
  };
};

export const clientInvestmentTotal = (form: ClientVerificationForm) => form.businessItems.reduce((total, item) => total + (item.amount.trim() ? Number(item.amount) : 0), 0);

export const clientBusinessTypes = (form: ClientVerificationForm) => form.businessGenerated === 'YES' ? form.businessItems.map((item) => item.businessType) : undefined;
