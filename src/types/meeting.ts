export type LocalTime = { hour?: number; minute?: number; second?: number; nano?: number };
export type MeetingMode = 'PHYSICAL' | 'VIRTUAL/ONLINE' | 'PHONE';
export type MeetingType = 'INTRO' | 'FOLLOW_UP';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW' | 'NOT_CONDUCTED';
export type MeetingLeadStatus = 'ALREADY_CLIENT' | 'CONVERTED_CLIENT' | 'CLIENT_REMOVED' | 'CLIENT_NOT_INTERESTED' | 'WORK_IN_PROGRESS';
export type AloneWith = 'SELF' | 'SOMEONE';

export type MeetingSummary = {
  id?: number; meetingCode?: string; meetingNumber?: number; meetingType?: MeetingType;
  meetingTitle?: string; meetingStatus?: MeetingStatus; meetingDate?: string; meetingTime?: LocalTime;
  nextMeetingDate?: string; nextMeetingTime?: LocalTime; aloneWith?: string; personName?: string;
  position?: string; clientName?: string; leadId?: number; leadCode?: string;
  assignedEmployeeName?: string; location?: string; createdAt?: string; updatedAt?: string;
};

export type MeetingResponse = MeetingSummary & {
  mobileNumber?: string; employeeCode?: string; employeeName?: string; meetingMode?: MeetingMode;
  meetingLocation?: string; status?: string; address?: string; discussion?: string;
  remarks?: string; meetingConducted?: 'CONDUCTED' | 'NOT_CONDUCTED';
  leadStatus?: MeetingLeadStatus; latitude?: number; longitude?: number; locationAccuracy?: number;
  lastModifiedDate?: string; createdDate?: string; workflowUpdatedAt?: string; googleMapsUrl?: string;
};

export type MeetingDetail = MeetingResponse & { leadId?: number; assignedEmployeeId?: number; agenda?: string };
export type ActiveMeetingResponse = { meetingCode?: string };
export type MeetingUpdate = Record<string, unknown> & { meetingCode?: string; updateNumber?: number };
export type MeetingDropdown = { id?: number; meetingCode?: string; displayName?: string; meetingStatus?: MeetingStatus };

export type ApiResponse<T> = { success?: boolean; status?: number; message?: string; timestamp?: string; path?: string; data?: T };
export type PageResponse<T> = { content?: T[]; pageNumber?: number; pageSize?: number; totalElements?: number; totalPages?: number };

export type ScheduleMeetingRequest = {
  leadId: string; meetingMode: MeetingMode; meetingDate: string; meetingTime: LocalTime; meetingLocation: string;
};
export type CreateMeetingRequest = Omit<ScheduleMeetingRequest, 'meetingTime'> & {
  remarks?: string;
};
export type MeetingWorkflowRequest = {
  leadStatus: MeetingLeadStatus; aloneWith: AloneWith; meetingDate?: string; meetingMode?: MeetingMode;
  meetingConducted?: 'CONDUCTED' | 'NOT_CONDUCTED';
  remarks?: string; nextPlanDate?: string; latitude?: number; longitude?: number; address?: string; accuracy?: number;
};
export type MeetingSearchRequest = { keyword?: string };
export type RescheduleMeetingRequest = { meetingCode: string; meetingDate: string; meetingTime: LocalTime; meetingLocation: string; rescheduleReason: string };
export type CancelMeetingRequest = { meetingId: number; cancellationReason: string };

export type MeetingFormSubmission = {
  leadId?: string; meetingCode?: string; meetingMode: 'Physical' | 'Virtual'; meetingDate: string;
  leadStatus: 'Work In Progress' | 'Converted as Client' | 'Client Not Interested' | 'Remove This Client' | 'Already Blueant Client';
  aloneWith: AloneWith; nextPlanDate: string; remarks: string;
};

export type MeetingQueueState = { meetings: MeetingResponse[]; timestamp: string | null; isLoading: boolean; error: string | null };
