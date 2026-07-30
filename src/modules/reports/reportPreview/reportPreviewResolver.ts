import { DateRange, ReportPreviewData } from './types';
import { monthReport } from '../mock/monthReport';
import { sixMonthReport } from '../mock/sixMonthReport';
import { yearReport } from '../mock/yearReport';

const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveReportPreviewData(period: string, range: DateRange): ReportPreviewData {
  const normalized = period.trim().toLowerCase();

  if (normalized === 'this month') {
    return monthReport;
  }

  if (normalized === 'past 6 months' || normalized === 'last 6 months') {
    return sixMonthReport;
  }

  if (normalized === 'past 3 months') {
    return sixMonthReport;
  }

  const durationDays = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1);

  if (durationDays <= 45) {
    return monthReport;
  }

  if (durationDays <= 210) {
    return sixMonthReport;
  }

  return yearReport;
}
