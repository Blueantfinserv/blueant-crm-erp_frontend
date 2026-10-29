import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Modal,Platform,Pressable,ScrollView,Text,TextInput,useWindowDimensions,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { clientMeetingApi } from '../api/clientMeeting';
import { leadApi } from '../api/lead';
import { meetingApi } from '../api/meeting';
import { leadService } from '../services/LeadService';
import { meetingService } from '../services/MeetingService';
import { SecureStorageService } from '../services/SecureStorageService';
import { useAppTheme } from '../theme/ThemeProvider';
import type { AssignLeadRequest,LeadResponse } from '../types/lead';
import type { MeetingResponse,MeetingVerificationRequest } from '../types/meeting';
import { createMeetingVerificationForm } from './meetingVerificationForm';
import { AssignedLeadCards,AssignLeadForm,HeaderLeadFilters } from './salesCoordinator/components/AssignedLeads';
import { AutoRefreshBadge,Metric,Pagination,State,TaskToolbar } from './salesCoordinator/components/CoordinatorControls';
import { LeadHistoryContent } from './salesCoordinator/components/LeadHistory';
import { ClientVerificationDetails,Details,VerificationDetails } from './salesCoordinator/components/MeetingDetails';
import { Cards,MeetingTableHeader } from './salesCoordinator/components/MeetingTable';
import { ClientVerificationFields,LeadVerificationPopup } from './salesCoordinator/components/VerificationForms';
import { clientBusinessDefinition,EXCLUDED_TASK_LEAD_STATUSES,FIELDS,NOT_CONDUCTED_FIELDS,PAGE_SIZE,SALES_PERSONS,TABS } from './salesCoordinator/coordinatorConstants';
import { assignedSalesPersonForMobile,clientMeetingAsCoordinatorRecord,loadCoordinatorAssignedLeads,loadPendingClientMeetings,loadVerifiedClientMeetings } from './salesCoordinator/coordinatorData';
import { downloadCsv,exportDatePart,exportNamePart } from './salesCoordinator/coordinatorExport';
import { filterMeetingRecords } from './salesCoordinator/coordinatorFilters';
import { clientBusinessTypes,clientInvestmentTotal,emptyAssignForm,emptyClientVerificationForm,emptyForm } from './salesCoordinator/coordinatorForms';
import type { AssignedDateRange,ClientVerificationForm,MeetingColumnFilter,Tab } from './salesCoordinator/coordinatorTypes';
import { belongsToCoordinatorTeam,clientMeetingTime,digitsOnly,isAlreadyAssignedError,isNotConductedMeeting,isValidAmount,isVerificationFieldVisible,localToday,matchesAssignedDate,matchesSearch,timeText } from './salesCoordinator/coordinatorUtils';
import { loadStoredVerifiedClientMeetings,mergeVerifiedMeetings,saveStoredVerifiedClientMeetings } from './salesCoordinator/verifiedMeetingStorage';
import { popupStyles,styles } from './salesCoordinatorStyles';

