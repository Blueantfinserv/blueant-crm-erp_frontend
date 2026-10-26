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

export type ClientRegistrationRequest = {
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
  bestTimeToMeet?: string;
  panNumber?: string;
  dateOfBirth?: string;
  motherName?: string;
  placeOfBirth?: string;
  occupation?: string;
  familyHeadName?: string;
  familyDetails?: string;
  residentialAddress?: string;
  correspondenceAddress?: string;
  officeAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  clientSource?: string;
  sourceDescription?: string;
  applicationReceivedDate?: string;
  applicationMode?: string;
  investmentType?: string;
  investmentTypes?: string[];
  firstInvestmentAmount?: number;
  expectedMaxSIP?: number;
  investwellId?: string;
  clientReportDate?: string;
  paymentStatus?: 'YES' | 'NO' | 'PENDING';
  paymentAmount?: number;
  paymentDate?: string;
  paymentReference?: string;
  nominees?: ClientNomineeRequest[];
  documents?: ClientDocumentRequest[];
  familyCode?: string;
  newFamilyName?: string;
  relationshipToHead?: 'SELF' | 'MOTHER' | 'FATHER' | 'SPOUSE' | 'CHILD' | 'SIBLING' | 'OTHER';
  designateAsHead?: boolean;
};

export type ClientNomineeRequest = {
  nomineeName?: string;
  relationship?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  panNumber?: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianRelationship?: string;
  guardianContact?: string;
  guardianPan?: string;
};

export type ClientDocumentRequest = {
  documentType?: 'PAN_CARD' | 'AADHAAR_CARD' | 'PASSPORT' | 'CHEQUE' | 'SIGNATURE' | 'OTHER' | 'PAN_KYC' | 'APPLICATION_FORM' | 'NOMINEE_DOCUMENTS' | 'INVESTMENT_DOCUMENTS';
  documentName?: string;
  received?: boolean;
  receivedDate?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CLARIFICATION';
  documentReference?: string;
  remarks?: string;
};

export type ClientRegistrationResponse = {
  id?: number;
  clientCode?: string;
  clientName?: string;
  mobileNumber?: string;
  alternateMobileNumber?: string;
  email?: string;
  speciality?: string;
  location?: string;
  clinicAddress?: string;
  clientStatus?: string;
  remarks?: string;
  assignmentDate?: string;
  bestTimeToMeet?: string;
  assignedSalesPersonId?: number;
  assignedSalesPersonCode?: string;
  assignedSalesPersonName?: string;
  assignedSalesPersonRole?: string;
  assignedBy?: string;
  assignedAt?: string;
  createdAt?: string;
  createdBy?: string;
  salesPersonCode?: string;
  salesPersonName?: string;
  clientSince?: string;
};

export type ClientWorkFollowResponse = {
  clientId?: number;
  clientCode?: string;
  clientName?: string;
  mobileNumber?: string;
  alternateMobileNumber?: string;
  email?: string;
  speciality?: string;
  location?: string;
  clinicAddress?: string;
  clientStatus?: string;
  assignmentDate?: string;
  bestTimeToMeet?: string;
  assignedSalesPersonId?: number;
  assignedSalesPersonCode?: string;
  assignedSalesPersonName?: string;
  activeMeetingCode?: string;
  activeMeetingStatus?: string;
  activeMeetingDate?: string;
  activeMeetingTime?: string;
  activeMeetingNumber?: number;
  totalMeetings?: number;
};

