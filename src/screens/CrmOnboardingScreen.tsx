import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Icon } from 'react-native-paper';
import { crmAssignmentApi, type ClientDocumentType } from '../api/crmAssignment';
import { leadSearchApi } from '../api/leadSearch';
import { SecureStorageService } from '../services/SecureStorageService';
import type { LeadResponse } from '../types/lead';
import type { ClientRegistrationRequest, CrmAssignmentTarget, CrmPhysicalLeadRequest } from '../types/crm';
import { theme } from '../theme/theme';
import { useAppTheme } from '../theme/ThemeProvider';

type CrmTab = 'today' | 'assignClients' | 'assignedClients' | 'assign' | 'assigned';
type ClientFormSection = 'basic' | 'personal' | 'source' | 'investment' | 'family' | 'nominee' | 'documents' | 'assignment';
type CrmAssignForm = {
  clientName: string; mobileNumber: string; location: string; clinicAddress: string;
  speciality: string; salesPersonEmployeeCode: string; alternateMobileNumber: string; email: string;
  remarks: string; bestTimeToMeet: string; assignedAt: string;
  panNumber: string; dateOfBirth: string; motherName: string; placeOfBirth: string; occupation: string;
  actualDateOfBirth: string;
  familyHeadName: string; familyDetails: string; residentialAddress: string; correspondenceAddress: string; officeAddress: string;
  city: string; state: string; pinCode: string; clientSource: string; sourceDescription: string;
  applicationReceivedDate: string; applicationMode: string; investmentType: string; investmentTypes: string;
  firstInvestmentAmount: string; expectedMaxSIP: string; investwellId: string; clientReportDate: string;
  paymentStatus: string; paymentAmount: string; paymentDate: string; paymentReference: string;
  familyCode: string; newFamilyName: string; relationshipToHead: string; designateAsHead: string;
  nomineeName: string; nomineeRelationship: string; nomineeDateOfBirth: string; nomineeContactNumber: string; nomineePanNumber: string;
  nomineeIsMinor: string; guardianName: string; guardianRelationship: string; guardianContact: string; guardianPan: string;
  documentType: string; documentName: string; documentReceived: string; documentReceivedDate: string; documentVerificationStatus: string; documentReference: string; documentRemarks: string;
  panSubmission: string; aadhaarSubmission: string; passportSubmission: string; chequeSubmission: string; signatureSubmission: string; otherSubmission: string;
  panDocumentReference: string; aadhaarDocumentReference: string; passportDocumentReference: string; chequeDocumentReference: string; signatureDocumentReference: string; otherDocumentReference: string;
  panDocumentName: string; aadhaarDocumentName: string; passportDocumentName: string; chequeDocumentName: string; signatureDocumentName: string; otherDocumentName: string;
};
type AssignedClient = CrmAssignForm & {
  id: string;
  assignedEmployeeName?: string;
  assignedEmployeeRole?: CrmAssignmentTarget['role'];
  status: 'ASSIGNED';
};
const parseStoredAssignedClients = (value: string | null): AssignedClient[] => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed as AssignedClient[] : [];
  } catch {
    return [];
  }
};
type AssignmentFilters = { search: string; assignedTo: string; role: string; from: string; to: string };
type AssignmentFilterItem = { name?: string; mobile?: string; assignedTo?: string; role?: string; assignedAt?: string };
const DATE_FORM_FIELDS = new Set<keyof CrmAssignForm>([
  'dateOfBirth', 'actualDateOfBirth', 'applicationReceivedDate', 'clientReportDate',
  'paymentDate', 'nomineeDateOfBirth', 'documentReceivedDate',
]);

const localToday = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const emptyForm = (): CrmAssignForm => ({
  clientName: '', mobileNumber: '', location: '', clinicAddress: '', speciality: '', salesPersonEmployeeCode: '', alternateMobileNumber: '', email: '', remarks: '', bestTimeToMeet: '', assignedAt: localToday(),
  panNumber: '', dateOfBirth: '', actualDateOfBirth: '', motherName: '', placeOfBirth: '', occupation: '', familyHeadName: '', familyDetails: '', residentialAddress: '', correspondenceAddress: '', officeAddress: '', city: '', state: '', pinCode: '', clientSource: '', sourceDescription: '', applicationReceivedDate: '', applicationMode: '', investmentType: '', investmentTypes: '', firstInvestmentAmount: '', expectedMaxSIP: '', investwellId: '', clientReportDate: '', paymentStatus: '', paymentAmount: '', paymentDate: '', paymentReference: '', familyCode: '', newFamilyName: '', relationshipToHead: '', designateAsHead: '', nomineeName: '', nomineeRelationship: '', nomineeDateOfBirth: '', nomineeContactNumber: '', nomineePanNumber: '', nomineeIsMinor: '', guardianName: '', guardianRelationship: '', guardianContact: '', guardianPan: '', documentType: '', documentName: '', documentReceived: '', documentReceivedDate: '', documentVerificationStatus: '', documentReference: '', documentRemarks: '', panSubmission: '', aadhaarSubmission: '', passportSubmission: '', chequeSubmission: '', signatureSubmission: '', otherSubmission: '', panDocumentReference: '', aadhaarDocumentReference: '', passportDocumentReference: '', chequeDocumentReference: '', signatureDocumentReference: '', otherDocumentReference: '', panDocumentName: '', aadhaarDocumentName: '', passportDocumentName: '', chequeDocumentName: '', signatureDocumentName: '', otherDocumentName: '',
});
const roleLabel = (role: CrmAssignmentTarget['role']) => role === 'RELATIONSHIP_MANAGER' ? 'RM' : 'SC';
const roleName = (role: CrmAssignmentTarget['role']) => role === 'RELATIONSHIP_MANAGER' ? 'Relationship Manager' : 'Sales Coordinator';
// CRM assignment targets intentionally mirror the PC screen's static employee-code
// dropdown while the backend role-list endpoint is unavailable.
const CRM_ASSIGNMENT_TARGETS: readonly CrmAssignmentTarget[] = [
  { id: 0, employeeCode: 'AP0101', fullName: 'Avesh Prajapati', role: 'RELATIONSHIP_MANAGER' },
];
const ASSIGNED_CLIENTS_STORAGE_PREFIX = 'blueant.crm.assignedClients';
const CLIENT_FORM_DRAFT_STORAGE_PREFIX = 'blueant.crm.clientAssignmentDraft';
type ClientFormDraft = { form?: Partial<CrmAssignForm>; section?: ClientFormSection };
const parseStoredClientFormDraft = (value: string | null): ClientFormDraft | null => {
  try {
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ClientFormDraft : null;
  } catch {
    return null;
  }
};
const show = (value?: string | null) => value?.trim() || '-';
const roleCode = (value?: string) => String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
const messageFor = (error: unknown) => error instanceof Error ? error.message : 'Unable to load CRM assignment data.';
const emptyAssignmentFilters = (): AssignmentFilters => ({ search: '', assignedTo: '', role: '', from: '', to: '' });
const CLIENT_FORM_SECTIONS: readonly { key: ClientFormSection; label: string }[] = [
  { key: 'basic', label: 'Basic Client Details' }, { key: 'personal', label: 'PAN Details & Address' }, { key: 'source', label: 'Source & Application' }, { key: 'investment', label: 'Investment Details' }, { key: 'family', label: 'Family Details' }, { key: 'nominee', label: 'Nominee Details' }, { key: 'documents', label: 'Documents' }, { key: 'assignment', label: 'Assignment Details' },
];
const CLIENT_SECTION_INTRO: Record<ClientFormSection, { title: string; subtitle: string }> = {
  basic: { title: 'Basic Client Details', subtitle: 'Enter the client’s contact, clinic and meeting preference details.' },
  personal: { title: 'PAN Details & Address', subtitle: 'Add personal identification and address information.' },
  source: { title: 'Source & Application', subtitle: 'Record the source and application information.' },
  investment: { title: 'Investment & Payment', subtitle: 'Add investment preferences and payment details.' },
  family: { title: 'Family Details', subtitle: 'Add family information when it is available.' },
  nominee: { title: 'Nominee Details', subtitle: 'Add the nominee and guardian information.' },
  documents: { title: 'Documents', subtitle: 'Record document receipt and verification details.' },
  assignment: { title: 'Assignment Details', subtitle: 'Select the RM or SC and complete the client assignment.' },
};
const CLIENT_FORM_REQUIRED_FIELDS: readonly (keyof CrmAssignForm)[] = [
  'clientName', 'mobileNumber', 'location', 'clinicAddress', 'speciality', 'alternateMobileNumber', 'email', 'bestTimeToMeet', 'salesPersonEmployeeCode', 'assignedAt',
  'panNumber', 'dateOfBirth', 'actualDateOfBirth', 'motherName', 'placeOfBirth', 'occupation', 'residentialAddress', 'correspondenceAddress', 'officeAddress', 'city', 'state', 'pinCode',
  'clientSource', 'sourceDescription', 'applicationReceivedDate', 'applicationMode', 'clientReportDate', 'expectedMaxSIP', 'investwellId',
  'nomineeName', 'nomineeRelationship', 'nomineeDateOfBirth', 'nomineeContactNumber', 'nomineePanNumber',
];
const matchesAssignmentFilters = (item: AssignmentFilterItem, filters: AssignmentFilters) => {
  const query = filters.search.trim().toLowerCase();
  const assignedAt = String(item.assignedAt ?? '').slice(0, 10);
  return (!query || [item.name, item.mobile, item.assignedTo].some((value) => String(value ?? '').toLowerCase().includes(query)))
    && (!filters.assignedTo || item.assignedTo === filters.assignedTo)
    && (!filters.role || roleCode(item.role) === filters.role)
    && (!filters.from || assignedAt >= filters.from)
    && (!filters.to || assignedAt <= filters.to);
};

