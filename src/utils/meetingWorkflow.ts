import type { MeetingFormSubmission, MeetingLeadStatus, MeetingWorkflowRequest } from '../types/meeting';

const MEETING_LEAD_STATUS: Record<NonNullable<MeetingFormSubmission['leadStatus']>, MeetingLeadStatus> = {
  'Work In Progress': 'WORK_IN_PROGRESS',
  'Converted as Client': 'CONVERTED_CLIENT',
  'Client Not Interested': 'CLIENT_NOT_INTERESTED',
  'Remove This Client': 'CLIENT_REMOVED',
  'Already Blueant Client': 'ALREADY_CLIENT',
};

export const toMeetingWorkflow = (form: MeetingFormSubmission): { meetingCode: string; workflow: MeetingWorkflowRequest } => {
  if (!form.meetingCode) throw new Error('No active meeting is available for this prospect.');
  if (form.meetingConducted === 'NOT_CONDUCTED') {
    return {
      meetingCode: form.meetingCode,
      workflow: {
        meetingConducted: 'NOT_CONDUCTED',
        meetingRemarks: form.remarks.trim(),
        nextPlanDate: form.nextPlanDate,
        latitude: form.latitude,
        longitude: form.longitude,
        ...(form.accuracy !== null && form.accuracy !== undefined ? { accuracy: form.accuracy } : {}),
      },
    };
  }
  if (!form.meetingMode || !form.leadStatus || !form.aloneWith) {
    throw new Error('Meeting details are incomplete.');
  }
  const meetingMode = form.meetingMode === 'Physical' ? 'PHYSICAL' : 'VIRTUAL/ONLINE';
  return {
    meetingCode: form.meetingCode,
    workflow: {
      meetingMode,
      meetingConducted: 'CONDUCTED',
      leadStatus: MEETING_LEAD_STATUS[form.leadStatus],
      aloneWith: form.aloneWith,
      remarks: form.remarks.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      address: form.address,
      ...(form.accuracy !== null && form.accuracy !== undefined ? { accuracy: form.accuracy } : {}),
      ...(form.visitingCard ? { visitingCard: form.visitingCard } : {}),
      ...(form.nextPlanDate ? { nextPlanDate: form.nextPlanDate } : {}),
    },
  };
};
