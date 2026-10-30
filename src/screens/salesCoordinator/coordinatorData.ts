import { clientMeetingApi } from '../../api/clientMeeting';
import { leadApi } from '../../api/lead';
import { leadSearchApi } from '../../api/leadSearch';
import type { ClientProfileResponse } from '../../types/crm';
import type { MeetingResponse } from '../../types/meeting';
import type { VerificationPage } from './coordinatorTypes';
import { clientMeetingTime,digitsOnly,employeeRole } from './coordinatorUtils';

export type LoadingProgress = (progress: number) => void;

const loadBatch = async <T,>(requests: Promise<T>[], onProgress: (progress: number) => void) => {
  let completed = 0;
  const total = requests.length;
  if (total === 0) {
    onProgress(1);
    return [];
  }
  return Promise.all(requests.map((request) => request.then((result) => {
    completed += 1;
    onProgress(completed / total);
    return result;
  })));
};

export const assignedSalesPersonForMobile = async (mobileNumber: string) => {
  const response = await leadSearchApi.search({ keyword: mobileNumber, page: 0, size: 25 });
  const matchedLead = response.data?.content?.find((lead) => digitsOnly(lead.mobileNumber) === digitsOnly(mobileNumber));
  if (!matchedLead) return null;
  if (matchedLead.assignedEmployeeName?.trim()) return matchedLead.assignedEmployeeName.trim();
  const uniqueLeadId = matchedLead.uniqueLeadId?.trim();
  if (!uniqueLeadId) return null;
  return (await leadApi.getLeadDetails(uniqueLeadId)).data?.assignedEmployeeName?.trim() || null;
};

export const clientMeetingAsCoordinatorRecord = (meeting: Awaited<ReturnType<typeof clientMeetingApi.getMeeting>>, profile?: ClientProfileResponse | null): MeetingResponse => ({
  meetingCode: meeting.meetingCode,
  meetingNumber: meeting.meetingNumber,
  meetingTitle: 'Client Meeting',
  meetingStatus: meeting.meetingStatus as MeetingResponse['meetingStatus'],
  meetingConducted: meeting.meetingConducted,
  meetingDate: meeting.meetingDate,
  meetingTime: clientMeetingTime(meeting.meetingTime),
  nextMeetingDate: meeting.nextPlanDate,
  clientName: meeting.clientName ?? profile?.clientName,
  mobileNumber: meeting.mobileNumber ?? profile?.mobileNumber,
  alternateMobileNumber: profile?.alternateMobileNumber,
  email: profile?.email,
  speciality: profile?.speciality,
  location: profile?.location,
  clinicAddress: profile?.clinicAddress,
  employeeCode: meeting.assignedEmployeeCode,
  employeeName: meeting.assignedEmployeeName,
  // Client-meeting responses expose the employee code but not the role. Resolve the known
  // assigned code so an active SC filter does not hide Divya's pending client meetings.
  employeeRole: employeeRole(undefined, meeting.assignedEmployeeCode) === 'SC' ? 'SALES_COORDINATOR' : 'RELATIONSHIP_MANAGER',
  meetingMode: meeting.meetingMode as MeetingResponse['meetingMode'],
  aloneWith: meeting.aloneWith,
  personName: meeting.personName,
  position: meeting.position,
  businessGenerated: meeting.businessGenerated,
  blueantAppUsed: meeting.blueantAppUsed,
  investmentType: meeting.investmentType,
  businessTypes: meeting.businessTypes,
  investmentAmount: meeting.investmentAmount,
  remarks: meeting.remarks,
  latitude: meeting.latitude,
  longitude: meeting.longitude,
  locationAccuracy: meeting.locationAccuracy,
  verificationStatus: meeting.verificationStatus,
  isClientMeeting: true,
});

export const loadClientMeetings = async (
  fetchPage: (page?: number) => Promise<VerificationPage>,
  { pendingOnly = false, markVerified = false }: { pendingOnly?: boolean; markVerified?: boolean } = {},
  onProgress: LoadingProgress = () => undefined,
): Promise<MeetingResponse[]> => {
  const firstPage = await fetchPage();
  const totalPages = Math.max(1, firstPage.totalPages ?? 1);
  let completedPages = 1;
  onProgress((completedPages / totalPages) / 3);
  const remainingPages = await loadBatch(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 1)),
    (completed) => onProgress(((completedPages + completed * (totalPages - 1)) / totalPages) / 3),
  );
  completedPages = totalPages;
  onProgress((completedPages / totalPages) / 3);
  const codes = [firstPage, ...remainingPages].flatMap((page) => page.content ?? [])
    .filter((item) => !pendingOnly || !item.verificationStatus || item.verificationStatus === 'PENDING')
    .map((item) => item.meetingCode?.trim())
    .filter((code): code is string => Boolean(code));
  const records = await loadBatch(
    codes.map((meetingCode) => clientMeetingApi.getMeeting(meetingCode)),
    (completed) => onProgress((1 + completed) / 3),
  );
  const profiles = await loadBatch(
    records.map((meeting) => meeting.clientCode ? clientMeetingApi.getProfile(meeting.clientCode).catch(() => null) : Promise.resolve(null)),
    (completed) => onProgress((2 + completed) / 3),
  );
  return records.map((meeting, index) => {
    const record = clientMeetingAsCoordinatorRecord(meeting, profiles[index]);
    return markVerified ? { ...record, verificationStatus: 'VERIFIED' as const } : record;
  });
};

export const loadPendingClientMeetings = (onProgress?: LoadingProgress) => loadClientMeetings(
  (page) => clientMeetingApi.getPendingVerification(page),
  { pendingOnly: true },
  onProgress,
);

export const loadVerifiedClientMeetings = (onProgress?: LoadingProgress) => loadClientMeetings(
  (page) => clientMeetingApi.getVerifiedVerification(page),
  { markVerified: true },
  onProgress,
);

export const loadCoordinatorAssignedLeads = async (onProgress?: LoadingProgress) => {
  const search = (page: number) => leadSearchApi.search({ page, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
  const firstPage = await search(0);
  const leads = [...(firstPage.data?.content ?? [])];
  const totalPages = Math.max(1, firstPage.data?.totalPages ?? 1);
  let completedPages = 1;
  onProgress?.(completedPages / totalPages);
  for (let page = 1; page < totalPages; page += 1) {
    leads.push(...((await search(page)).data?.content ?? []));
    completedPages += 1;
    onProgress?.(completedPages / totalPages);
  }
  // Coordinator ownership is determined by the backend assignment flow. Do not include
  // direct/historical assignments here, otherwise one sales person appears under coordinators
  // who do not own that assignment.
  const assignedLeads = leads
    .map((lead) => ({ ...lead, assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt }))
    .filter((lead) => lead.assignmentSource === 'SALES_COORDINATOR' || lead.assignedByCoordinator);
  onProgress?.(1);
  return assignedLeads;
};