export function SalesCoordinatorScreen({ permissions }: { permissions?: readonly string[] | null }) {
  const { isDark } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 760;
  const [tab, setTab] = useState<Tab>('today');
  const [pending, setPending] = useState<MeetingResponse[]>([]);
  const [verified, setVerified] = useState<MeetingResponse[]>([]);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [tabLoading, setTabLoading] = useState<Tab | null>(null);
  const [tabLoadingProgress, setTabLoadingProgress] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const nextRefreshAt = useRef(Date.now() + 10_000);
  const nextVerifiedRefreshAt = useRef(Date.now() + 5 * 60_000);
  const nextTaskRefreshAt = useRef(Date.now() + 60 * 60_000);
  const nextAssignedLeadsRefreshAt = useRef(Date.now() + 30 * 60_000);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loadInFlight = useRef(false);
  const pendingRefreshInFlight = useRef(false);
  const verifiedRefreshInFlight = useRef(false);
  const taskRefreshInFlight = useRef(false);
  const assignedLeadsRefreshInFlight = useRef(false);
  const dataGeneration = useRef(0);
  const hasLoaded = useRef(false);
  const hasTaskData = useRef(false);
  const hasAssignedLeadsData = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MeetingResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [clientForm, setClientForm] = useState<ClientVerificationForm>(() => emptyClientVerificationForm());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(0);
  const [todayColumnFilters, setTodayColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseColumnFilters, setResponseColumnFilters] = useState<MeetingColumnFilter>({});
  const [taskColumnFilters, setTaskColumnFilters] = useState<MeetingColumnFilter>({});
  const [responseSearch, setResponseSearch] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODAY' | 'PENDING'>('ALL');
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignedLeads, setAssignedLeads] = useState<LeadResponse[]>([]);
  const [assignedLeadsPage, setAssignedLeadsPage] = useState(0);
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [assignedSalesPersonFilter, setAssignedSalesPersonFilter] = useState('');
  const [assignedDateRange, setAssignedDateRange] = useState<AssignedDateRange>({ from: '', to: '' });
  const [historyLead, setHistoryLead] = useState<LeadResponse | null>(null);
  const [historyMeetings, setHistoryMeetings] = useState<MeetingResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingProgress, setHistoryLoadingProgress] = useState(10);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [exportingAssignedLeads, setExportingAssignedLeads] = useState(false);

  const salesPersonNamesByCode = useMemo(() => {
    const values = new Map<string, string>(SALES_PERSONS.map((employee) => [employee.code, employee.name]));
    meetings.forEach((meeting) => {
      if (meeting.employeeCode?.trim() && meeting.employeeName?.trim()) values.set(meeting.employeeCode.trim(), meeting.employeeName.trim());
    });
    assignedLeads.forEach((lead) => {
      if (lead.assignedEmployeeCode?.trim() && lead.assignedEmployeeName?.trim()) values.set(lead.assignedEmployeeCode.trim(), lead.assignedEmployeeName.trim());
    });
    return values;
  }, [assignedLeads, meetings]);

  const exportAssignedLeads = async () => {
    if (Platform.OS !== 'web') { Alert.alert('Excel export', 'Excel export is currently available on the web version.'); return; }
    setExportingAssignedLeads(true);
    try {
      const assignedStamp = (lead: LeadResponse) => String(lead.assignedAt ?? lead.assignmentDate ?? lead.assignedDate ?? '');
      const uniqueLeads = [...visibleAssignedLeads.reduce((byLead, lead) => {
        const key = lead.uniqueLeadId?.trim() || String(lead.leadId ?? lead.leadCode ?? `${lead.mobileNumber ?? ''}:${lead.clientName ?? ''}`);
        const current = byLead.get(key);
        if (!current || assignedStamp(lead) > assignedStamp(current)) byLead.set(key, lead);
        return byLead;
      }, new Map<string, LeadResponse>()).values()];
      const allMeetings = meetings.length ? meetings : await meetingService.getAllMeetingRecords();
      const meetingByCode = new Map<string, MeetingResponse>();
      [...allMeetings, ...pending, ...verified].forEach((meeting) => {
        const key = meeting.meetingCode ?? String(meeting.id ?? '');
        if (key) meetingByCode.set(key, { ...meetingByCode.get(key), ...meeting });
      });
      const sortKey = (m: MeetingResponse) => `${String(m.meetingDate ?? m.createdAt ?? '')}T${timeText(m.meetingTime)}|${String(m.updatedAt ?? m.lastModifiedDate ?? '')}`;
      const rows = uniqueLeads.map((lead) => {
        const latestMeeting = [...meetingByCode.values()]
          .filter((meeting) => (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber)))
          .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))[0];
        return [
          lead.clientName, lead.mobileNumber, lead.speciality, lead.location, lead.clinicAddress,
          lead.assignedEmployeeName, lead.assignedByEmployeeName, lead.assignedAt, lead.leadStatus?.replace(/_/g, ' '),
          latestMeeting?.ageGroup, latestMeeting?.existingSip, latestMeeting?.profession, latestMeeting?.professionDetail, latestMeeting?.bestTimeForMeeting,
          latestMeeting?.meetingTitle ?? latestMeeting?.meetingType, latestMeeting?.meetingStatus, latestMeeting?.meetingDate, timeText(latestMeeting?.meetingTime), latestMeeting?.meetingMode, latestMeeting?.leadStatus?.replace(/_/g, ' '), latestMeeting?.aloneWith, latestMeeting?.personName, latestMeeting?.position, latestMeeting?.remarks ?? latestMeeting?.meetingRemarks ?? latestMeeting?.discussion, latestMeeting?.nextMeetingDate,
          latestMeeting?.id, lead.leadId,
        ];
      });
      const headers = ['Client Name', 'Mobile Number', 'Speciality', 'Location', 'Clinic Address', 'Sales Person', 'Sales Coordinator', 'Assigned Date', 'Current Lead Status', 'SC Age Group', 'SC Prior Investment', 'SC Profession', 'SC Firm / Clinic', 'SC Best Time', 'Latest Meeting Type', 'Latest Meeting Status', 'Latest Meeting Date', 'Latest Meeting Time', 'Latest Meeting Mode', 'Latest Meeting Lead Status', 'Latest Meeting Joined With', 'Latest Meeting Person Name', 'Latest Meeting Person Position', 'Latest Meeting Remarks', 'Latest Next Plan Date', 'Meeting ID', 'Lead ID'];
      const from = exportDatePart(assignedDateRange.from);
      const to = exportDatePart(assignedDateRange.to);
      const dateRangeName = from && to ? `${from}-to-${to}` : from ? `from-${from}` : to ? `to-${to}` : 'all-dates';
      downloadCsv(headers, rows, `assigned-leads-${exportNamePart(assignedSalesPersonFilter)}-${dateRangeName}`);
    } catch (e) { Alert.alert('Excel export', e instanceof Error ? e.message : 'Assigned lead export failed.'); }
    finally { setExportingAssignedLeads(false); }
  };

  const load = useCallback(async (includeDeferredData = false) => {
    if (loadInFlight.current || submittingRef.current) return;
    loadInFlight.current = true;
    const generation = dataGeneration.current;
    if (!hasLoaded.current) { setLoadingProgress(10); setLoading(true); }
    setRefreshing(true);
    try {
      const [leadPending, clientPending, leadVerified, clientVerified, deferred] = await Promise.all([
        meetingService.getVerificationMeetings('PENDING').then((result) => { setLoadingProgress(40); return result; }),
        loadPendingClientMeetings().catch(() => []),
        meetingService.getVerificationMeetings('VERIFIED').then((result) => { setLoadingProgress(70); return result; }),
        loadVerifiedClientMeetings().catch(() => []),
        includeDeferredData ? Promise.all([meetingService.getAllMeetingRecords(), loadCoordinatorAssignedLeads()]).then((result) => { setLoadingProgress(90); return result; }) : Promise.resolve(null),
      ]);
      if (generation !== dataGeneration.current) return;
      const currentUser = await SecureStorageService.getUserData();
      const locallyVerifiedClients = await loadStoredVerifiedClientMeetings(currentUser?.employeeId);
      setLoadingProgress(100); setPending([...leadPending, ...clientPending]); setVerified(mergeVerifiedMeetings(leadVerified, clientVerified, locallyVerifiedClients));
      if (deferred) { setMeetings(deferred[0]); setAssignedLeads(deferred[1]); hasTaskData.current = true; hasAssignedLeadsData.current = true; }
      hasLoaded.current = true;
      setError(null); setRefreshError(null);
    } catch (e) {
      if (generation !== dataGeneration.current) return;
      const message = e instanceof Error ? e.message : 'Coordinator data could not be loaded.';
      if (hasLoaded.current) setRefreshError(message);
      else setError(message);
    }
    finally {
      loadInFlight.current = false; setLoading(false); setRefreshing(false);
      nextRefreshAt.current = Date.now() + 10_000;
      nextVerifiedRefreshAt.current = Date.now() + 5 * 60_000;
      nextTaskRefreshAt.current = Date.now() + 60 * 60_000;
      nextAssignedLeadsRefreshAt.current = Date.now() + 30 * 60_000;
    }
  }, []);
  const refreshPendingMeetings = useCallback(async () => {
    if (loadInFlight.current || pendingRefreshInFlight.current || submittingRef.current) return;
    pendingRefreshInFlight.current = true;
    try {
      const [leadPending, clientPending] = await Promise.all([meetingService.getVerificationMeetings('PENDING'), loadPendingClientMeetings().catch(() => [])]);
      setPending([...leadPending, ...clientPending]);
    } finally { pendingRefreshInFlight.current = false; nextRefreshAt.current = Date.now() + 10_000; }
  }, []);
  const refreshVerifiedMeetings = useCallback(async () => {
    if (loadInFlight.current || verifiedRefreshInFlight.current || submittingRef.current) return;
    verifiedRefreshInFlight.current = true;
    try {
      const [leadVerified, clientVerified, currentUser] = await Promise.all([meetingService.getVerificationMeetings('VERIFIED'), loadVerifiedClientMeetings().catch(() => []), SecureStorageService.getUserData()]);
      const locallyVerifiedClients = await loadStoredVerifiedClientMeetings(currentUser?.employeeId);
      setVerified(mergeVerifiedMeetings(leadVerified, clientVerified, locallyVerifiedClients));
    } finally { verifiedRefreshInFlight.current = false; nextVerifiedRefreshAt.current = Date.now() + 5 * 60_000; }
  }, []);
  const refreshTaskMeetings = useCallback(async () => {
    if (!hasTaskData.current || loadInFlight.current || taskRefreshInFlight.current || submittingRef.current) return;
    taskRefreshInFlight.current = true;
    try { setMeetings(await meetingService.getAllMeetingRecords()); }
    finally { taskRefreshInFlight.current = false; nextTaskRefreshAt.current = Date.now() + 60 * 60_000; }
  }, []);
  const refreshAssignedLeads = useCallback(async () => {
    if (!hasAssignedLeadsData.current || loadInFlight.current || assignedLeadsRefreshInFlight.current || submittingRef.current) return;
    assignedLeadsRefreshInFlight.current = true;
    try { setAssignedLeads(await loadCoordinatorAssignedLeads()); }
    finally { assignedLeadsRefreshInFlight.current = false; nextAssignedLeadsRefreshAt.current = Date.now() + 30 * 60_000; }
  }, []);
  useEffect(() => {
    void load();
    const todayTimer = setInterval(() => { if (Date.now() >= nextRefreshAt.current) void refreshPendingMeetings(); }, 1000);
    const verifiedTimer = setInterval(() => void refreshVerifiedMeetings(), 5 * 60_000);
    const taskTimer = setInterval(() => void refreshTaskMeetings(), 60 * 60_000);
    const assignedTimer = setInterval(() => void refreshAssignedLeads(), 30 * 60_000);
    return () => { clearInterval(todayTimer); clearInterval(verifiedTimer); clearInterval(taskTimer); clearInterval(assignedTimer); dataGeneration.current += 1; };
  }, [load, refreshAssignedLeads, refreshPendingMeetings, refreshTaskMeetings, refreshVerifiedMeetings]);
  useEffect(() => {
    if (tab === 'tasks' && !hasTaskData.current && tabLoading !== 'tasks') {
      setTabLoadingProgress(10); setTabLoading('tasks');
      void Promise.all([
        meetingService.getAllMeetingRecords().then((result) => { setTabLoadingProgress(50); return result; }),
        (hasAssignedLeadsData.current ? Promise.resolve(assignedLeads) : loadCoordinatorAssignedLeads()).then((result) => { setTabLoadingProgress(90); return result; }),
      ])
        .then(([taskMeetings, leads]) => { setTabLoadingProgress(100); setMeetings(taskMeetings); if (!hasAssignedLeadsData.current) { setAssignedLeads(leads); hasAssignedLeadsData.current = true; } hasTaskData.current = true; })
        .catch((e: unknown) => setRefreshError(e instanceof Error ? e.message : 'Sales person tasks could not be loaded.'))
        .finally(() => setTabLoading(null));
    }
    if (tab === 'assignedLeads' && !hasAssignedLeadsData.current && tabLoading !== 'assignedLeads') {
      setTabLoadingProgress(10); setTabLoading('assignedLeads');
      void loadCoordinatorAssignedLeads()
        .then((leads) => { setTabLoadingProgress(100); setAssignedLeads(leads); hasAssignedLeadsData.current = true; })
        .catch((e: unknown) => setRefreshError(e instanceof Error ? e.message : 'Assigned leads could not be loaded.'))
        .finally(() => setTabLoading(null));
    }
  }, [assignedLeads, tab, tabLoading]);

  const taskStatus = (m: MeetingResponse): 'TODAY' | 'PENDING' | 'OTHER' => {
    const taskDate = String(m.nextMeetingDate ?? m.meetingDate ?? '').slice(0, 10);
    if (taskDate === localToday()) return 'TODAY';
    if (m.meetingTitle === 'Lead') return !taskDate || taskDate < localToday() ? 'PENDING' : 'OTHER';
    return taskDate && taskDate < localToday() ? 'PENDING' : 'OTHER';
  };
  const taskMeetings = useMemo(() => {
    if (tab !== 'tasks') return [];
    return meetings.filter((meeting) => {
      if (String(meeting.meetingStatus ?? '').toUpperCase() === 'COMPLETED') return false;
      const assignedLead = assignedLeads.find((lead) => (meeting.leadId !== undefined && lead.leadId === meeting.leadId) || (Boolean(meeting.leadCode) && lead.leadCode === meeting.leadCode));
      return !EXCLUDED_TASK_LEAD_STATUSES.has(String(meeting.leadStatus ?? '').toUpperCase())
        && !EXCLUDED_TASK_LEAD_STATUSES.has(String(assignedLead?.leadStatus ?? '').toUpperCase());
    });
  }, [assignedLeads, meetings, tab]);
  const taskLeads = useMemo<MeetingResponse[]>(() => {
    if (tab !== 'tasks') return [];
    const meetingLeadKeys = new Set(taskMeetings.flatMap((meeting) => [
      meeting.leadId !== undefined ? `id:${meeting.leadId}` : '',
      meeting.leadCode ? `code:${meeting.leadCode}` : '',
    ]).filter(Boolean));
    const updatedStamp = (m: MeetingResponse) => String(m.workflowUpdatedAt ?? m.updatedAt ?? m.lastModifiedDate ?? m.meetingDate ?? '');
    return assignedLeads
      .filter((lead) => {
        const keys = [lead.leadId !== undefined ? `id:${lead.leadId}` : '', lead.leadCode ? `code:${lead.leadCode}` : ''].filter(Boolean);
        return !EXCLUDED_TASK_LEAD_STATUSES.has(String(lead.leadStatus ?? '').toUpperCase()) && keys.every((key) => !meetingLeadKeys.has(key));
      })
      .map((lead) => {
        const latestMeetingWithNextPlan = [...meetings, ...pending, ...verified]
          .filter((meeting) => Boolean(meeting.nextMeetingDate) && (
            (lead.leadId !== undefined && meeting.leadId === lead.leadId)
            || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode)
            || Boolean(lead.mobileNumber && meeting.mobileNumber && digitsOnly(lead.mobileNumber) === digitsOnly(meeting.mobileNumber))
          ))
          .sort((left, right) => updatedStamp(right).localeCompare(updatedStamp(left)))[0];
        return {
          leadId: lead.leadId,
          leadCode: lead.leadCode,
          clientName: lead.clientName,
          mobileNumber: lead.mobileNumber,
          employeeName: lead.assignedEmployeeName,
          employeeCode: lead.assignedEmployeeCode,
          meetingTitle: 'Lead',
          meetingDate: String(latestMeetingWithNextPlan?.nextMeetingDate ?? lead.assignedAt ?? '').slice(0, 10),
          meetingStatus: 'SCHEDULED',
          leadStatus: lead.leadStatus as MeetingResponse['leadStatus'],
        };
      });
  }, [assignedLeads, meetings, pending, tab, taskMeetings, verified]);
  const taskRecords = useMemo(() => tab === 'tasks' ? [...taskLeads, ...taskMeetings] : [], [tab, taskLeads, taskMeetings]);
  const filteredTasks = useMemo(() => {
    if (tab !== 'tasks') return [];
    const query = taskSearch.trim().toLowerCase();
    const matchingTasks = taskRecords.filter((m) => {
      const searchMatch = !query || String(m.clientName ?? '').toLowerCase().includes(query) || String(m.mobileNumber ?? '').toLowerCase().includes(query);
      return searchMatch && (statusFilter === 'ALL' || taskStatus(m) === statusFilter);
    });
    return filterMeetingRecords(matchingTasks, taskColumnFilters);
  }, [statusFilter, tab, taskColumnFilters, taskRecords, taskSearch]);
  const pagedTasks = useMemo(() => filteredTasks.slice(taskPage * PAGE_SIZE, (taskPage + 1) * PAGE_SIZE), [filteredTasks, taskPage]);
  const visibleTodayMeetings = useMemo(() => filterMeetingRecords(pending, todayColumnFilters), [pending, todayColumnFilters]);
  const visibleVerifiedMeetings = useMemo(() => filterMeetingRecords(verified.filter((meeting) => matchesSearch(meeting.clientName, responseSearch) || matchesSearch(meeting.mobileNumber, responseSearch)), responseColumnFilters), [responseColumnFilters, responseSearch, verified]);
  const visibleAssignedLeads = useMemo(() => assignedLeads.filter((lead) => (
    (matchesSearch(lead.clientName, assignedSearch) || matchesSearch(lead.mobileNumber, assignedSearch))
    && (!coordinatorFilter || lead.assignedByEmployeeName === coordinatorFilter)
    && belongsToCoordinatorTeam(coordinatorFilter, lead.assignedEmployeeName)
    && (!assignedSalesPersonFilter || lead.assignedEmployeeName === assignedSalesPersonFilter)
    && matchesAssignedDate(lead.assignedAt, assignedDateRange)
  )), [assignedDateRange, assignedLeads, assignedSalesPersonFilter, assignedSearch, coordinatorFilter]);
  const pagedAssignedLeads = useMemo(() => visibleAssignedLeads.slice(assignedLeadsPage * PAGE_SIZE, (assignedLeadsPage + 1) * PAGE_SIZE), [assignedLeadsPage, visibleAssignedLeads]);
  useEffect(() => { setTaskPage(0); }, [taskSearch, statusFilter, taskColumnFilters]);
  useEffect(() => { setAssignedLeadsPage(0); }, [assignedSearch, coordinatorFilter, assignedSalesPersonFilter, assignedDateRange]);
  useEffect(() => { setTaskPage((page) => Math.min(page, Math.max(0, Math.ceil(filteredTasks.length / PAGE_SIZE) - 1))); }, [filteredTasks.length]);
  useEffect(() => { setAssignedLeadsPage((page) => Math.min(page, Math.max(0, Math.ceil(visibleAssignedLeads.length / PAGE_SIZE) - 1))); }, [visibleAssignedLeads.length]);
  const taskSalesPeople = useMemo(() => new Set(assignedLeads.map((lead) => lead.assignedEmployeeCode ?? lead.assignedEmployeeName).filter(Boolean)).size, [assignedLeads]);

  const assignLead = async () => {
    const values = Object.values(assignForm).map((value) => value.trim());
    if (values.some((value) => !value)) { setAssignMessage({ type: 'error', text: 'Please complete all fields, including the employee code.' }); return; }
    if (!/^\d{10}$/.test(assignForm.mobileNumber.trim())) { setAssignMessage({ type: 'error', text: 'Mobile number must contain exactly 10 digits.' }); return; }
    setAssigning(true); setAssignMessage(null);
    try {
      const { assignedAt, bestTimeForMeeting, ...leadValues } = assignForm;
      const lead = await leadService.assignLead({ ...leadValues, clientName: assignForm.clientName.trim(), mobileNumber: assignForm.mobileNumber.trim(), location: assignForm.location.trim(), clinicAddress: assignForm.clinicAddress.trim(), speciality: assignForm.speciality.trim(), bestTimeToMeet: bestTimeForMeeting as AssignLeadRequest['bestTimeToMeet'], salesPersonEmployeeCode: assignForm.salesPersonEmployeeCode.trim().toUpperCase(), assignmentDate: assignedAt });
      setAssignForm(emptyAssignForm());
      setAssignMessage({ type: 'success', text: `${lead.clientName ?? 'Lead'} assigned successfully${lead.assignedEmployeeName ? ` to ${lead.assignedEmployeeName}` : ''}.` });
    } catch (e) {
      let text = e instanceof Error ? e.message : 'Lead assignment failed.';
      if (isAlreadyAssignedError(e)) {
        try {
          const salesPersonName = await assignedSalesPersonForMobile(assignForm.mobileNumber);
          text = salesPersonName ? `This lead is assigned to ${salesPersonName}.` : 'This mobile number already belongs to an existing lead.';
        } catch {
          // The original backend message remains visible if the optional name lookup is unavailable.
        }
      }
      setAssignMessage({ type: 'error', text });
    }
    finally { setAssigning(false); }
  };

  const openVerify = (meeting: MeetingResponse) => {
    setForm(createMeetingVerificationForm(meeting, verified));
    const priorClientVerification = verified.find((item) => {
      if (!item.isClientMeeting || !item.blueantAppUsed) return false;
      const currentMobile = digitsOnly(meeting.mobileNumber);
      const priorMobile = digitsOnly(item.mobileNumber);
      if (currentMobile && priorMobile) return currentMobile === priorMobile;
      return Boolean(meeting.clientName && item.clientName && meeting.clientName.trim().toLowerCase() === item.clientName.trim().toLowerCase());
    });
    const nextClientForm = emptyClientVerificationForm(meeting);
    if (priorClientVerification?.blueantAppUsed) {
      nextClientForm.blueantAppUsed = priorClientVerification.blueantAppUsed;
      nextClientForm.blueantAppLocked = true;
    }
    setClientForm(nextClientForm);
    setSubmitError(null); setSelected(meeting);
  };
  const verifyClientMeeting = async (meeting: MeetingResponse & { meetingCode: string }) => {
    const isNotConducted = isNotConductedMeeting(meeting);
    const date = isNotConducted ? clientForm.meetingDate : clientForm.newMeetingDate;
    const business = !isNotConducted && clientForm.businessGenerated === 'YES';
    if (!date) { setSubmitError('Please choose the meeting date.'); return; }
    if (!isNotConducted && !clientForm.meetingTime) { setSubmitError('Please choose the meeting time.'); return; }
    if (!isNotConducted && !clientForm.blueantAppUsed) { setSubmitError('Please select whether the BlueAnt app was used.'); return; }
    if (!isNotConducted && clientForm.aloneWith === 'SOMEONE' && (!clientForm.personName.trim() || !clientForm.position)) { setSubmitError('Please enter the person name and select their designation.'); return; }
    if (!isNotConducted && !clientForm.businessGenerated) { setSubmitError('Please select whether business was generated.'); return; }
    if (business && !clientForm.businessItems.length) { setSubmitError('Select at least one business category.'); return; }
    const invalidBusinessItem = business && clientForm.businessItems.find((item) => {
      const requiresAmount = clientBusinessDefinition(item.businessType).requiresAmount;
      return (requiresAmount || item.amount.trim()) && !isValidAmount(item.amount);
    });
    if (invalidBusinessItem) { setSubmitError(`Enter a valid amount (0 or more) for ${clientBusinessDefinition(invalidBusinessItem.businessType).label}.`); return; }
    submittingRef.current = true; setSubmitting(true); setSubmitError(null); dataGeneration.current += 1;
    try {
      const remarks = clientForm.remarks.trim() || undefined;
      const businessTypes = clientBusinessTypes(clientForm);
      const investmentAmount = clientForm.businessGenerated === 'YES' ? clientInvestmentTotal(clientForm) : undefined;
      const businessItems = clientForm.businessGenerated === 'YES' ? clientForm.businessItems.map((item) => ({
        businessType: item.businessType,
        amount: item.amount.trim() ? Number(item.amount) : null,
      })) : undefined;
      const verifiedClientMeeting = await clientMeetingApi.verify(meeting.meetingCode, isNotConducted ? { meetingDate: clientForm.meetingDate, remarks } : {
        newMeetingDate: clientForm.newMeetingDate,
        meetingTime: clientForm.meetingTime, blueantAppUsed: clientForm.blueantAppUsed.trim() || undefined,
        aloneWith: clientForm.aloneWith,
        ...(clientForm.aloneWith === 'SOMEONE' ? { personName: clientForm.personName.trim(), position: clientForm.position.replace(/_/g, ' ') } : {}),
        businessGenerated: clientForm.businessGenerated || undefined, businessItems, remarks,
      });
      // The verification endpoint returns the PC answers but may omit the original client/profile
      // fields. Keep the values already loaded for the pending meeting so the verified list and
      // response modal remain useful after submission.
      const verifiedClientRecord: MeetingResponse = {
        ...clientMeetingAsCoordinatorRecord(verifiedClientMeeting),
        clientName: verifiedClientMeeting.clientName ?? meeting.clientName,
        mobileNumber: verifiedClientMeeting.mobileNumber ?? meeting.mobileNumber,
        alternateMobileNumber: meeting.alternateMobileNumber,
        email: meeting.email,
        speciality: meeting.speciality,
        location: meeting.location,
        clinicAddress: meeting.clinicAddress,
        employeeCode: verifiedClientMeeting.assignedEmployeeCode ?? meeting.employeeCode,
        employeeName: verifiedClientMeeting.assignedEmployeeName ?? meeting.employeeName,
        employeeRole: meeting.employeeRole,
        meetingMode: (verifiedClientMeeting.meetingMode ?? meeting.meetingMode) as MeetingResponse['meetingMode'],
        nextMeetingDate: verifiedClientMeeting.nextPlanDate ?? meeting.nextMeetingDate,
        meetingDate: clientForm.newMeetingDate,
        meetingTime: clientMeetingTime(clientForm.meetingTime),
        aloneWith: clientForm.aloneWith,
        personName: clientForm.aloneWith === 'SOMEONE' ? clientForm.personName.trim() : undefined,
        position: clientForm.aloneWith === 'SOMEONE' ? clientForm.position.replace(/_/g, ' ') : undefined,
        blueantAppUsed: clientForm.blueantAppUsed,
        businessGenerated: clientForm.businessGenerated,
        businessTypes,
        investmentType: undefined,
        investmentAmount,
        // Keep the RM/SC meeting note and the PC verification answer separate.
        // The verification API currently returns its response in `remarks`.
        remarks: meeting.remarks ?? meeting.meetingRemarks,
        meetingRemarks: meeting.meetingRemarks ?? meeting.remarks,
        verificationRemarks: verifiedClientMeeting.remarks ?? remarks,
        verificationStatus: 'VERIFIED',
      };
      setPending((items) => items.filter((item) => item.meetingCode !== meeting.meetingCode));
      const currentUser = await SecureStorageService.getUserData();
      const locallyVerifiedClients = await loadStoredVerifiedClientMeetings(currentUser?.employeeId);
      await saveStoredVerifiedClientMeetings(mergeVerifiedMeetings([verifiedClientRecord], locallyVerifiedClients), currentUser?.employeeId);
      setVerified((items) => mergeVerifiedMeetings([verifiedClientRecord], items));
      setSelected(null);
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Client meeting verification failed.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  const verify = async () => {
    if (!selected?.meetingCode || submittingRef.current) return;
    if (selected.isClientMeeting) { await verifyClientMeeting({ ...selected, meetingCode: selected.meetingCode }); return; }
    const notConducted = isNotConductedMeeting(selected);
    if (!form.meetingDate) { setSubmitError('Please choose the meeting date.'); return; }
    if (!form.meetingTiming) { setSubmitError('Please choose the meeting time.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(form.meetingTiming)) { setSubmitError('Meeting Time must use HH:mm:ss format.'); return; }
    if (!notConducted && !form.meetingWith) { setSubmitError('Please choose who joined the meeting.'); return; }
    if (!notConducted && form.meetingWith === 'SOMEONE_ELSE' && (!form.personName.trim() || !form.position.trim())) { setSubmitError('Please enter the person name and position.'); return; }
    const visibleValues = Object.fromEntries(
      (notConducted ? NOT_CONDUCTED_FIELDS : FIELDS)
        .filter((field) => isVerificationFieldVisible(field.key, form.meetingWith))
        .map((field) => [field.key, form[field.key].trim()]).filter(([, fieldValue]) => Boolean(fieldValue)),
    ) as MeetingVerificationRequest;
    const payload: MeetingVerificationRequest = notConducted ? visibleValues : { ...visibleValues, aloneWith: form.meetingWith === 'SELF' ? 'SELF' : 'SOMEONE', meetingWith: form.meetingWith };
    submittingRef.current = true; setSubmitting(true); setSubmitError(null);
    dataGeneration.current += 1;
    try {
      await meetingService.verifyMeeting(selected.meetingCode, payload);
      setPending((items) => items.filter((m) => m.meetingCode !== selected.meetingCode));
      setSelected(null);
      void meetingService.getVerificationMeetings('VERIFIED').then(setVerified).catch(() => undefined);
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Meeting verification failed.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  const openLeadHistory = async (lead: LeadResponse) => {
    setHistoryLead(lead); setHistoryMeetings([]); setHistoryError(null); setHistoryLoadingProgress(10); setHistoryLoading(true);
    const leadIdentifier = lead.uniqueLeadId ?? (lead.leadId !== undefined ? String(lead.leadId) : '');
    const sameLead = (meeting: MeetingResponse) => (lead.leadId !== undefined && meeting.leadId === lead.leadId) || (Boolean(lead.leadCode) && meeting.leadCode === lead.leadCode);
    const localMeetings = meetings.filter(sameLead);
    const verifiedMeetings = verified.filter(sameLead);
    try {
      const [detailResult, historyResult] = await Promise.all([
        lead.uniqueLeadId ? leadApi.getLeadDetails(lead.uniqueLeadId).then((result) => { setHistoryLoadingProgress(50); return result; }).catch(() => null) : Promise.resolve(null),
        leadIdentifier ? meetingApi.getHistory(leadIdentifier).then((result) => { setHistoryLoadingProgress(80); return result; }).catch(() => null) : Promise.resolve(null),
      ]);
      const byCode = new Map<string, MeetingResponse>();
      [...(historyResult?.data ?? []), ...localMeetings, ...verifiedMeetings].forEach((meeting) => { const key = meeting.meetingCode ?? String(meeting.id ?? ''); if (key) byCode.set(key, { ...byCode.get(key), ...meeting }); });
      const detailedMeetings = await Promise.all([...byCode.values()].map(async (meeting) => meeting.meetingCode ? meetingApi.getMeeting(meeting.meetingCode).then((result) => result.data ?? meeting).catch(() => meeting) : meeting));
      setHistoryLoadingProgress(100); setHistoryLead(detailResult?.data ? { ...lead, ...detailResult.data } : lead);
      setHistoryMeetings(detailedMeetings.sort((a, b) => String(b.meetingDate ?? b.createdAt ?? '').localeCompare(String(a.meetingDate ?? a.createdAt ?? ''))));
    } catch (e) { setHistoryError(e instanceof Error ? e.message : 'Lead history could not be loaded.'); setHistoryMeetings(localMeetings); }
    finally { setHistoryLoading(false); }
  };

  const renderTab = (item: typeof TABS[number]) => {
    const tone = item.key === 'today' ? 'Today' : item.key === 'responses' ? 'Responses' : item.key === 'tasks' ? 'Tasks' : 'Assign';
    const active = tab === item.key;
    const tabColor = tone === 'Today' ? '#4338CA' : tone === 'Responses' ? '#6D28D9' : tone === 'Tasks' ? '#047857' : '#B45309';
    const selectedForeground = isDark && Platform.OS === 'web' ? '#000000' : '#FFFFFF';
    return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, styles[`tab${tone}`], active && styles[`tab${tone}Active`]]}><View style={[styles.tabIcon, styles[`tab${tone}Icon`], active && styles.tabIconActive]}><Icon source={item.icon} size={14} color={active ? selectedForeground : tabColor} /></View><Text style={[styles.tabText, styles[`tab${tone}Color`], active && styles.tabTextActive, active && isDark && Platform.OS === 'web' && styles.darkModeWhiteSource]}>{item.label}</Text>{item.key === 'today' ? <Text style={[styles.badge, styles.badgeToday, active && styles.badgeActive]}>{pending.length}</Text> : null}</Pressable>;
  };
  const metricsBlock = <View style={styles.metrics}><Metric icon="clock-outline" value={pending.length} label="To review" tone="blue" /><Metric icon="account-outline" value={taskSalesPeople} label="Sales people" tone="orange" /></View>;
  const syncBlock = <View style={[styles.syncControls, compact && styles.syncControlsCompact]}><Pressable disabled={refreshing || submitting} onPress={() => void load(true)} style={({ pressed }) => [styles.syncButton, (refreshing || submitting) && styles.disabled, pressed && styles.pressed]}><Icon source="refresh" size={17} color="#3156C8" /><Text style={styles.refreshText}>Sync data</Text></Pressable><AutoRefreshBadge tab={tab} refreshing={refreshing} submitting={submitting} nextRefreshAt={nextRefreshAt} nextVerifiedRefreshAt={nextVerifiedRefreshAt} nextTaskRefreshAt={nextTaskRefreshAt} nextAssignedLeadsRefreshAt={nextAssignedLeadsRefreshAt} /></View>;
  const subtitle = tab === 'today' ? `Showing ${visibleTodayMeetings.length} of ${pending.length} meetings`
    : tab === 'responses' ? `Showing ${visibleVerifiedMeetings.length} of ${verified.length} verified meetings`
    : tab === 'tasks' ? `Showing ${filteredTasks.length} of ${taskRecords.length} active tasks`
    : tab === 'assignedLeads' ? `Showing ${visibleAssignedLeads.length} of ${assignedLeads.length} assigned leads`
    : 'Create a physical lead and assign it to a sales person';
  const hasAssignedFilters = Boolean(assignedSearch || coordinatorFilter || assignedSalesPersonFilter || assignedDateRange.from || assignedDateRange.to);
  const clearAssignedFilters = () => { setAssignedSearch(''); setCoordinatorFilter(''); setAssignedSalesPersonFilter(''); setAssignedDateRange({ from: '', to: '' }); };

  return <View style={[styles.page, compact && styles.pageCompact]}>
    <View style={styles.topSection}>
      <View style={[styles.workspaceHeader, compact && styles.workspaceHeaderCompact]}>{compact ? <><View style={styles.mobileHeaderTopRow}>{metricsBlock}{syncBlock}</View><View style={styles.mobileTabRow}>{TABS.slice(0, 3).map(renderTab)}</View><View style={styles.mobileTabRow}>{TABS.slice(3).map(renderTab)}</View></> : <>{metricsBlock}<View style={[styles.tabs, styles.workspaceTabs]}>{TABS.map(renderTab)}</View>{syncBlock}</>}</View>
      {refreshError ? <Text style={styles.error}>Sync failed. Retrying automatically in 10 seconds.</Text> : null}
    </View>
    <View style={styles.contentPanel}>
      <View style={styles.contentHeading}>
        <View style={[styles.contentHeadingRow, compact && styles.contentHeadingRowCompact]}>
          <View>
            <Text style={styles.contentTitle}>{TABS.find((item) => item.key === tab)?.label}</Text>
            <Text style={styles.contentSubtitle}>{subtitle}</Text>
          </View>
          {tab === 'responses' ? <TextInput value={responseSearch} onChangeText={setResponseSearch} placeholder="Search lead name or number" placeholderTextColor="#CBD9FF" style={[styles.headerSearch, compact && styles.headerSearchCompact]} /> : null}
          {tab === 'tasks' && !loading && !error ? <TaskToolbar search={taskSearch} onSearch={setTaskSearch} status={statusFilter} onStatus={setStatusFilter} /> : null}
          {tab === 'assignedLeads' ? <View style={[styles.assignedHeaderActions, compact && styles.assignedHeaderActionsCompact]}>
            <HeaderLeadFilters leads={assignedLeads} coordinatorFilter={coordinatorFilter} setCoordinatorFilter={setCoordinatorFilter} salesPersonFilter={assignedSalesPersonFilter} setSalesPersonFilter={setAssignedSalesPersonFilter} dateRange={assignedDateRange} setDateRange={setAssignedDateRange} search={assignedSearch} setSearch={setAssignedSearch} />
            {!compact ? <Pressable accessibilityLabel="Export assigned leads to Excel" disabled={exportingAssignedLeads} onPress={() => void exportAssignedLeads()} style={({ pressed }) => [styles.assignedExportButton, exportingAssignedLeads && styles.disabled, pressed && styles.pressed]}>{exportingAssignedLeads ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="file-excel-outline" size={18} color="#FFFFFF" />}</Pressable> : null}
            {hasAssignedFilters ? <Pressable accessibilityLabel="Clear assigned lead filters" onPress={clearAssignedFilters} style={styles.assignedClearButton}><Text style={styles.assignedClearText}>Clear</Text></Pressable> : null}
          </View> : null}
        </View>
      </View>
      {!compact && !loading && !error && tab === 'today' ? <MeetingTableHeader hideMeetingDate records={pending} filters={todayColumnFilters} onFiltersChange={setTodayColumnFilters} /> : null}
      {tab === 'tasks' ? <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator stickyHeaderIndices={[0]}>
        <View style={styles.taskStickyHeader}>{!compact && !loading && !error && tabLoading !== 'tasks' ? <MeetingTableHeader taskOnly records={taskRecords} filters={taskColumnFilters} onFiltersChange={setTaskColumnFilters} /> : null}</View>
        <View>
          {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
          {loading || tabLoading === 'tasks' ? <State loading progress={loading ? loadingProgress : tabLoadingProgress} message="Loading sales person tasks..." /> : error ? <State message={error} /> : null}
          {!loading && tabLoading !== 'tasks' && !error ? <><Cards taskOnly items={pagedTasks} empty="No meeting tasks match these filters." /><Pagination page={taskPage} total={filteredTasks.length} onPageChange={setTaskPage} /></> : null}
        </View>
      </ScrollView> : <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={tab === 'responses'} stickyHeaderIndices={tab === 'responses' ? [0] : undefined}>
        <View style={tab === 'responses' ? styles.verifiedStickyHeader : undefined}>{!compact && !loading && !error && tab === 'responses' ? <MeetingTableHeader verified records={verified} filters={responseColumnFilters} onFiltersChange={setResponseColumnFilters} /> : null}</View>
        {permissions?.length ? <Text style={styles.permission}>API access uses the permission codes returned in this authenticated session.</Text> : null}
        {loading ? <State loading progress={loadingProgress} message="Loading coordinator workspace..." /> : tabLoading === 'assignedLeads' ? <State loading progress={tabLoadingProgress} message="Loading assigned leads..." /> : error ? <State message={error} /> : null}
        {!loading && !error && tab === 'today' ? <Cards hideMeetingDate items={visibleTodayMeetings} empty="No meetings are pending Process Coordinator verification." action="Verify Details" onOpen={openVerify} /> : null}
        {!loading && !error && tab === 'responses' ? <Cards items={visibleVerifiedMeetings} empty="No meetings have been verified by the Sales Coordinator yet." action="Details" onOpen={setSelected} verified /> : null}
        {!loading && !error && tab === 'assign' ? <AssignLeadForm compact={compact} form={assignForm} setForm={setAssignForm} assigning={assigning} message={assignMessage} salesPersonNamesByCode={salesPersonNamesByCode} onSubmit={() => void assignLead()} /> : null}
        {!loading && tabLoading !== 'assignedLeads' && !error && tab === 'assignedLeads' ? <><AssignedLeadCards leads={pagedAssignedLeads} onOpen={openLeadHistory} /><Pagination page={assignedLeadsPage} total={visibleAssignedLeads.length} onPageChange={setAssignedLeadsPage} /></> : null}
      </ScrollView>}
    </View>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.backdrop}><View nativeID="blueant-workflow-modal" style={[styles.modal, selected && tab !== 'responses' && !selected.isClientMeeting && [popupStyles.modal, { width: Math.min(1100, Math.max(0, windowWidth - 48)) }]]}>
      {selected && tab !== 'responses' && !selected.isClientMeeting ? (
        <LeadVerificationPopup meeting={selected} form={form} setForm={setForm} submitError={submitError} submitting={submitting} onSubmit={() => void verify()} onClose={() => setSelected(null)} />
      ) : <>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>{tab === 'responses' ? 'VERIFIED RESPONSE' : 'PENDING VERIFICATION'}</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{selected?.clientName ?? selected?.meetingCode}</Text></View><Pressable onPress={() => setSelected(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>
        {selected ? <Details meeting={selected} visitOnly={isNotConductedMeeting(selected)} /> : null}
        {tab === 'responses' && selected ? selected.isClientMeeting ? <ClientVerificationDetails meeting={selected} /> : <VerificationDetails meeting={selected} />
          : selected?.isClientMeeting ? <ClientVerificationFields meeting={selected} form={clientForm} setForm={setClientForm} submitError={submitError} submitting={submitting} onSubmit={() => void verify()} />
          : null}
      </ScrollView>
      </>}
    </View></View></Modal>
    <Modal transparent visible={Boolean(historyLead)} animationType="fade" onRequestClose={() => setHistoryLead(null)}><View style={styles.backdrop}><View nativeID="blueant-workflow-modal" style={styles.modal}>
      <View style={styles.modalHeader}><View style={styles.modalHeaderCopy}><View style={styles.modalEyebrowRow}><View style={styles.modalEyebrowDot} /><Text style={styles.modalEyebrow}>LEAD HISTORY</Text></View><Text numberOfLines={1} style={styles.modalTitle}>{historyLead?.clientName ?? 'Lead details'}</Text></View><Pressable onPress={() => setHistoryLead(null)} style={styles.close}><Icon source="close" size={22} color="#334155" /></Pressable></View>
      <ScrollView contentContainerStyle={styles.modalBody}>{historyLead ? <LeadHistoryContent lead={historyLead} meetings={historyMeetings} loading={historyLoading} progress={historyLoadingProgress} error={historyError} /> : null}</ScrollView>
    </View></View></Modal>
  </View>;
}
