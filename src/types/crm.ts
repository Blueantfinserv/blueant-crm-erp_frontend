export type CrmLeadQueueItem = {
  leadId?: number;
  leadCode?: string;
  uniqueLeadId?: string;
  clientName?: string;
  mobileNumber?: string;
  email?: string;
  location?: string;
  salesPersonId?: number;
  salesPersonCode?: string;
  salesPersonName?: string;
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  assignedAt?: string;
  assignmentDate?: string;
  verifiedMeetingCode?: string;
  pcVerifiedAt?: string;
  pcVerifiedBy?: string;
  leadStatus?: string;
  leadStage?: string;
  crmOnboardingStatus?: string;
  crmVerificationStatus?: string;
};

export type EligibleLeadPage = {
  content?: CrmLeadQueueItem[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
  hasNext?: boolean;
};

export type CrmAssignmentTarget = {
  id: number;
  employeeCode: string;
  fullName: string;
  role: 'RELATIONSHIP_MANAGER' | 'SALES_COORDINATOR';
};

export type CrmAssignmentResponse = {
  leadId?: number;
  leadCode?: string;
  uniqueLeadId?: string;
  clientName?: string;
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  assignmentDate?: string;
  statusMessage?: string;
};

export type CrmPhysicalLeadRequest = {
  clientName: string;
  mobileNumber: string;
  speciality: string;
  location: string;
  clinicAddress: string;
  salesPersonEmployeeCode: string;
  alternateMobileNumber?: string;
  email?: string;
  remarks?: string;
  assignmentDate?: string;
  bestTimeToMeet?: 'NINE_TO_TWELVE' | 'TWELVE_TO_THREE' | 'THREE_TO_SIX' | 'SIX_TO_NINE';
};

export type CrmPhysicalLeadResponse = {
  leadId?: number;
  leadCode?: string;
  uniqueLeadId?: string;
  clientName?: string;
  mobileNumber?: string;
  speciality?: string;
  location?: string;
  clinicAddress?: string;
  isPhysicalLead?: boolean;
  bestTimeToMeet?: string;
  assignedUserId?: number;
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  assignedByEmployeeCode?: string;
  assignedByEmployeeName?: string;
  assignedAt?: string;
  assignmentDate?: string;
  assignmentSource?: string;
  assignedByCoordinator?: boolean;
  assignmentLabel?: string;
  statusMessage?: string;
};