export type ClientWorkFollowPage = {
  content?: ClientWorkFollowResponse[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
};

export type CreateClientMeetingRequest = {
  clientCode?: string;
  clientId?: number;
  meetingMode: 'PHYSICAL' | 'VIRTUAL/ONLINE' | 'PHONE';
  meetingDate: string;
  meetingTime: string;
  meetingLocation?: string;
  remarks?: string;
};

export type ClientMeetingResponse = {
  meetingCode?: string;
  meetingNumber?: number;
  meetingStatus?: string;
  meetingDate?: string;
  meetingTime?: string;
  clientCode?: string;
  clientId?: number;
  clientName?: string;
  mobileNumber?: string;
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  meetingMode?: string;
  meetingConducted?: 'CONDUCTED' | 'NOT_CONDUCTED';
  aloneWith?: string;
  personName?: string;
  position?: string;
  businessGenerated?: string;
  blueantAppUsed?: string;
  investmentType?: string;
  businessTypes?: string[];
  investmentAmount?: number;
  remarks?: string;
  nextPlanDate?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  verifiedByPc?: boolean;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
};

export type ClientMeetingVerificationResponse = {
  meetingCode?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
};

export type ClientMeetingVerificationPage = {
  content?: ClientMeetingVerificationResponse[];
  totalPages?: number;
};

export type ClientProfileResponse = {
  id?: number;
  clientCode?: string;
  clientName?: string;
  mobileNumber?: string;
  alternateMobileNumber?: string;
  email?: string;
  speciality?: string;
  location?: string;
  clinicAddress?: string;
  clientStatus?: string;
  bestTimeToMeet?: string;
  clientSince?: string;
  remarks?: string;
  panNumber?: string;
  dateOfBirth?: string;
  motherName?: string;
  placeOfBirth?: string;
  occupation?: string;
  familyHeadName?: string;
  familyDetails?: string;
  residentialAddress?: string;
  correspondenceAddress?: string;
  officeAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  clientSource?: string;
  sourceDescription?: string;
  applicationReceivedDate?: string;
  applicationMode?: string;
  investmentType?: string;
  investmentTypes?: string[];
  firstInvestmentAmount?: number;
  expectedMaxSIP?: number;
  investwellId?: string;
  clientReportDate?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  paymentReference?: string;
  familyCode?: string;
  familyName?: string;
  isFamilyHead?: boolean;
  relationshipToHead?: string;
  assignedSalesPersonCode?: string;
  assignedSalesPersonName?: string;
  assignedSalesPersonRole?: string;
  assignedBy?: string;
  assignmentDate?: string;
  assignedAt?: string;
  createdAt?: string;
  createdBy?: string;
  documentCompletionStatus?: string;
  nominees?: Array<{ nomineeName?: string; relationship?: string; dateOfBirth?: string; contactNumber?: string; isMinor?: boolean; guardianName?: string; guardianRelationship?: string; guardianContact?: string }>;
  documents?: Array<{ documentType?: string; documentName?: string; received?: boolean; receivedDate?: string; verificationStatus?: string; documentReference?: string; remarks?: string }>;
};

export type FamilyRelationship = 'SELF' | 'MOTHER' | 'FATHER' | 'SPOUSE' | 'CHILD' | 'SIBLING' | 'OTHER';
export type FamilyMemberResponse = { memberId?: number; clientId?: number; clientCode?: string; clientName?: string; mobileNumber?: string; relationshipToHead?: FamilyRelationship; membershipStatus?: 'ACTIVE' | 'INACTIVE'; joinedAt?: string; joinedBy?: string; isFamilyHead?: boolean };
export type EligibleFamilyHeadResponse = { clientId?: number; clientCode?: string; clientName?: string; eligible?: boolean; eligibilityReason?: string; qualifyingDetails?: string; currentHead?: boolean };
export type FamilyHeadHistoryResponse = { id?: number; previousHeadClientId?: number; previousHeadClientCode?: string; previousHeadClientName?: string; newHeadClientId?: number; newHeadClientCode?: string; newHeadClientName?: string; changedByUser?: string; changedAt?: string; reason?: string };
export type FamilyDetailResponse = { id?: number; familyCode?: string; familyName?: string; familyHeadClientId?: number; familyHeadClientCode?: string; familyHeadClientName?: string; status?: 'ACTIVE' | 'INACTIVE'; createdAt?: string; createdBy?: string; updatedAt?: string; updatedBy?: string; members?: FamilyMemberResponse[] };

/** One business category recorded during a PC client-meeting verification. */
export type ClientBusinessItemDto = {
  businessType: string;
  /** `null` for non-monetary items such as SERVICE_REQUEST and BROKER_CHANGE. */
  amount: number | null;
};

export type ClientMeetingVerificationRequest = {
  newMeetingDate?: string;
  /** Backend accepts Java LocalTime as an HH:mm:ss string, like the Prospect verification endpoint. */
  meetingTime?: string;
  blueantAppUsed?: string;
  aloneWith?: string;
  personName?: string;
  position?: string;
  businessGenerated?: string;
  /** Category-wise business data accepted by the client-meeting verification API. */
  businessItems?: ClientBusinessItemDto[];
  /** Legacy aggregate fields retained only for backwards-compatible API responses. */
  investmentType?: string;
  businessTypes?: string[];
  investmentAmount?: number;
  remarks?: string;
  nextFollowupDate?: string;
  meetingDate?: string;
};
/** Direct RM/SC Client Work Follow submission. The client code belongs in the URL, not this body. */
export type ClientMeetingUpdateRequest = {
  meetingConducted: 'CONDUCTED' | 'NOT_CONDUCTED';
  meetingDate: string;
  meetingMode?: 'PHYSICAL' | 'VIRTUAL/ONLINE' | 'PHONE';
  aloneWith?: string;
  businessGenerated?: string;
  remarks?: string;
  nextPlanDate?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};
