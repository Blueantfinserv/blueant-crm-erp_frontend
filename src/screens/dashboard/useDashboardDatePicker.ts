import { useMemo, useState } from 'react';
import type { DashboardDateFilterDisplayState, DashboardDateFilterState, DashboardDatePickerState } from './dashboardTypes';

function buildMonth(base: Date) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function shiftMonth(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

function formatCalendarLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDisplayDate(date: Date | null) {
  return date ? formatDateLabel(date) : '';
}

export function useDashboardDatePicker() {
  const [dateFilter, setDateFilter] = useState<DashboardDateFilterState>({ from: null, to: null });
  const [datePicker, setDatePicker] = useState<DashboardDatePickerState>({ openField: null, viewedMonth: new Date() });

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  const calendarDays = useMemo(() => buildMonth(datePicker.viewedMonth), [datePicker.viewedMonth]);
  const displayedDateFilter: DashboardDateFilterDisplayState = useMemo(
    () => ({
      from: formatDisplayDate(dateFilter.from),
      to: formatDisplayDate(dateFilter.to),
    }),
    [dateFilter.from, dateFilter.to],
  );

  const openDatePicker = (field: 'from' | 'to') => setDatePicker((current) => ({ ...current, openField: field }));
  const closeDatePicker = () => setDatePicker((current) => ({ ...current, openField: null }));
  const shiftViewedMonth = (delta: number) =>
    setDatePicker((current) => ({
      ...current,
      viewedMonth: shiftMonth(current.viewedMonth, delta),
    }));

  const selectCalendarDay = (day: number | null) => {
    if (!day || !datePicker.openField) return;
    const selectedDate = new Date(datePicker.viewedMonth.getFullYear(), datePicker.viewedMonth.getMonth(), day);
    setDateFilter((current) =>
      datePicker.openField === 'from'
        ? { ...current, from: selectedDate }
        : { ...current, to: selectedDate },
    );
    setDatePicker((current) => {
      if (current.openField === 'from') {
        return { ...current, openField: 'to', viewedMonth: selectedDate };
      }
      return { ...current, openField: null };
    });
  };

  return {
    currentDate,
    calendarDays,
    datePicker,
    displayedDateFilter,
    openDatePicker,
    closeDatePicker,
    shiftViewedMonth,
    selectCalendarDay,
  };
}
