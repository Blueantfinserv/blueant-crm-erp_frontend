import type { ClientBusinessType,MeetingColumnFilter,Tab,VerificationForm } from './coordinatorTypes';

export const VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX = 'blueant.pc.verifiedClientMeetings';

export const VERIFIED_CLIENT_MEETINGS_GLOBAL_KEY = `${VERIFIED_CLIENT_MEETINGS_STORAGE_PREFIX}.all`;

export const PAGE_SIZE = 100;

export const POPUP_STACK_WIDTH = 760;

export const POPUP_MIN_HEIGHT_FOR_NO_SCROLL = 650;

export const TABS: readonly { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today Meetings', icon: 'calendar-check-outline' },
  { key: 'responses', label: 'Verified Meetings', icon: 'clipboard-check-outline' },
  { key: 'tasks', label: 'Sales Person Tasks', icon: 'account-group-outline' },
  { key: 'assign', label: 'Assign New Lead', icon: 'account-plus-outline' },
  { key: 'assignedLeads', label: 'Assigned Leads', icon: 'account-arrow-right-outline' },
];

export const POSITION_OPTIONS = ['Team leader', 'Admin', 'Super Admin', 'Sales Manager', 'RM'];

export const CLIENT_POSITION_OPTIONS = ['SUPER ADMIN', 'ADMIN', 'TL', 'SM', 'RM'] as const;

export const FIELDS: readonly { key: keyof VerificationForm; label: string; placeholder: string }[] = [
  { key: 'meetingDate', label: 'Meeting Date', placeholder: 'Select date' },
  { key: 'meetingTiming', label: 'Meeting Time', placeholder: 'HH:mm:ss' },
  { key: 'ageGroup', label: 'Age Group', placeholder: 'Backend code, e.g. AGE_25_35' },
  { key: 'existingSip', label: 'Any Prior Investment', placeholder: 'Backend value, e.g. YES' },
  { key: 'profession', label: 'Profession', placeholder: 'Backend code, e.g. DOCTOR' },
  { key: 'bestTimeForMeeting', label: 'Best Time for Meeting', placeholder: 'Backend code, e.g. EVENING' },
  { key: 'professionDetail', label: 'Clinic / Company / Firm Name', placeholder: 'Profession details' },
  { key: 'meetingWith', label: 'Meeting With', placeholder: 'Backend code, e.g. SOMEONE_ELSE' },
  { key: 'personName', label: 'Person / Joined Person Name', placeholder: 'Person name' },
  { key: 'position', label: 'Position', placeholder: 'Position' },
];

export const NOT_CONDUCTED_FIELDS = FIELDS.filter((field) => field.key === 'meetingTiming' || field.key === 'meetingDate');

export const HOURS = Array.from({ length: 14 }, (_, index) => String(index + 9).padStart(2, '0'));

export const PRIOR_INVESTMENT_OPTIONS = ['YES', 'NO'] as const;

export const BEST_TIME_OPTIONS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;

export const MEETING_WITH_OPTIONS = ['SELF', 'SOMEONE_ELSE'] as const;

export const CLIENT_BUSINESS_TYPES: readonly { type: ClientBusinessType; label: string; requiresAmount: boolean; icon: string }[] = [
  { type: 'SIP', label: 'SIP', requiresAmount: true, icon: 'chart-line' },
  { type: 'LUMP_SUM', label: 'Lumpsum', requiresAmount: true, icon: 'cash-multiple' },
  { type: 'INSURANCE', label: 'Insurance', requiresAmount: true, icon: 'shield-check-outline' },
  { type: 'SHARES', label: 'Shares', requiresAmount: true, icon: 'chart-areaspline' },
  { type: 'LOAN', label: 'Loan', requiresAmount: true, icon: 'bank-outline' },
  { type: 'SERVICE_REQUEST', label: 'Service Request', requiresAmount: false, icon: 'account-wrench-outline' },
  { type: 'BROKER_CHANGE', label: 'Broker Change', requiresAmount: false, icon: 'swap-horizontal' },
];

export const clientBusinessDefinition = (type: ClientBusinessType) => CLIENT_BUSINESS_TYPES.find((item) => item.type === type)!;