const loadCrmAssignedLeads = async (): Promise<LeadResponse[]> => {
  const currentUser = await SecureStorageService.getUserData();
  const currentEmployeeCode = currentUser?.employeeId?.trim();
  if (!currentEmployeeCode) return [];
  const first = await leadSearchApi.search({ page: 0, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
  const all = [...(first.data?.content ?? [])];
  for (let page = 1; page < (first.data?.totalPages ?? 1); page += 1) {
    const response = await leadSearchApi.search({ page, size: 100, sortBy: 'assignedAt', sortDirection: 'DESC' });
    all.push(...(response.data?.content ?? []));
  }
  return all
    .map((lead) => ({ ...lead, assignedAt: lead.assignmentDate ?? lead.assignedDate ?? lead.assignedAt }))
    .filter((lead) => {
      const source = String(lead.assignmentSource ?? '').toUpperCase();
      const isRmOrSc = ['RELATIONSHIP_MANAGER', 'SALES_COORDINATOR'].includes(roleCode(lead.assignedEmployeeRole));
      const isKnownCrmTarget = CRM_ASSIGNMENT_TARGETS.some((target) => target.employeeCode === lead.assignedEmployeeCode);
      const assignedByCurrentCrmUser = lead.assignedByEmployeeCode === currentEmployeeCode;
      // Older CRM records do not always return the assigner/role fields. A CRM
      // source, the current CRM assigner, or an RM/SC CRM target identifies
      // them without bringing PC -> SM assignments into this list.
      return (source.includes('CRM') || assignedByCurrentCrmUser || isKnownCrmTarget)
        && !source.includes('SALES_COORDINATOR')
        && (isRmOrSc || isKnownCrmTarget);
    });
};

export function CrmOnboardingScreen() {
  const { isDark } = useAppTheme();
  const [tab, setTab] = useState<CrmTab>('assign');
  const [clientSection, setClientSection] = useState<ClientFormSection>('basic');
  const [form, setForm] = useState<CrmAssignForm>(emptyForm);
  const [clientForm, setClientForm] = useState<CrmAssignForm>(emptyForm);
  const [clientTargets, setClientTargets] = useState<readonly CrmAssignmentTarget[]>(CRM_ASSIGNMENT_TARGETS);
  const [loadingClientTargets, setLoadingClientTargets] = useState(false);
  const [assignedLeads, setAssignedLeads] = useState<LeadResponse[]>([]);
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
  const [leadFilters, setLeadFilters] = useState<AssignmentFilters>(emptyAssignmentFilters);
  const [clientFilters, setClientFilters] = useState<AssignmentFilters>(emptyAssignmentFilters);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigningClient, setAssigningClient] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignedError, setAssignedError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadResponse | null>(null);
  const [clientMessage, setClientMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const hasAssignedLeadsData = useRef(false);
  const assignedLeadsLoadInFlight = useRef(false);
  const hasAssignedClientsData = useRef(false);
  const assignedClientsLoadInFlight = useRef(false);
  const clientDraftHydrated = useRef(false);
  const skipNextClientDraftSave = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const user = await SecureStorageService.getUserData();
        const key = `${CLIENT_FORM_DRAFT_STORAGE_PREFIX}.${user?.employeeId ?? 'current'}`;
        const draft = parseStoredClientFormDraft(await SecureStorageService.getPersistentItem(key));
        if (active && draft?.form) {
          setClientForm({ ...emptyForm(), ...draft.form, assignedAt: draft.form.assignedAt || localToday() });
          if (draft.section && CLIENT_FORM_SECTIONS.some((item) => item.key === draft.section)) setClientSection(draft.section);
          setClientMessage({ type: 'success', text: 'Your saved client-assignment draft has been restored.' });
        }
      } finally {
        if (active) clientDraftHydrated.current = true;
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!clientDraftHydrated.current) return undefined;
    if (skipNextClientDraftSave.current) {
      skipNextClientDraftSave.current = false;
      return undefined;
    }
    const saveTimer = setTimeout(() => {
      void (async () => {
        const user = await SecureStorageService.getUserData();
        const key = `${CLIENT_FORM_DRAFT_STORAGE_PREFIX}.${user?.employeeId ?? 'current'}`;
        await SecureStorageService.setPersistentItem(key, JSON.stringify({ form: clientForm, section: clientSection } satisfies ClientFormDraft));
      })();
    }, 350);
    return () => clearTimeout(saveTimer);
  }, [clientForm, clientSection]);

  const loadAssigned = useCallback(async (showLoader = true) => {
    if (assignedLeadsLoadInFlight.current) return;
    assignedLeadsLoadInFlight.current = true;
    if (showLoader) setLoadingAssigned(true);
    setAssignedError(null);
    try { setAssignedLeads(await loadCrmAssignedLeads()); hasAssignedLeadsData.current = true; }
    catch (error) { setAssignedError(messageFor(error)); }
    finally { assignedLeadsLoadInFlight.current = false; if (showLoader) setLoadingAssigned(false); }
  }, []);

  const loadAssignedClients = useCallback(async (showLoader = true) => {
    if (assignedClientsLoadInFlight.current) return;
    assignedClientsLoadInFlight.current = true;
    if (showLoader) setLoadingAssigned(true);
    setAssignedError(null);
    try {
      const user = await SecureStorageService.getUserData();
      const storageKey = `${ASSIGNED_CLIENTS_STORAGE_PREFIX}.${user?.employeeId ?? 'current'}`;
      const stored = await SecureStorageService.getPersistentItem(storageKey);
      setAssignedClients(parseStoredAssignedClients(stored));
      hasAssignedClientsData.current = true;
    } catch (error) { setAssignedError(messageFor(error)); }
    finally { assignedClientsLoadInFlight.current = false; if (showLoader) setLoadingAssigned(false); }
  }, []);

  useEffect(() => { if (tab === 'assigned' && !hasAssignedLeadsData.current) void loadAssigned(); }, [loadAssigned, tab]);
  useEffect(() => { if (tab === 'assignedClients' && !hasAssignedClientsData.current) void loadAssignedClients(); }, [loadAssignedClients, tab]);
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (hasAssignedLeadsData.current) void loadAssigned(false);
      if (hasAssignedClientsData.current) void loadAssignedClients(false);
    }, 30 * 60_000);
    return () => clearInterval(refreshTimer);
  }, [loadAssigned, loadAssignedClients]);

  const selectedTarget = useMemo(() => CRM_ASSIGNMENT_TARGETS.find((target) => target.employeeCode === form.salesPersonEmployeeCode), [form.salesPersonEmployeeCode]);
  const selectedClientTarget = useMemo(() => clientTargets.find((target) => target.employeeCode === clientForm.salesPersonEmployeeCode), [clientForm.salesPersonEmployeeCode, clientTargets]);
  const canSubmit = !assigning && [form.clientName, form.mobileNumber, form.location, form.clinicAddress, form.speciality, form.salesPersonEmployeeCode].every((value) => value.trim());
  const uploadedDocumentCount = [clientForm.panDocumentReference, clientForm.aadhaarDocumentReference, clientForm.passportDocumentReference, clientForm.chequeDocumentReference, clientForm.signatureDocumentReference, clientForm.otherDocumentReference].filter(Boolean).length;
  const canAssignClient = !assigningClient && CLIENT_FORM_REQUIRED_FIELDS.every((field) => clientForm[field].trim()) && uploadedDocumentCount >= 2;
  const validateClientSection = (section: ClientFormSection) => {
    const sectionFields: Record<ClientFormSection, readonly (keyof CrmAssignForm)[]> = {
      basic: ['clientName', 'mobileNumber', 'location', 'clinicAddress', 'speciality', 'alternateMobileNumber', 'email', 'bestTimeToMeet'],
      personal: ['panNumber', 'dateOfBirth', 'actualDateOfBirth', 'motherName', 'placeOfBirth', 'occupation', 'residentialAddress', 'correspondenceAddress', 'officeAddress', 'city', 'state', 'pinCode'],
      source: ['clientSource', 'sourceDescription', 'applicationReceivedDate', 'applicationMode', 'clientReportDate'],
      investment: ['expectedMaxSIP', 'investwellId'], family: [],
      nominee: ['nomineeName', 'nomineeRelationship', 'nomineeDateOfBirth', 'nomineeContactNumber', 'nomineePanNumber'],
      documents: [], assignment: ['salesPersonEmployeeCode', 'assignedAt'],
    };
    const labels: Partial<Record<keyof CrmAssignForm, string>> = { clientName: 'Client Name', mobileNumber: 'Mobile Number', location: 'Location', clinicAddress: 'Clinic Address', speciality: 'Profession', alternateMobileNumber: 'Alternate Mobile Number', email: 'Email', bestTimeToMeet: 'Best Time to Meet', panNumber: 'PAN Number', dateOfBirth: 'Date of Birth', actualDateOfBirth: 'Actual Date of Birth', clientSource: 'Client Source', clientReportDate: 'Onboarding Date', expectedMaxSIP: 'Expected Max SIP', investwellId: 'Investwell ID', salesPersonEmployeeCode: 'Employee Code', assignedAt: 'Assigned Date' };
    const missing = sectionFields[section].find((field) => !clientForm[field].trim());
    if (missing) { setClientMessage({ type: 'error', text: `${labels[missing] ?? String(missing)} is required.` }); return false; }
    if (section === 'basic' && !/^[6-9]\d{9}$/.test(clientForm.mobileNumber.trim())) { setClientMessage({ type: 'error', text: 'Mobile Number must be a valid 10-digit Indian number starting with 6, 7, 8 or 9.' }); return false; }
    if (section === 'basic' && !/^\d{10}$/.test(clientForm.alternateMobileNumber.trim())) { setClientMessage({ type: 'error', text: 'Alternate Mobile Number must contain exactly 10 digits.' }); return false; }
    if (section === 'basic' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email.trim())) { setClientMessage({ type: 'error', text: 'Email address format is invalid.' }); return false; }
    if (section === 'personal' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(clientForm.panNumber.trim().toUpperCase())) { setClientMessage({ type: 'error', text: 'PAN Number must use the format ABCDE1234F.' }); return false; }
    if (['personal', 'source', 'nominee', 'assignment'].includes(section)) {
      const dateFields = section === 'personal' ? ['dateOfBirth', 'actualDateOfBirth'] : section === 'source' ? ['applicationReceivedDate', 'clientReportDate'] : section === 'nominee' ? ['nomineeDateOfBirth'] : ['assignedAt'];
      const invalidDate = dateFields.find((field) => !/^\d{4}-\d{2}-\d{2}$/.test(clientForm[field as keyof CrmAssignForm] as string));
      if (invalidDate) { setClientMessage({ type: 'error', text: `${labels[invalidDate as keyof CrmAssignForm] ?? 'Date'} must use YYYY-MM-DD format.` }); return false; }
    }
    if (section === 'nominee' && !/^\d{10}$/.test(clientForm.nomineeContactNumber.trim())) { setClientMessage({ type: 'error', text: 'Nominee Contact Number must contain exactly 10 digits.' }); return false; }
    if (section === 'documents' && uploadedDocumentCount < 2) { setClientMessage({ type: 'error', text: 'Upload at least 2 document files before continuing.' }); return false; }
    setClientMessage({ type: 'success', text: `${CLIENT_FORM_SECTIONS.find((item) => item.key === section)?.label ?? 'Section'} is valid and saved in this form.` });
    return true;
  };

  const assignClient = async () => {
    if (!canAssignClient) return;
    if (!/^[6-9]\d{9}$/.test(clientForm.mobileNumber.trim())) {
      setClientMessage({ type: 'error', text: 'Mobile number must contain a valid 10-digit Indian mobile number.' });
      return;
    }
    if (clientForm.alternateMobileNumber.trim() && !/^\d{10}$/.test(clientForm.alternateMobileNumber.trim())) {
      setClientMessage({ type: 'error', text: 'Alternate mobile number must contain a valid 10-digit number.' });
      return;
    }
    setAssigningClient(true); setClientMessage(null);
    try {
      const payload: ClientRegistrationRequest = {
        clientName: clientForm.clientName.trim(), mobileNumber: clientForm.mobileNumber.trim(), speciality: clientForm.speciality.trim(),
        location: clientForm.location.trim(), clinicAddress: clientForm.clinicAddress.trim(), salesPersonEmployeeCode: clientForm.salesPersonEmployeeCode.trim().toUpperCase(),
        ...(clientForm.alternateMobileNumber.trim() ? { alternateMobileNumber: clientForm.alternateMobileNumber.trim() } : {}),
        ...(clientForm.email.trim() ? { email: clientForm.email.trim() } : {}), ...(clientForm.remarks.trim() ? { remarks: clientForm.remarks.trim() } : {}),
        ...(clientForm.assignedAt.trim() ? { assignmentDate: clientForm.assignedAt.trim() } : {}), ...(clientForm.bestTimeToMeet ? { bestTimeToMeet: clientForm.bestTimeToMeet } : {}),
        ...(clientForm.panNumber.trim() ? { panNumber: clientForm.panNumber.trim().toUpperCase() } : {}), ...(clientForm.actualDateOfBirth || clientForm.dateOfBirth ? { dateOfBirth: clientForm.actualDateOfBirth || clientForm.dateOfBirth } : {}), ...(clientForm.motherName.trim() ? { motherName: clientForm.motherName.trim() } : {}), ...(clientForm.placeOfBirth.trim() ? { placeOfBirth: clientForm.placeOfBirth.trim() } : {}), ...(clientForm.occupation.trim() ? { occupation: clientForm.occupation.trim() } : {}),
        ...(clientForm.familyHeadName.trim() ? { familyHeadName: clientForm.familyHeadName.trim() } : {}), ...(clientForm.familyDetails.trim() ? { familyDetails: clientForm.familyDetails.trim() } : {}), ...(clientForm.residentialAddress.trim() ? { residentialAddress: clientForm.residentialAddress.trim() } : {}), ...(clientForm.correspondenceAddress.trim() ? { correspondenceAddress: clientForm.correspondenceAddress.trim() } : {}), ...(clientForm.officeAddress.trim() ? { officeAddress: clientForm.officeAddress.trim() } : {}),
        ...(clientForm.city.trim() ? { city: clientForm.city.trim() } : {}), ...(clientForm.state.trim() ? { state: clientForm.state.trim() } : {}), ...(clientForm.pinCode.trim() ? { pinCode: clientForm.pinCode.trim() } : {}), ...(clientForm.clientSource.trim() ? { clientSource: clientForm.clientSource.trim() } : {}), ...(clientForm.sourceDescription.trim() ? { sourceDescription: clientForm.sourceDescription.trim() } : {}),
        ...(clientForm.applicationReceivedDate ? { applicationReceivedDate: clientForm.applicationReceivedDate } : {}), ...(clientForm.applicationMode.trim() ? { applicationMode: clientForm.applicationMode.trim() } : {}), ...(clientForm.investmentType.trim() ? { investmentType: clientForm.investmentType.trim() } : {}), ...(clientForm.investmentTypes.trim() ? { investmentTypes: clientForm.investmentTypes.split(',').map((value) => value.trim()).filter(Boolean) } : {}),
        ...(clientForm.firstInvestmentAmount.trim() ? { firstInvestmentAmount: Number(clientForm.firstInvestmentAmount) } : {}), ...(clientForm.expectedMaxSIP.trim() ? { expectedMaxSIP: Number(clientForm.expectedMaxSIP) } : {}), ...(clientForm.investwellId.trim() ? { investwellId: clientForm.investwellId.trim() } : {}), ...(clientForm.clientReportDate ? { clientReportDate: clientForm.clientReportDate } : {}),
        ...(clientForm.paymentStatus ? { paymentStatus: clientForm.paymentStatus as ClientRegistrationRequest['paymentStatus'] } : {}), ...(clientForm.paymentAmount.trim() ? { paymentAmount: Number(clientForm.paymentAmount) } : {}), ...(clientForm.paymentDate ? { paymentDate: clientForm.paymentDate } : {}), ...(clientForm.paymentReference.trim() ? { paymentReference: clientForm.paymentReference.trim() } : {}),
        ...(clientForm.newFamilyName.trim()
          ? { newFamilyName: clientForm.newFamilyName.trim() }
          : clientForm.familyCode.trim() ? { familyCode: clientForm.familyCode.trim() } : {}), ...(clientForm.relationshipToHead ? { relationshipToHead: clientForm.relationshipToHead as NonNullable<ClientRegistrationRequest['relationshipToHead']> } : {}), ...(clientForm.designateAsHead ? { designateAsHead: clientForm.designateAsHead === 'YES' } : {}),
        ...(clientForm.nomineeName.trim() ? { nominees: [{ nomineeName: clientForm.nomineeName.trim(), ...(clientForm.nomineeRelationship.trim() ? { relationship: clientForm.nomineeRelationship.trim() } : {}), ...(clientForm.nomineeDateOfBirth ? { dateOfBirth: clientForm.nomineeDateOfBirth } : {}), ...(clientForm.nomineeContactNumber.trim() ? { contactNumber: clientForm.nomineeContactNumber.trim() } : {}), ...(clientForm.nomineePanNumber.trim() ? { panNumber: clientForm.nomineePanNumber.trim().toUpperCase() } : {}), ...(clientForm.nomineeIsMinor ? { isMinor: clientForm.nomineeIsMinor === 'YES' } : {}), ...(clientForm.guardianName.trim() ? { guardianName: clientForm.guardianName.trim() } : {}), ...(clientForm.guardianRelationship.trim() ? { guardianRelationship: clientForm.guardianRelationship.trim() } : {}), ...(clientForm.guardianContact.trim() ? { guardianContact: clientForm.guardianContact.trim() } : {}), ...(clientForm.guardianPan.trim() ? { guardianPan: clientForm.guardianPan.trim().toUpperCase() } : {}) }] } : {}),
        ...(uploadedDocumentCount ? { documents: ([
          ['PAN', clientForm.panDocumentReference, 'PAN_CARD'], ['Aadhaar', clientForm.aadhaarDocumentReference, 'AADHAAR_CARD'], ['Passport', clientForm.passportDocumentReference, 'PASSPORT'], ['Cheque', clientForm.chequeDocumentReference, 'CHEQUE'], ['Signature', clientForm.signatureDocumentReference, 'SIGNATURE'], ['Other', clientForm.otherDocumentReference, 'OTHER'],
        ] as const).filter(([, reference]) => Boolean(reference)).map(([documentName, documentReference, documentType]) => ({ documentName, documentType, received: true, documentReference })) } : {}),
      };
      const response = await crmAssignmentApi.registerClient(payload);
      const client: AssignedClient = { ...clientForm, id: String(response.id ?? response.clientCode ?? `${Date.now()}-${clientForm.mobileNumber}`), clientName: response.clientName ?? payload.clientName, mobileNumber: response.mobileNumber ?? payload.mobileNumber, location: response.location ?? payload.location, clinicAddress: response.clinicAddress ?? payload.clinicAddress, speciality: response.speciality ?? payload.speciality, salesPersonEmployeeCode: response.assignedSalesPersonCode ?? payload.salesPersonEmployeeCode, alternateMobileNumber: response.alternateMobileNumber ?? clientForm.alternateMobileNumber, email: response.email ?? clientForm.email, remarks: response.remarks ?? clientForm.remarks, bestTimeToMeet: response.bestTimeToMeet ?? clientForm.bestTimeToMeet, assignedAt: response.assignedAt ?? response.assignmentDate ?? payload.assignmentDate ?? localToday(), assignedEmployeeName: response.assignedSalesPersonName ?? selectedClientTarget?.fullName, assignedEmployeeRole: roleCode(response.assignedSalesPersonRole) as CrmAssignmentTarget['role'] || selectedClientTarget?.role, status: 'ASSIGNED' };
      const user = await SecureStorageService.getUserData();
      const storageKey = `${ASSIGNED_CLIENTS_STORAGE_PREFIX}.${user?.employeeId ?? 'current'}`;
      const stored = await SecureStorageService.getPersistentItem(storageKey);
      const next = [client, ...parseStoredAssignedClients(stored).filter((item) => item.id !== client.id)];
      await SecureStorageService.setPersistentItem(storageKey, JSON.stringify(next));
      setAssignedClients(next);
      skipNextClientDraftSave.current = true;
      setClientForm(emptyForm());
      await SecureStorageService.removePersistentItem(`${CLIENT_FORM_DRAFT_STORAGE_PREFIX}.${user?.employeeId ?? 'current'}`);
      setClientMessage({ type: 'success', text: response.clientCode ? `${client.clientName} (${response.clientCode}) assigned successfully.` : `${client.clientName} assigned successfully.` });
    } catch (error) { setClientMessage({ type: 'error', text: messageFor(error) }); }
    finally { setAssigningClient(false); }
  };

  const assignLead = async () => {
    if (!canSubmit) return;
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim())) { setMessage({ type: 'error', text: 'Mobile number must contain a valid 10-digit Indian mobile number.' }); return; }
    setAssigning(true); setMessage(null);
    try {
      const payload: CrmPhysicalLeadRequest = {
        clientName: form.clientName.trim(), mobileNumber: form.mobileNumber.trim(), location: form.location.trim(),
        clinicAddress: form.clinicAddress.trim(), speciality: form.speciality.trim(),
        salesPersonEmployeeCode: form.salesPersonEmployeeCode.trim().toUpperCase(),
        ...(form.alternateMobileNumber.trim() ? { alternateMobileNumber: form.alternateMobileNumber.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.remarks.trim() ? { remarks: form.remarks.trim() } : {}),
        ...(form.assignedAt.trim() ? { assignmentDate: form.assignedAt.trim() } : {}),
        ...(form.bestTimeToMeet ? { bestTimeToMeet: form.bestTimeToMeet as CrmPhysicalLeadRequest['bestTimeToMeet'] } : {}),
      };
      const lead = await crmAssignmentApi.createPhysicalLead(payload);
      setAssignedLeads((current) => [{ ...lead, assignedEmployeeRole: selectedTarget?.role, leadStatus: 'ASSIGNED', assignedAt: lead.assignedAt ?? lead.assignmentDate }, ...current]);
      setMessage({ type: 'success', text: lead.statusMessage ?? `${lead.clientName ?? 'Lead'} assigned successfully${lead.assignedEmployeeName ? ` to ${lead.assignedEmployeeName}` : ''}.` });
      setForm(emptyForm());
    } catch (error) { setMessage({ type: 'error', text: messageFor(error) }); }
    finally { setAssigning(false); }
  };

  const sync = async () => {
    setRefreshing(true);
    await (tab === 'assigned' ? loadAssigned() : tab === 'assignedClients' ? loadAssignedClients() : Promise.resolve());
    setRefreshing(false);
  };

  return <View style={styles.page}>
    <View style={styles.topBar}>
      <View style={styles.tabs}>
        <TabButton active={tab === 'today'} label="Today Meetings" icon="calendar-check-outline" dark={isDark} onPress={() => setTab('today')} />
        <TabButton active={tab === 'assignClients'} label="Assign Clients" icon="account-plus-outline" dark={isDark} onPress={() => setTab('assignClients')} />
        <TabButton active={tab === 'assignedClients'} label="Assigned Clients" icon="account-arrow-right-outline" dark={isDark} onPress={() => setTab('assignedClients')} />
        <TabButton active={tab === 'assign'} label="Assign Leads" icon="account-plus-outline" dark={isDark} onPress={() => setTab('assign')} />
        <TabButton active={tab === 'assigned'} label="Assigned Leads" icon="account-arrow-right-outline" dark={isDark} onPress={() => setTab('assigned')} />
      </View>
      <Pressable disabled={refreshing || assigning} onPress={() => void sync()} style={({ pressed }) => [styles.syncButton, (refreshing || assigning) && styles.disabled, pressed && styles.pressed]}>{refreshing ? <ActivityIndicator size="small" color="#3156C8" /> : <Icon source="refresh" size={18} color="#3156C8" />}<Text style={styles.syncText}>{refreshing ? 'Syncing...' : 'Sync data'}</Text></Pressable>
    </View>
    <View style={styles.panel}>
      <View style={[styles.panelHeading, (tab === 'assigned' || tab === 'assignedClients') && styles.panelHeadingWithFilters]}><View><Text style={styles.panelTitle}>{tab === 'assign' ? 'Assign Leads' : tab === 'assigned' ? 'Assigned Leads' : tab === 'assignClients' ? 'Assign Clients' : tab === 'assignedClients' ? 'Assigned Clients' : 'Today Meetings'}</Text><Text style={styles.panelSubtitle}>{tab === 'assign' ? 'Create a physical lead and assign it only to an RM or SC.' : tab === 'assigned' ? `Showing ${assignedLeads.filter((lead) => matchesAssignmentFilters({ name: lead.clientName, mobile: lead.mobileNumber, assignedTo: lead.assignedEmployeeName, role: lead.assignedEmployeeRole, assignedAt: lead.assignedAt }, leadFilters)).length} of ${assignedLeads.length} assigned leads` : tab === 'assignClients' ? 'Assign an existing client to a Relationship Manager or Sales Coordinator.' : tab === 'assignedClients' ? `Showing ${assignedClients.filter((client) => matchesAssignmentFilters({ name: client.clientName, mobile: client.mobileNumber, assignedTo: client.assignedEmployeeName, role: client.assignedEmployeeRole, assignedAt: client.assignedAt }, clientFilters)).length} of ${assignedClients.length} assigned clients` : ' '}</Text></View>{tab === 'assigned' ? <AssignmentHeaderFilters items={assignedLeads.map((lead) => ({ name: lead.clientName, mobile: lead.mobileNumber, assignedTo: lead.assignedEmployeeName, role: lead.assignedEmployeeRole, assignedAt: lead.assignedAt }))} filters={leadFilters} onChange={setLeadFilters} label="leads" /> : tab === 'assignedClients' ? <AssignmentHeaderFilters items={assignedClients.map((client) => ({ name: client.clientName, mobile: client.mobileNumber, assignedTo: client.assignedEmployeeName, role: client.assignedEmployeeRole, assignedAt: client.assignedAt }))} filters={clientFilters} onChange={setClientFilters} label="clients" /> : null}</View>
      {tab === 'assignClients' ? <ClientFormSubheader active={clientSection} dark={isDark} onChange={setClientSection} /> : null}
      {tab === 'assign' ? <AssignForm form={form} targets={CRM_ASSIGNMENT_TARGETS} selectedTarget={selectedTarget} assigning={assigning} canSubmit={canSubmit} message={message} dark={isDark} onChange={(next) => setForm((current) => ({ ...current, ...next }))} onSubmit={() => void assignLead()} /> : tab === 'assigned' ? <AssignedLeadList leads={assignedLeads} filters={leadFilters} loading={loadingAssigned} error={assignedError} onSelectLead={setSelectedLead} /> : tab === 'assignClients' ? <AssignForm form={clientForm} targets={clientTargets} selectedTarget={selectedClientTarget} assigning={assigningClient || loadingClientTargets} canSubmit={canAssignClient && !loadingClientTargets} message={clientMessage} dark={isDark} kind="Client" section={clientSection} onChange={(next) => setClientForm((current) => ({ ...current, ...next }))} onValidateSection={() => validateClientSection(clientSection)} onSubmit={() => void assignClient()} /> : tab === 'assignedClients' ? <AssignedClientList clients={assignedClients} filters={clientFilters} loading={loadingAssigned} error={assignedError} /> : <View style={styles.blankPanel} />}
    </View>
    <CrmLeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
  </View>;
}

