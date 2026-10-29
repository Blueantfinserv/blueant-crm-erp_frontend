import type { TaskTypeFilter } from './mock/taskFilterOptions';

const parseBackendCalendarDate = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const formatDate = (dateValue?: string) => {
  if (!dateValue) return 'Not scheduled';
  const date = parseBackendCalendarDate(dateValue);
  if (!date) return dateValue;
  return `${date.day} ${MONTH_LABELS[date.month - 1]}`;
};

export const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return 'Not available';
  const date = parseBackendCalendarDate(timestamp);
  if (!date) return timestamp;
  return `${date.day} ${MONTH_LABELS[date.month - 1]}`;
};

export const todayCalendarDate = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

export const calendarDateOffset = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

export const calendarDateFromValue = (value?: string) => String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';

export const assignedOnToday = (assignedAt?: string) => (
  String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] === todayCalendarDate()
);

const assignedInFutureThreeDays = (assignedAt?: string) => {
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  const today = todayCalendarDate();
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + 3);
  const endDate = [end.getFullYear(), String(end.getMonth() + 1).padStart(2, '0'), String(end.getDate()).padStart(2, '0')].join('-');
  return Boolean(date) && date > today && date <= endDate;
};

export const matchesAssignmentTaskFilter = (assignedAt: string | undefined, filter: TaskTypeFilter) => {
  if (filter === 'All Tasks') return true;
  if (filter === 'Today') return assignedOnToday(assignedAt);
  if (filter === 'Future 3 Days') return assignedInFutureThreeDays(assignedAt);
  const date = String(assignedAt ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  return !date || date < todayCalendarDate();
};