export const EXCLUDED_TASK_LEAD_STATUSES = new Set(['ALREADY_CLIENT', 'CONVERTED', 'CONVERTED_CLIENT', 'CLIENT_REMOVED', 'CLIENT_NOT_INTERESTED', 'REMOVED', 'NOT_INTERESTED']);

export const AGE_GROUP_LABELS: Record<string, string> = {
  BELOW_25: 'Below 25', AGE_25_35: '25–35', AGE_36_45: '36–45',
  AGE_46_55: '46–55', AGE_56_65: '56–65', ABOVE_65: '65+',
};

export const AGE_GROUP_OPTIONS = Object.keys(AGE_GROUP_LABELS);

export const PROFESSION_LABELS: Record<string, string> = {
  SALARIED_EMPLOYEE: 'Salaried Employee', BUSINESS_OWNER: 'Business Owner', SELF_EMPLOYED: 'Self Employed', DOCTOR: 'Doctor',
  LAWYER_ADVOCATE: 'Lawyer / Advocate', CHARTERED_ACCOUNTANT: 'Chartered Accountant (CA)', COMPANY_SECRETARY: 'Company Secretary (CS)',
  ENGINEER: 'Engineer', ARCHITECT: 'Architect', CONSULTANT: 'Consultant', TEACHER_PROFESSOR: 'Teacher / Professor',
  GOVERNMENT_EMPLOYEE: 'Government Employee', BANKING_FINANCE_PROFESSIONAL: 'Banking / Finance Professional',
  IT_SOFTWARE_PROFESSIONAL: 'IT / Software Professional', HEALTHCARE_PROFESSIONAL: 'Healthcare Professional',
  SALES_MARKETING_PROFESSIONAL: 'Sales / Marketing Professional', REAL_ESTATE_PROFESSIONAL: 'Real Estate Professional',
  TRADER_INVESTOR: 'Trader / Investor', RETIRED: 'Retired', STUDENT: 'Student', HOMEMAKER: 'Homemaker', OTHER: 'Other', NOT_DISCLOSED: 'Not Disclosed',
};

export const PROFESSION_OPTIONS = Object.keys(PROFESSION_LABELS);

export const SALES_PERSONS = [
  { code: 'RK1507', name: 'Rakesh Kumar' }, { code: 'AS0108', name: 'Abhijeet Singh' }, { code: 'AK0107', name: 'Atul Kumar' },
  { code: 'RG1108', name: 'Rajat Gupta' }, { code: 'HP0605', name: 'Harsh Pilania' }, { code: 'AKS0108', name: 'Amit Kumar Singh' },
  { code: 'SM2403', name: 'Sunny Mathur' }, { code: 'GK0902', name: 'Garv Kumar' }, { code: 'AS1909', name: 'Abhishek Singh' },
  { code: 'US2601', name: 'Umakant Sharma' },
] as const;

export const SALES_PERSON_CODES = SALES_PERSONS.map((employee) => employee.code);

export const COORDINATOR_SALES_TEAM: Readonly<Record<string, readonly string[]>> = {
  'Aarti Kumari': ['Rakesh Kumar', 'Atul Kumar', 'Rajat Gupta'],
  'Samridhi Saini': ['Gary Kumar', 'Garv Kumar', 'Umakant Sharma', 'Abhishek Singh', 'Sunny Mathur'],
};

export const FILTER_COLUMNS: { key: keyof MeetingColumnFilter; label: string }[] = [
  { key: 'clientName', label: 'CLIENT NAME' }, { key: 'meetingTitle', label: 'MEETING TYPE' }, { key: 'employeeName', label: 'ASSIGNED TO' }, { key: 'employeeRole', label: 'ROLE' },
  { key: 'leadStatus', label: 'LEAD STATUS' }, { key: 'meetingDate', label: 'MEETING DATE' }, { key: 'nextMeetingDate', label: 'NEXT PLAN DATE' }, { key: 'aloneWith', label: 'JOINED' },
  { key: 'meetingConducted', label: 'CONDUCTED' },
];