function TabButton({ active, label, icon, dark, onPress }: { active: boolean; label: string; icon: string; dark: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}><View style={[styles.tabIcon, active && styles.tabIconActive]}><Icon source={icon} size={14} color={active ? '#FFFFFF' : '#B45309'} /></View><Text style={[styles.tabText, active && styles.tabTextActive, dark && styles.darkModeWhiteSource]}>{label}</Text></Pressable>;
}

function ClientFormSubheader({ active, dark, onChange }: { active: ClientFormSection; dark: boolean; onChange: (section: ClientFormSection) => void }) {
  const progress = useRef(new Animated.Value(CLIENT_FORM_SECTIONS.findIndex((section) => section.key === active))).current;
  const [width, setWidth] = useState(0);
  const activeIndex = CLIENT_FORM_SECTIONS.findIndex((section) => section.key === active);
  useEffect(() => { Animated.timing(progress, { toValue: activeIndex, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [activeIndex, progress]);
  const itemWidth = Math.max(0, width - 8) / CLIENT_FORM_SECTIONS.length;
  const translateX = progress.interpolate({ inputRange: CLIENT_FORM_SECTIONS.map((_, index) => index), outputRange: CLIENT_FORM_SECTIONS.map((_, index) => itemWidth * index) });
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.clientSectionBar}>
    {width > 0 ? <Animated.View pointerEvents="none" style={[styles.clientSectionIndicator, { width: itemWidth, transform: [{ translateX }] }]} /> : null}
    {CLIENT_FORM_SECTIONS.map((section) => <Pressable key={section.key} onPress={() => onChange(section.key)} style={styles.clientSectionTab}><Text numberOfLines={1} style={[styles.clientSectionText, active === section.key && styles.clientSectionTextActive, dark && styles.clientSectionTextDark]}>{section.label}</Text></Pressable>)}
  </View>;
}

function AssignForm({ form, targets, selectedTarget, assigning, canSubmit, message, dark, kind = 'Lead', section = 'basic', onChange, onValidateSection, onSubmit }: { form: CrmAssignForm; targets: readonly CrmAssignmentTarget[]; selectedTarget?: CrmAssignmentTarget; assigning: boolean; canSubmit: boolean; message: { type: 'success' | 'error'; text: string } | null; dark: boolean; kind?: 'Lead' | 'Client'; section?: ClientFormSection; onChange: (next: Partial<CrmAssignForm>) => void; onValidateSection?: () => boolean; onSubmit: () => void }) {
  const sectionIntro = kind === 'Client' ? CLIENT_SECTION_INTRO[section] : { title: 'Lead Information', subtitle: 'Enter lead details, meeting preference, assignment date and RM/SC employee code.' };
  const fields: readonly { key: keyof CrmAssignForm; label: string; placeholder: string }[] = [
    { key: 'clientName', label: 'Client Name *', placeholder: 'e.g. Dr. Rajesh Kumar' }, { key: 'mobileNumber', label: 'Mobile Number *', placeholder: '10-digit mobile number' }, { key: 'location', label: 'Location *', placeholder: 'City or area' }, { key: 'clinicAddress', label: 'Clinic Address *', placeholder: 'Complete clinic address' }, { key: 'speciality', label: 'Profession *', placeholder: 'Profession' }, { key: 'alternateMobileNumber', label: 'Alternate Mobile Number *', placeholder: '10-digit alternate number' }, { key: 'email', label: 'Email *', placeholder: 'Email address' },
  ];
  const clientOnlyFields: readonly { key: keyof CrmAssignForm; label: string; placeholder: string }[] = [
    { key: 'panNumber', label: 'PAN Number', placeholder: 'ABCDE1234F' }, { key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'YYYY-MM-DD' }, { key: 'actualDateOfBirth', label: 'Actual Date of Birth', placeholder: 'YYYY-MM-DD' }, { key: 'motherName', label: 'Mother Name', placeholder: 'Mother name' }, { key: 'placeOfBirth', label: 'Place of Birth', placeholder: 'Place of birth' }, { key: 'occupation', label: 'Occupation', placeholder: 'Occupation' },
    { key: 'familyHeadName', label: 'Family Head Name', placeholder: 'Family head name' }, { key: 'familyDetails', label: 'Family Details', placeholder: 'Family details' }, { key: 'residentialAddress', label: 'Residential Address', placeholder: 'Residential address' }, { key: 'correspondenceAddress', label: 'Correspondence Address', placeholder: 'Correspondence address' }, { key: 'officeAddress', label: 'Office Address', placeholder: 'Office address' },
    { key: 'city', label: 'City', placeholder: 'City' }, { key: 'state', label: 'State', placeholder: 'State' }, { key: 'pinCode', label: 'PIN Code', placeholder: 'PIN code' }, { key: 'clientSource', label: 'Client Source', placeholder: 'Source' }, { key: 'sourceDescription', label: 'Source Description', placeholder: 'Source description' },
    { key: 'applicationReceivedDate', label: 'Application Received Date', placeholder: 'YYYY-MM-DD' }, { key: 'applicationMode', label: 'Application Mode', placeholder: 'Application mode' }, { key: 'expectedMaxSIP', label: 'Expected Max SIP', placeholder: 'Amount' }, { key: 'investwellId', label: 'Investwell ID', placeholder: 'Investwell ID' }, { key: 'clientReportDate', label: 'Onboarding Date', placeholder: 'YYYY-MM-DD' },
    { key: 'paymentAmount', label: 'Payment Amount', placeholder: 'Amount' }, { key: 'paymentDate', label: 'Payment Date', placeholder: 'YYYY-MM-DD' }, { key: 'paymentReference', label: 'Payment Reference', placeholder: 'Payment reference' }, { key: 'familyCode', label: 'Family Code (existing)', placeholder: 'Valid existing family code' }, { key: 'newFamilyName', label: 'New Family Name', placeholder: 'New family name' },
    { key: 'nomineeName', label: 'Nominee Name', placeholder: 'Nominee name' }, { key: 'nomineeRelationship', label: 'Nominee Relationship', placeholder: 'Relationship' }, { key: 'nomineeDateOfBirth', label: 'Nominee Date of Birth', placeholder: 'YYYY-MM-DD' }, { key: 'nomineeContactNumber', label: 'Nominee Contact Number', placeholder: '10-digit mobile number' }, { key: 'nomineePanNumber', label: 'Nominee PAN Number', placeholder: 'ABCDE1234F' },
    { key: 'documentName', label: 'Document Name *', placeholder: 'Document name' }, { key: 'documentReceivedDate', label: 'Document Received Date *', placeholder: 'YYYY-MM-DD' }, { key: 'documentReference', label: 'Document Reference *', placeholder: 'Document reference' },
  ];
  const clientSectionKeys: Partial<Record<ClientFormSection, readonly (keyof CrmAssignForm)[]>> = {
    personal: ['panNumber', 'dateOfBirth', 'actualDateOfBirth', 'motherName', 'placeOfBirth', 'occupation', 'residentialAddress', 'correspondenceAddress', 'officeAddress', 'city', 'state', 'pinCode'],
    source: ['clientSource', 'sourceDescription', 'applicationReceivedDate', 'applicationMode', 'clientReportDate'],
    investment: ['expectedMaxSIP', 'investwellId'],
    family: ['familyDetails'],
    nominee: ['nomineeName', 'nomineeRelationship', 'nomineeDateOfBirth', 'nomineeContactNumber', 'nomineePanNumber'],
    documents: [],
  };
  const visibleTextFields = kind === 'Client'
    ? section === 'basic' ? fields : clientOnlyFields.filter((field) => clientSectionKeys[section]?.includes(field.key))
    : fields;
  const isDocumentSection = kind === 'Client' && section === 'documents';
  return <ScrollView contentContainerStyle={[styles.formWrap, isDocumentSection && styles.documentFormWrap]} showsVerticalScrollIndicator={false}>
    <View style={[styles.formIntro, isDocumentSection && styles.documentFormIntro]}><View style={[styles.formIntroIcon, isDocumentSection && styles.documentFormIntroIcon]}><Icon source="account-arrow-right-outline" size={isDocumentSection ? 20 : 24} color="#3156C8" /></View><View><Text style={[styles.formIntroTitle, isDocumentSection && styles.documentFormIntroTitle]}>{sectionIntro.title}</Text><Text style={[styles.formIntroText, isDocumentSection && styles.documentFormIntroText]}>{sectionIntro.subtitle}</Text></View></View>
    <View style={styles.divider} />
    <View style={styles.grid}>{visibleTextFields.map((field) => field.key === 'clientSource' ? <Field key={field.key} label="Client Source *"><Select value={form.clientSource} onChange={(clientSource) => onChange({ clientSource })}><Picker.Item label="Select client source" value="" />{['Reference', 'Program', 'Cold Call', 'Canopy', 'Event', 'Walk In', 'Online Platforms'].map((value) => <Picker.Item key={value} label={value} value={value} />)}</Select></Field> : <Field key={field.key} label={kind === 'Lead' && ['alternateMobileNumber', 'email'].includes(field.key) ? field.label.replace(' *', '') : kind === 'Client' && !field.label.endsWith('*') && section !== 'family' ? `${field.label} *` : field.label}>{DATE_FORM_FIELDS.has(field.key) ? <DateField value={form[field.key]} placeholder={field.placeholder} onChange={(value) => onChange({ [field.key]: value })} /> : <TextInput value={form[field.key]} onChangeText={(text) => onChange({ [field.key]: field.key === 'mobileNumber' || ['nomineeContactNumber', 'guardianContact'].includes(field.key) ? text.replace(/\D/g, '').slice(0, 10) : text })} placeholder={field.placeholder} placeholderTextColor="#A1A9B7" keyboardType={field.key === 'mobileNumber' || ['firstInvestmentAmount', 'expectedMaxSIP', 'paymentAmount', 'nomineeContactNumber', 'guardianContact'].includes(field.key) ? 'numeric' : 'default'} style={styles.input} />}</Field>)}
      {(kind !== 'Client' || section === 'basic') ? <Field label={kind === 'Client' ? 'Best Time to Meet *' : 'Best Time to Meet'}><Select value={form.bestTimeToMeet} onChange={(bestTimeToMeet) => onChange({ bestTimeToMeet })}><Picker.Item label="Select best time" value="" />{kind === 'Client' ? <>{['By Appointment', '1st half of the day', '2nd half of the day', 'Only on weekend'].map((value) => <Picker.Item key={value} label={value} value={value} />)}</> : <><Picker.Item label="9:00 AM - 12:00 PM" value="NINE_TO_TWELVE" /><Picker.Item label="12:00 PM - 3:00 PM" value="TWELVE_TO_THREE" /><Picker.Item label="3:00 PM - 6:00 PM" value="THREE_TO_SIX" /><Picker.Item label="6:00 PM - 9:00 PM" value="SIX_TO_NINE" /></>}</Select></Field> : null}
      {(kind !== 'Client' || section === 'assignment') ? <><Field label="Employee Code *"><Select value={form.salesPersonEmployeeCode} onChange={(salesPersonEmployeeCode) => onChange({ salesPersonEmployeeCode })} disabled={assigning}><Picker.Item label="Select RM or SC employee" value="" />{targets.map((target) => <Picker.Item key={target.employeeCode} label={`${roleLabel(target.role)} - ${target.employeeCode} - ${target.fullName}`} value={target.employeeCode} />)}</Select>{selectedTarget ? <Text style={styles.selectedTarget}>{roleName(selectedTarget.role)}: {selectedTarget.fullName}</Text> : null}</Field><Field label={kind === 'Client' ? 'Assigned Date *' : 'Assigned Date'}><DateField value={form.assignedAt} placeholder="YYYY-MM-DD" onChange={(assignedAt) => onChange({ assignedAt })} /></Field></> : null}
      {kind === 'Client' && section === 'documents' ? <><View style={styles.documentUploadGrid}>{([['PAN', 'panDocumentReference', 'panDocumentName', 'PAN_CARD'], ['Aadhaar', 'aadhaarDocumentReference', 'aadhaarDocumentName', 'AADHAAR_CARD'], ['Passport', 'passportDocumentReference', 'passportDocumentName', 'PASSPORT'], ['Cheque', 'chequeDocumentReference', 'chequeDocumentName', 'CHEQUE'], ['Signature', 'signatureDocumentReference', 'signatureDocumentName', 'SIGNATURE'], ['Other', 'otherDocumentReference', 'otherDocumentName', 'OTHER']] as const).map(([label, referenceKey, nameKey, documentType]) => <DocumentUploadField key={referenceKey} label={label} documentReference={form[referenceKey]} documentName={form[nameKey]} documentType={documentType} onUploaded={(documentReference, documentName) => onChange({ [referenceKey]: documentReference, [nameKey]: documentName })} onCancel={() => onChange({ [referenceKey]: '', [nameKey]: '' })} />)}</View><Text style={styles.completionHint}>Upload PDF, JPG or PNG files (maximum 10 MB). At least 2 uploaded documents are required.</Text></> : null}
      {kind === 'Client' ? section === 'assignment' ? <View style={[styles.actionField, styles.assignmentActionField]}><View style={styles.assignmentActionControl}><Text style={styles.label}>Review Details</Text><Pressable onPress={onValidateSection} style={({ pressed }) => [styles.validateButton, pressed && styles.pressed]}><Icon source="content-save-check-outline" size={18} color="#3156C8" /><Text style={styles.validateButtonText}>Save & Validate</Text></Pressable></View><View style={styles.assignmentActionControl}><Text style={styles.label}>Client Assignment</Text><Pressable disabled={!canSubmit} onPress={onSubmit} style={({ pressed }) => [styles.assignButton, !canSubmit && (dark ? { borderWidth: 1, borderColor: '#808080', backgroundColor: '#808080', opacity: 1 } : styles.disabled), pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={[styles.assignButtonText, dark && styles.darkModeWhiteSource]}>{assigning ? 'Assigning...' : 'Assign Client'}</Text></Pressable></View></View> : <View style={styles.actionField}><Pressable onPress={onValidateSection} style={({ pressed }) => [styles.validateButton, pressed && styles.pressed]}><Icon source="content-save-check-outline" size={18} color="#3156C8" /><Text style={styles.validateButtonText}>Save & Validate</Text></Pressable></View> : <View style={styles.actionField}><Pressable disabled={!canSubmit} onPress={onSubmit} style={({ pressed }) => [styles.assignButton, !canSubmit && (dark ? styles.darkDisabledButton : styles.disabled), pressed && styles.pressed]}>{assigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon source="account-check-outline" size={18} color="#FFFFFF" />}<Text style={[styles.assignButtonText, dark && styles.darkModeWhiteSource]}>{assigning ? 'Assigning...' : 'Assign Lead'}</Text></Pressable></View>}
    </View>
    {message ? <View style={[styles.feedback, message.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}><Icon source={message.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'} size={16} color={message.type === 'success' ? '#15803D' : '#B91C1C'} /><Text style={[styles.feedbackText, message.type === 'error' && styles.feedbackErrorText]}>{message.text}</Text></View> : null}
  </ScrollView>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
function Select({ value, onChange, disabled, children }: { value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) { return <View style={styles.selectShell}><Picker selectedValue={value} onValueChange={(value) => onChange(String(value))} enabled={!disabled} style={styles.select}>{children}</Picker></View>; }
function DocumentUploadField({ label, documentReference, documentName, documentType, onUploaded, onCancel }: { label: string; documentReference: string; documentName: string; documentType: ClientDocumentType; onUploaded: (documentReference: string, documentName: string) => void; onCancel: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chooseAndUpload = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) { setError('Only JPG, JPEG, PNG or PDF files are allowed.'); return; }
    if ((file.size ?? 0) > 10 * 1024 * 1024) { setError('File must be 10 MB or smaller.'); return; }
    setUploading(true);
    try {
      const uploaded = await crmAssignmentApi.uploadClientDocument({ uri: file.uri, name: file.name || `${label}-document`, mimeType: file.mimeType, file: file.file }, documentType);
      if (!uploaded.documentReference) throw new Error('The server did not return a document reference.');
      onUploaded(uploaded.documentReference, uploaded.fileName || file.name || label);
    } catch (uploadError) { setError(messageFor(uploadError)); }
    finally { setUploading(false); }
  };
  return <View style={[styles.documentUploadCard, documentReference && styles.documentUploadCardComplete]}><View style={styles.documentUploadTop}><View style={styles.documentTypeIcon}><Icon source={documentReference ? 'file-check-outline' : 'file-upload-outline'} size={18} color={documentReference ? '#047857' : '#475569'} /></View><View style={styles.documentUploadCopy}><Text style={styles.documentUploadLabel}>{label}</Text><Text numberOfLines={1} style={styles.documentUploadStatus}>{documentReference ? documentName || 'Uploaded successfully' : 'PDF, JPG or PNG'}</Text></View>{documentReference ? <View style={styles.documentUploadedRow}><View style={styles.documentStatusPill}><Icon source="check" size={12} color="#047857" /><Text style={styles.documentStatusPillText}>Uploaded</Text></View><View style={styles.documentUploadActions}><Pressable onPress={() => void chooseAndUpload()} style={({ pressed }) => [styles.documentReplaceAction, pressed && styles.pressed]}><Icon source="swap-horizontal" size={12} color="#2563EB" /><Text style={styles.documentReplaceText}>Replace</Text></Pressable><Pressable onPress={onCancel} accessibilityLabel={`Cancel ${label} document`} style={({ pressed }) => [styles.documentCancelAction, pressed && styles.pressed]}><Icon source="close" size={13} color="#B91C1C" /></Pressable></View></View> : <Pressable disabled={uploading} onPress={() => void chooseAndUpload()} style={({ pressed }) => [styles.documentUploadButton, uploading && styles.disabled, pressed && styles.pressed]}>{uploading ? <ActivityIndicator size="small" color="#3156C8" /> : <Icon source="upload" size={14} color="#3156C8" />}<Text style={styles.documentUploadButtonText}>{uploading ? 'Uploading' : 'Upload'}</Text></Pressable>}</View>{documentReference ? <Text style={styles.documentUploadedText}>Saved securely • Ready to attach</Text> : null}{error ? <Text style={styles.documentUploadError}>{error}</Text> : null}</View>;
}
function DateField({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <><Pressable accessibilityRole="button" accessibilityLabel={`Choose date${value ? `, selected ${value}` : ''}`} onPress={() => setOpen(true)} style={styles.dateField}><Icon source="calendar-month-outline" size={19} color="#3156C8" /><Text style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]}>{value || placeholder}</Text><Icon source="chevron-down" size={18} color="#64748B" /></Pressable><Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}><Pressable style={styles.calendarBackdrop} onPress={() => setOpen(false)}><Pressable style={styles.calendarCard} onPress={(event) => event.stopPropagation()}><View style={styles.datePickerHeader}><Text style={styles.calendarTitle}>CHOOSE DATE</Text>{value ? <Pressable onPress={() => { onChange(''); setOpen(false); }}><Text style={styles.dateClearText}>Clear</Text></Pressable> : null}</View><WheelDatePicker value={value} onSelect={onChange} onDone={() => setOpen(false)} /></Pressable></Pressable></Modal></>;
}
function WheelDatePicker({ value, onSelect, onDone }: { value: string; onSelect: (value: string) => void; onDone: () => void }) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').map(Number) : null;
  const today = new Date();
  const [year, setYear] = useState(parsed?.[0] ?? today.getFullYear());
  const [month, setMonth] = useState(parsed?.[1] ?? today.getMonth() + 1);
  const [day, setDay] = useState(parsed?.[2] ?? today.getDate());
  const maxDay = new Date(year, month, 0).getDate();
  const selectedDay = Math.min(day, maxDay);
  useEffect(() => { if (day !== selectedDay) setDay(selectedDay); }, [day, selectedDay]);
  const selectDate = () => onSelect(`${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
  const years = Array.from({ length: 121 }, (_, index) => today.getFullYear() - index);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: maxDay }, (_, index) => index + 1);
  const monthName = (monthNumber: number) => new Date(2000, monthNumber - 1, 1).toLocaleString('en-IN', { month: 'short' });
  const datePreview = `${String(selectedDay).padStart(2, '0')} ${new Date(year, month - 1, selectedDay).toLocaleString('en-IN', { month: 'long' })} ${year}`;
  return <View style={styles.wheelPicker}><View style={styles.wheelPreview}><Icon source="calendar-check-outline" size={17} color="#334155" /><Text style={styles.wheelPreviewText}>{datePreview}</Text></View><Text style={styles.wheelHint}>Scroll a column, then tap the value you want</Text><View style={styles.wheelColumns}><WheelColumn label="YEAR" values={years} selected={year} display={(item) => String(item)} onSelect={setYear} /><WheelColumn label="MONTH" values={months} selected={month} display={monthName} onSelect={setMonth} /><WheelColumn label="DATE" values={days} selected={selectedDay} display={(item) => String(item)} onSelect={setDay} /></View><Pressable onPress={() => { selectDate(); onDone(); }} style={styles.wheelDoneButton}><Icon source="check" size={17} color="#FFFFFF" /><Text style={styles.wheelDoneText}>Apply date</Text></Pressable></View>;
}
function WheelColumn({ label, values, selected, display, onSelect }: { label: string; values: readonly number[]; selected: number; display: (value: number) => string; onSelect: (value: number) => void }) {
  return <View style={styles.wheelColumn}><Text style={styles.wheelLabel}>{label}</Text><ScrollView nestedScrollEnabled style={styles.wheelScroll} showsVerticalScrollIndicator contentContainerStyle={styles.wheelList}>{values.map((item) => <Pressable key={item} onPress={() => onSelect(item)} style={[styles.wheelOption, item === selected && styles.wheelOptionSelected]}><Text style={[styles.wheelOptionText, item === selected && styles.wheelOptionTextSelected]}>{display(item)}</Text></Pressable>)}</ScrollView></View>;
}

function AssignedLeadList({ leads, filters, loading, error, onSelectLead }: { leads: LeadResponse[]; filters: AssignmentFilters; loading: boolean; error: string | null; onSelectLead: (lead: LeadResponse) => void }) {
  const visibleLeads = leads.filter((lead) => matchesAssignmentFilters({ name: lead.clientName, mobile: lead.mobileNumber, assignedTo: lead.assignedEmployeeName, role: lead.assignedEmployeeRole, assignedAt: lead.assignedAt }, filters));
  if (loading) return <View style={styles.state}><ActivityIndicator color="#3156C8" /><Text style={styles.stateText}>Loading assigned leads...</Text></View>;
  if (error) return <View style={styles.state}><Icon source="alert-circle-outline" size={34} color="#B91C1C" /><Text style={styles.stateText}>{error}</Text></View>;
  if (!leads.length) return <View style={styles.state}><Icon source="clipboard-text-outline" size={34} color="#94A3B8" /><Text style={styles.stateTitle}>No leads assigned by CRM yet</Text><Text style={styles.stateText}>CRM assignments to RM and SC will appear here.</Text></View>;
  return <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>{visibleLeads.length ? visibleLeads.map((lead) => <Pressable key={lead.leadId ?? lead.leadCode} accessibilityRole="button" accessibilityLabel={`Open ${show(lead.clientName)} details`} onPress={() => onSelectLead(lead)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.cardTop}><View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardName}>{show(lead.clientName)}</Text><Text style={styles.cardMobile}>{roleCode(lead.assignedEmployeeRole) === 'RELATIONSHIP_MANAGER' ? 'RM' : 'SC'} · {show(lead.mobileNumber)}</Text></View><View style={styles.rolePill}><Text numberOfLines={1} style={styles.rolePillText}>{show(lead.leadStatus?.replace(/_/g, ' '))}</Text></View></View><View style={styles.cardDivider} /><View style={styles.cardDetails}><Info label="ASSIGNED TO" value={lead.assignedEmployeeName} /><Info label="ASSIGNED DATE" value={lead.assignedAt} /><Info label="LAST MEETING / VERIFIED" value="—" /></View></Pressable>) : <NoFilteredResults />}</ScrollView>;
}

function AssignedClientList({ clients, filters, loading, error }: { clients: AssignedClient[]; filters: AssignmentFilters; loading: boolean; error: string | null }) {
  const visibleClients = clients.filter((client) => matchesAssignmentFilters({ name: client.clientName, mobile: client.mobileNumber, assignedTo: client.assignedEmployeeName, role: client.assignedEmployeeRole, assignedAt: client.assignedAt }, filters));
  if (loading) return <View style={styles.state}><ActivityIndicator color="#3156C8" /><Text style={styles.stateText}>Loading assigned clients...</Text></View>;
  if (error) return <View style={styles.state}><Icon source="alert-circle-outline" size={34} color="#B91C1C" /><Text style={styles.stateText}>{error}</Text></View>;
  if (!clients.length) return <View style={styles.state}><Icon source="account-multiple-outline" size={34} color="#94A3B8" /><Text style={styles.stateTitle}>No clients assigned by CRM yet</Text><Text style={styles.stateText}>Clients assigned from the Assign Clients tab will appear here.</Text></View>;
  return <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>{visibleClients.length ? visibleClients.map((client) => <View key={client.id} style={styles.card}><View style={styles.cardTop}><View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardName}>{show(client.clientName)}</Text><Text style={styles.cardMobile}>{client.assignedEmployeeRole === 'RELATIONSHIP_MANAGER' ? 'RM' : 'SC'} · {show(client.mobileNumber)}</Text></View><View style={styles.rolePill}><Text numberOfLines={1} style={styles.rolePillText}>{client.status}</Text></View></View><View style={styles.cardDivider} /><View style={styles.cardDetails}><Info label="ASSIGNED TO" value={client.assignedEmployeeName} /><Info label="ASSIGNED DATE" value={client.assignedAt} /><Info label="LOCATION" value={client.location} /></View></View>) : <NoFilteredResults />}</ScrollView>;
}

function AssignmentHeaderFilters({ items, filters, onChange, label }: { items: AssignmentFilterItem[]; filters: AssignmentFilters; onChange: (filters: AssignmentFilters) => void; label: string }) {
  const assignedTo = [...new Set(items.map((item) => item.assignedTo).filter(Boolean))] as string[];
  const roles = [...new Set(items.map((item) => roleCode(item.role)).filter(Boolean))];
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateTarget, setDateTarget] = useState<'from' | 'to'>('from');
  const update = (next: Partial<AssignmentFilters>) => onChange({ ...filters, ...next });
  const hasFilters = Boolean(filters.search || filters.assignedTo || filters.role || filters.from || filters.to);
  const rangeLabel = filters.from || filters.to ? `${filters.from || '...'} to ${filters.to || '...'}` : 'All assigned dates';
  return <><View style={styles.headerFilters}><TextInput value={filters.search} onChangeText={(search) => update({ search })} placeholder={`Search ${label.slice(0, -1)} name or mobile`} placeholderTextColor="#CBD9FF" style={styles.headerSearch} /><Pressable onPress={() => { setDateTarget('from'); setCalendarOpen(true); }} style={styles.headerDatePicker}><Icon source="calendar-month-outline" size={15} color="#BFD1FF" /><Text numberOfLines={1} style={styles.headerDateText}>{rangeLabel}</Text>{filters.from || filters.to ? <Pressable onPress={() => update({ from: '', to: '' })}><Icon source="close-circle" size={15} color="#BFD1FF" /></Pressable> : <Icon source="chevron-down" size={15} color="#BFD1FF" />}</Pressable><View style={styles.headerPickerShell}><Picker selectedValue={filters.assignedTo} onValueChange={(assignedTo) => update({ assignedTo: String(assignedTo) })} style={styles.headerPicker}><Picker.Item label="All assigned to" value="" />{assignedTo.map((name) => <Picker.Item key={name} label={name} value={name} />)}</Picker></View><View style={styles.headerPickerShell}><Picker selectedValue={filters.role} onValueChange={(role) => update({ role: String(role) })} style={styles.headerPicker}><Picker.Item label="All roles" value="" />{roles.map((role) => <Picker.Item key={role} label={role === 'RELATIONSHIP_MANAGER' ? 'Relationship Manager' : 'Sales Coordinator'} value={role} />)}</Picker></View>{hasFilters ? <Pressable onPress={() => onChange(emptyAssignmentFilters())} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}</View><Modal transparent visible={calendarOpen} animationType="fade" onRequestClose={() => setCalendarOpen(false)}><Pressable style={styles.calendarBackdrop} onPress={() => setCalendarOpen(false)}><Pressable style={styles.calendarCard} onPress={(event) => event.stopPropagation()}><Text style={styles.calendarTitle}>ASSIGNED DATE RANGE</Text><View style={styles.calendarActions}><Pressable onPress={() => setDateTarget('from')} style={[styles.calendarAction, dateTarget === 'from' && styles.calendarActionActive]}><Text style={styles.calendarActionText}>From: {filters.from || 'Choose date'}</Text></Pressable><Pressable onPress={() => setDateTarget('to')} style={[styles.calendarAction, dateTarget === 'to' && styles.calendarActionActive]}><Text style={styles.calendarActionText}>To: {filters.to || 'Choose date'}</Text></Pressable></View><InlineCalendar value={filters[dateTarget]} onSelect={(value) => update({ [dateTarget]: value })} /></Pressable></Pressable></Modal></>;
}

function InlineCalendar({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const initial = value ? new Date(`${value}T12:00:00`) : new Date();
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const empty = Array.from({ length: (month.getDay() + 6) % 7 });
  const iso = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <View style={styles.inlineCalendar}><View style={styles.inlineCalendarHeader}><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><Icon source="chevron-left" size={18} color="#3156C8" /></Pressable><Text style={styles.inlineCalendarMonth}>{month.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><Icon source="chevron-right" size={18} color="#3156C8" /></Pressable></View><View style={styles.inlineCalendarGrid}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Text key={`${day}${index}`} style={styles.inlineCalendarWeekday}>{day}</Text>)}{empty.map((_, index) => <View key={`empty-${index}`} style={styles.inlineCalendarDay} />)}{days.map((day) => <Pressable key={day} onPress={() => onSelect(iso(day))} style={[styles.inlineCalendarDay, value === iso(day) && styles.inlineCalendarDaySelected]}><Text style={[styles.inlineCalendarDayText, value === iso(day) && styles.inlineCalendarDayTextSelected]}>{day}</Text></Pressable>)}</View></View>;
}

function NoFilteredResults() { return <View style={styles.emptyFiltered}><Icon source="filter-off-outline" size={28} color="#94A3B8" /><Text style={styles.stateText}>No assignments match these filters.</Text></View>; }

function Info({ label, value }: { label: string; value?: string | null }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{show(value)}</Text></View>; }

function CrmLeadDetailsModal({ lead, onClose }: { lead: LeadResponse | null; onClose: () => void }) {
  if (!lead) return null;
  const assignmentRole = roleCode(lead.assignedEmployeeRole) === 'RELATIONSHIP_MANAGER' ? 'Relationship Manager' : 'Sales Coordinator';
  const detailFields: readonly (readonly [string, string | undefined | null])[] = [['Mobile Number', lead.mobileNumber], ['Location', lead.location], ['Clinic Address', lead.clinicAddress], ['Speciality', lead.speciality], ['Lead Code', lead.leadCode]];
  const assignmentFields: readonly (readonly [string, string | undefined | null])[] = [['Assigned To', lead.assignedEmployeeName], ['Employee Code', lead.assignedEmployeeCode], ['Role', assignmentRole], ['Assigned Date', lead.assignedAt], ['Current Status', lead.leadStatus?.replace(/_/g, ' ')]];
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable nativeID="blueant-workflow-modal" style={styles.modalCard} onPress={(event) => event.stopPropagation()}><View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>CRM ASSIGNED LEAD</Text><Text style={styles.modalTitle}>{show(lead.clientName)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close lead details" onPress={onClose} style={styles.modalClose}><Icon source="close" size={22} color="#3156C8" /></Pressable></View><ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator><DetailSection title="Lead details" fields={detailFields} /><DetailSection title="Assignment details" fields={assignmentFields} /></ScrollView></Pressable></Pressable></Modal>;
}

function DetailSection({ title, fields }: { title: string; fields: readonly (readonly [string, string | undefined | null])[] }) {
  return <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>{title}</Text><View style={styles.detailGrid}>{fields.map(([label, value]) => <View key={label} style={styles.detailCell}><Text style={styles.detailLabel}>{label}</Text><Text numberOfLines={2} style={styles.detailValue}>{show(value)}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.65)' },
  modalCard: { width: '100%', maxWidth: 760, maxHeight: '86%', overflow: 'hidden', borderRadius: 20, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modalEyebrow: { color: '#4F46E5', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { marginTop: 3, color: '#0F172A', fontSize: 19, fontWeight: '900' },
  modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#E2E8F0' },
  modalContent: { gap: 12, padding: 16 },
  detailSection: { gap: 8, padding: 11, borderWidth: 1, borderColor: '#DCE5F3', borderRadius: 12, backgroundColor: '#F7F9FE' },
  detailSectionTitle: { color: '#1E3A8A', fontSize: 12, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailCell: { minWidth: 140, flex: 1, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#E1E8F3', borderRadius: 9, backgroundColor: '#FFFFFF' },
  detailLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { marginTop: 3, color: '#172033', fontSize: 10, fontWeight: '800' },
  page: { flex: 1, minHeight: 0, gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F7F8FA' }, topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 4, borderWidth: 1, borderColor: '#D8E1F0', borderRadius: 12, backgroundColor: '#FFFFFF' }, tabs: { minWidth: 260, flex: 1, flexDirection: 'row', gap: 5, padding: 3, borderRadius: 9, backgroundColor: '#F5F7FC' }, tab: { minHeight: 28, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 7, backgroundColor: '#FFFBEB' }, tabActive: { borderColor: '#D97706', backgroundColor: '#D97706' }, tabIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#FEF3C7' }, tabIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' }, tabText: { color: '#B45309', fontSize: 9, fontWeight: '800' }, tabTextActive: { color: '#FFFFFF', fontWeight: '900' }, darkModeWhiteSource: { color: '#000000' }, syncButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 10, borderWidth: 1, borderColor: '#A7DFD7', borderRadius: 8, backgroundColor: '#ECFDF8' }, syncText: { color: '#3156C8', fontSize: 10, fontWeight: '900' }, panel: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 11, backgroundColor: '#FFFFFF' }, panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderLeftWidth: 4, borderLeftColor: '#38BDF8', backgroundColor: '#22356F' }, panelTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, panelSubtitle: { marginTop: 3, color: '#CBD9FF', fontSize: 9, fontWeight: '500' }, blankPanel: { flex: 1, minHeight: 260, backgroundColor: '#FFFFFF' },
  panelHeadingWithFilters: { paddingVertical: 9 }, clientSectionBar: { position: 'relative', flexDirection: 'row', minHeight: 48, padding: 5, borderBottomWidth: 1, borderBottomColor: '#DCE5FA', backgroundColor: '#F8FAFF' }, clientSectionIndicator: { position: 'absolute', top: 5, bottom: 5, left: 5, borderRadius: 9, backgroundColor: '#4F46E5', shadowColor: '#312E81', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, clientSectionTab: { zIndex: 1, minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, clientSectionText: { color: '#334155', fontSize: 10, fontWeight: '900', textAlign: 'center' }, clientSectionTextActive: { color: '#FFFFFF' }, clientSectionTextDark: { color: '#000000' }, headerFilters: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }, headerSearch: { width: 210, minHeight: 38, paddingHorizontal: 11, borderWidth: 1, borderColor: '#7692CE', borderRadius: 8, color: '#FFFFFF', fontSize: 10, fontWeight: '700', backgroundColor: '#40568D' }, headerDatePicker: { width: 190, minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FFFFFF' }, headerDateText: { flex: 1, color: '#28447F', fontSize: 10, fontWeight: '900' }, headerPickerShell: { width: 165, height: 38, overflow: 'hidden', borderRadius: 8, backgroundColor: '#FFFFFF' }, headerPicker: { height: 38, color: '#28447F', fontSize: 10, fontWeight: '800' }, calendarBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.5)' }, calendarCard: { width: '100%', maxWidth: 380, gap: 13, padding: 18, borderRadius: 14, backgroundColor: '#FFFFFF' }, calendarTitle: { color: '#1E3A8A', fontSize: 12, fontWeight: '900' }, calendarActions: { flexDirection: 'row', gap: 8 }, calendarAction: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, backgroundColor: '#F8FAFC' }, calendarActionActive: { borderColor: '#3156C8', backgroundColor: '#E8EEFF' }, calendarActionText: { color: '#28447F', fontSize: 9, fontWeight: '800' },
  inlineCalendar: { gap: 8 }, inlineCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }, inlineCalendarMonth: { color: '#1E3A8A', fontSize: 12, fontWeight: '900' }, inlineCalendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, inlineCalendarWeekday: { width: '14.285%', paddingVertical: 5, color: '#64748B', fontSize: 9, fontWeight: '900', textAlign: 'center' }, inlineCalendarDay: { width: '14.285%', height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, inlineCalendarDaySelected: { backgroundColor: '#3156C8' }, inlineCalendarDayText: { color: '#334155', fontSize: 10, fontWeight: '800' }, inlineCalendarDayTextSelected: { color: '#FFFFFF' }, dateField: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' }, dateFieldText: { flex: 1, color: '#172033', fontSize: 11, fontWeight: '700' }, dateFieldPlaceholder: { color: '#A1A9B7' }, datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dateClearText: { color: '#B91C1C', fontSize: 10, fontWeight: '900' }, wheelPicker: { gap: 8 }, wheelPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, backgroundColor: '#F8FAFC' }, wheelPreviewText: { color: '#1E293B', fontSize: 12, fontWeight: '900' }, wheelHint: { color: '#94A3B8', fontSize: 9, fontWeight: '700', textAlign: 'center' }, wheelColumns: { flexDirection: 'row', gap: 7, padding: 4, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 11, backgroundColor: '#F8FAFC' }, wheelColumn: { flex: 1, overflow: 'hidden', borderRadius: 8, backgroundColor: '#FFFFFF' }, wheelLabel: { paddingTop: 6, paddingBottom: 4, color: '#94A3B8', fontSize: 8, fontWeight: '900', letterSpacing: .7, textAlign: 'center', backgroundColor: '#FFFFFF' }, wheelScroll: { height: 126 }, wheelList: { paddingVertical: 3 }, wheelOption: { minHeight: 25, alignItems: 'center', justifyContent: 'center', marginHorizontal: 3, marginVertical: 1, borderRadius: 5 }, wheelOptionSelected: { backgroundColor: '#E9EDF3', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D5DAE2' }, wheelOptionText: { color: '#A0A8B5', fontSize: 10, fontWeight: '700' }, wheelOptionTextSelected: { color: '#172033', fontSize: 11, fontWeight: '900' }, wheelDoneButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, backgroundColor: '#1E293B' }, wheelDoneText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  formWrap: { padding: 22, paddingBottom: 36 }, documentFormWrap: { paddingTop: 16, paddingBottom: 22 }, formIntro: { flexDirection: 'row', alignItems: 'center', gap: 11, maxWidth: 980, alignSelf: 'center', width: '100%', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E7EAF0' }, documentFormIntro: { gap: 9, paddingBottom: 10 }, formIntroIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E8EFFF' }, documentFormIntroIcon: { width: 42, height: 42, borderRadius: 11 }, formIntroTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '900' }, documentFormIntroTitle: { fontSize: 15 }, formIntroText: { marginTop: 4, color: '#718096', fontSize: 11, fontWeight: '600' }, documentFormIntroText: { marginTop: 2, fontSize: 10 }, divider: { display: 'none' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, maxWidth: 980, alignSelf: 'center', width: '100%', marginTop: 14 }, field: { flexBasis: 220, flexGrow: 0, flexShrink: 1 }, actionField: { flexBasis: 220, flexGrow: 0, flexShrink: 1, gap: 8, justifyContent: 'flex-end' }, assignmentActionField: { flexBasis: 456, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, assignmentActionControl: { width: 224 }, assignmentActionButton: { width: 224 }, assignmentCompletionHint: { width: '100%', marginTop: 0 }, label: { marginBottom: 6, color: '#475569', fontSize: 10, fontWeight: '900' }, input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, color: '#172033', fontSize: 11, fontWeight: '700', backgroundColor: '#FFFFFF' }, selectShell: { overflow: 'hidden', minHeight: 44, borderWidth: 1, borderColor: '#D9DFE9', borderRadius: 9, backgroundColor: '#FFFFFF' }, select: { minHeight: 44, color: '#172033', fontSize: 11, fontWeight: '700' }, selectedTarget: { marginTop: 6, color: '#047857', fontSize: 9, fontWeight: '800' }, documentUploadGrid: { flexBasis: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, documentUploadCard: { minWidth: 250, flexBasis: '49.4%', flexGrow: 0, paddingHorizontal: 10, paddingVertical: 9, gap: 3, borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 10, backgroundColor: '#FFFFFF' }, documentUploadCardComplete: { borderWidth: 1.5, borderColor: '#86EFAC', backgroundColor: '#F0FDF4', shadowColor: '#16A34A', shadowOpacity: .06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, documentUploadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, documentTypeIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' }, documentUploadCopy: { flex: 1, minWidth: 0 }, documentUploadLabel: { color: '#1E293B', fontSize: 10, fontWeight: '900' }, documentUploadStatus: { marginTop: 1, color: '#7B879A', fontSize: 8, fontWeight: '700' }, documentUploadButton: { minWidth: 76, minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: '#B8C7F4', borderRadius: 6, backgroundColor: '#F5F7FF' }, documentUploadButtonText: { color: '#3156C8', fontSize: 9, fontWeight: '900' }, documentUploadedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, documentStatusPill: { minHeight: 23, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, borderRadius: 99, backgroundColor: '#DCFCE7' }, documentStatusPillText: { color: '#047857', fontSize: 8, fontWeight: '900' }, documentUploadActions: { flexDirection: 'row', alignItems: 'center', gap: 5 }, documentReplaceAction: { minHeight:25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 7, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 7, backgroundColor: '#FFFFFF' }, documentUploadedText: { marginLeft: 37, color: '#047857', fontSize: 8, fontWeight: '800' }, documentReplaceText: { color: '#2563EB', fontSize: 8, fontWeight: '900' }, documentCancelAction: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 8, backgroundColor: '#FEE2E2', shadowColor: '#DC2626', shadowOpacity: .14, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, documentUploadError: { color: '#B91C1C', fontSize: 8, fontWeight: '700' }, validateButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#A5B4FC', borderRadius: 8, backgroundColor: '#EEF2FF' }, validateButtonText: { color: '#3156C8', fontSize: 10, fontWeight: '900' }, assignButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, backgroundColor: '#4F46E5' }, darkDisabledButton: { backgroundColor: '#4F46E5' }, assignButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, completionHint: { flexBasis: '100%', marginTop: 2, color: '#B45309', fontSize: 8, fontWeight: '800' }, feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 980, alignSelf: 'center', width: '100%', marginTop: 14, padding: 11, borderRadius: 9 }, feedbackSuccess: { backgroundColor: '#ECFDF5' }, feedbackError: { backgroundColor: '#FEF2F2' }, feedbackText: { flex: 1, color: '#15803D', fontSize: 11, fontWeight: '700' }, feedbackErrorText: { color: '#B91C1C' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 280, padding: 25 }, stateTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '900' }, stateText: { maxWidth: 400, color: '#64748B', fontSize: 12, fontWeight: '600', textAlign: 'center' }, cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingBottom: 28 }, card: { minWidth: 280, flexBasis: '31.9%', flexGrow: 0, flexShrink: 1, padding: 11, borderWidth: 1, borderTopWidth: 2, borderTopColor: '#D97706', borderLeftWidth: 4, borderLeftColor: '#D97706', borderColor: '#DCE3ED', borderRadius: 12, backgroundColor: '#FFFFFF' }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }, cardCopy: { minWidth: 0, flex: 1 }, cardName: { color: theme.colors.text, fontSize: 13, fontWeight: '900' }, cardMobile: { marginTop: 3, color: '#71809A', fontSize: 9, fontWeight: '700' }, rolePill: { maxWidth: '48%', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: '#FFF7E8' }, rolePillText: { color: '#A95A08', fontSize: 8, fontWeight: '900' }, cardDivider: { height: 1, marginVertical: 10, backgroundColor: '#E8EDF4' }, cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, info: { minWidth: 88, flexGrow: 1 }, infoLabel: { color: '#64748B', fontSize: 8, fontWeight: '900' }, infoValue: { marginTop: 3, color: '#42536F', fontSize: 9, fontWeight: '800' },
  filterBar: { width: '100%', gap: 8, padding: 10, borderWidth: 1, borderColor: '#D8E3FB', borderRadius: 10, backgroundColor: '#F6F8FF' }, filterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, filterSummary: { color: '#28447F', fontSize: 10, fontWeight: '900' }, clearFilters: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, backgroundColor: '#FEE2E2' }, clearFiltersText: { color: '#B91C1C', fontSize: 9, fontWeight: '900' }, filterControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filterSearch: { minWidth: 190, flexGrow: 1, minHeight: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, color: '#172033', fontSize: 10, fontWeight: '700', backgroundColor: '#FFFFFF' }, filterSelect: { minWidth: 155, height: 38, overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, backgroundColor: '#FFFFFF' }, filterPicker: { height: 38, color: '#172033', fontSize: 10, fontWeight: '700' }, filterDate: { minWidth: 130, flexGrow: 1, minHeight: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, color: '#172033', fontSize: 10, fontWeight: '700', backgroundColor: '#FFFFFF' }, emptyFiltered: { width: '100%', minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82 },
});
