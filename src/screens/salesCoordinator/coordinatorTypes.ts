import type { MeetingVerificationRequest } from '../../types/meeting';

export type Tab = 'today' | 'responses' | 'tasks' | 'assign' | 'assignedLeads';

export type VerificationField = NonNullable<keyof MeetingVerificationRequest>;

export type VerificationForm = Record<Exclude<VerificationField, 'aloneWith'>, string>;

export type ClientBusinessType = 'SIP' | 'LUMP_SUM' | 'INSURANCE' | 'SHARES' | 'LOAN' | 'SERVICE_REQUEST' | 'BROKER_CHANGE';

export type ClientBusinessItemForm = { businessType: ClientBusinessType; amount: string };

export type ClientVerificationForm = {
  newMeetingDate: string; meetingTime: string; blueantAppUsed: string; aloneWith: string;
  personName: string; position: string; businessGenerated: string;
  businessItems: ClientBusinessItemForm[]; remarks: string; nextFollowupDate: string; meetingDate: string; blueantAppLocked: boolean;
};

export type MeetingColumnFilter = Partial<Record<'clientName' | 'meetingTitle' | 'employeeName' | 'employeeRole' | 'leadStatus' | 'meetingDate' | 'nextMeetingDate' | 'aloneWith' | 'meetingConducted' | 'verifiedBy', string>>;

export type AssignedDateRange = { from: string; to: string };

export type VerificationPage = { content?: { meetingCode?: string; verificationStatus?: string }[]; totalPages?: number };
