export const LEAD_SOURCES = [
  'WEBSITE',
  'GOOGLE',
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'YOUTUBE',
  'WHATSAPP',
  'WALK_IN',
  'REFERRAL',
  'EMPLOYEE_REFERRAL',
  'TELE_CALLING',
  'FIELD_VISIT',
  'BRANCH',
  'SEMINAR',
  'EVENT',
  'EMAIL_CAMPAIGN',
  'SMS_CAMPAIGN',
  'CHANNEL_PARTNER',
  'BUSINESS_PARTNER',
  'IMPORT',
  'API',
  'MANUAL',
  'OTHER',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'MEETING_SCHEDULED',
  'MEETING_COMPLETED',
  'FOLLOW_UP_PENDING',
  'WORK_IN_PROGRESS',
  'DOCUMENT_PENDING',
  'CONVERTED',
  'ALREADY_CLIENT',
  'NOT_INTERESTED',
  'DUPLICATE',
  'TRANSFERRED',
  'ON_HOLD',
  'LOST',
  'REMOVED',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STAGES = [
  'LEAD_CREATED',
  'LEAD_ASSIGNED',
  'DUPLICATE_CHECK',
  'FIRST_CONTACT',
  'INTRO_MEETING',
  'INTRO_MEETING_SCHEDULED',
  'INTRO_MEETING_COMPLETED',
  'FOLLOW_UP',
  'NEED_ANALYSIS',
  'PRODUCT_DISCUSSION',
  'PROPOSAL_SHARED',
  'DOCUMENT_COLLECTION',
  'INVESTMENT_CONFIRMED',
  'SERVICE_REQUEST_CREATED',
  'CRM_HANDOVER',
  'PC_VERIFICATION',
  'CLIENT_ONBOARDED',
  'COMPLETED',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'VIP'] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const DUPLICATE_LEAD_STATUSES = [
  'ORIGINAL',
  'UNDER_VERIFICATION',
  'DUPLICATE',
  'TRANSFER_RESTRICTED',
  'ELIGIBLE_FOR_TRANSFER',
  'TRANSFERRED',
] as const;

export type DuplicateLeadStatus = (typeof DUPLICATE_LEAD_STATUSES)[number];

export type CreateLeadRequest = {
  clientName: string;
  mobileNumber: string;
  alternateMobileNumber?: string;
  email?: string;
  location: string;
  leadSource: LeadSource;
  remarks: string;
};

export type AssignLeadRequest = {
  clientName: string;
  mobileNumber: string;
  location: string;
  clinicAddress: string;
  speciality: string;
  salesPersonEmployeeCode: string;
};

export type LeadResponse = {
  leadId?: number;
  leadCode?: string;
  uniqueLeadId?: string;
  clientName?: string;
  mobileNumber?: string;
  email?: string;
  location?: string;
  clinicAddress?: string;
  speciality?: string;
  companyName?: string;
  leadSource?: LeadSource;
  leadStatus?: LeadStatus;
  leadStage?: LeadStage;
  priority?: LeadPriority;
  duplicateLeadStatus?: DuplicateLeadStatus;
  assignedUserId?: number;
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  assignedByEmployeeCode?: string;
  assignedByEmployeeName?: string;
  assignedAt?: string;
  assignmentSource?: string;
  assignedByCoordinator?: boolean;
  assignmentLabel?: string;
  nextPlanDate?: string;
  remarks?: string;
  currentActiveMeeting?: {
    meetingCode?: string;
  };
  audit?: {
    createdAt?: string;
    updatedAt?: string;
    createdBy?: {
      id?: number;
      code?: string;
      name?: string;
    };
  };
};

export type ApiResponseLeadResponse<T extends LeadResponse = LeadResponse> = {
  success?: boolean;
  status?: number;
  message?: string;
  timestamp?: string;
  path?: string;
  data?: T;
};

export type LeadDetailResponse = LeadResponse;

export type LeadSearchRequest = {
  keyword?: string;
  filter?: {
    assignedUserId?: number;
  };
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
};

export type PageResponseLeadResponse = {
  content?: LeadResponse[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
  empty?: boolean;
  sort?: string;
};

export type ApiResponsePageResponseLeadResponse = {
  success?: boolean;
  status?: number;
  message?: string;
  timestamp?: string;
  path?: string;
  data?: PageResponseLeadResponse;
};

export type LeadState = {
  createdLead: LeadResponse | null;
  isLoading: boolean;
  error: string | null;
  success: string | null;
};

export type LeadSearchState = {
  leads: LeadResponse[];
  timestamp: string | null;
  isLoading: boolean;
  error: string | null;
};
