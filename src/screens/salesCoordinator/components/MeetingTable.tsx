import { useState } from 'react';
import { Modal,Pressable,ScrollView,Text,useWindowDimensions,View } from 'react-native';
import { Icon } from 'react-native-paper';
import type { MeetingResponse } from '../../../types/meeting';
import { styles } from '../../salesCoordinatorStyles';
import { FILTER_COLUMNS } from '../coordinatorConstants';
import type { MeetingColumnFilter } from '../coordinatorTypes';
import { maskedMobile,meetingRole,show } from '../coordinatorUtils';
import { InlineCalendar } from './CoordinatorCalendars';
import { State } from './CoordinatorControls';

export function MeetingTableHeader({ verified = false, taskOnly = false, hideMeetingDate = false, records, filters, onFiltersChange }: { verified?: boolean; taskOnly?: boolean; hideMeetingDate?: boolean; records: readonly MeetingResponse[]; filters: MeetingColumnFilter; onFiltersChange: React.Dispatch<React.SetStateAction<MeetingColumnFilter>> }) {
  const [openFilter, setOpenFilter] = useState<keyof MeetingColumnFilter | null>(null);
  const [draftChoices, setDraftChoices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [dateTarget, setDateTarget] = useState<'from' | 'to' | null>(null);
  const columns = (taskOnly ? FILTER_COLUMNS.filter((column) => ['clientName', 'meetingTitle', 'employeeName', 'employeeRole', 'meetingDate'].includes(column.key)) : verified ? [...FILTER_COLUMNS, { key: 'verifiedBy' as const, label: 'VERIFIED BY' }] : FILTER_COLUMNS).filter((column) => !hideMeetingDate || column.key !== 'meetingDate');
    const dropdownKeys: (keyof MeetingColumnFilter)[] = taskOnly ? ['employeeName', 'employeeRole'] : verified
    ? ['employeeName', 'employeeRole', 'verifiedBy', 'meetingTitle', 'leadStatus', 'meetingConducted', 'meetingDate']
    : ['employeeName', 'employeeRole', 'meetingTitle', 'leadStatus', 'meetingConducted'];
  const optionsFor = (key: keyof MeetingColumnFilter) => {
    const values = [...new Set(records.map((record) => String(key === 'meetingTitle' ? record.meetingTitle ?? record.meetingType ?? '' : key === 'employeeRole' ? meetingRole(record) : record[key as keyof MeetingResponse] ?? '')).filter(Boolean))].sort();
    if (key !== 'employeeName') return values;
    return values.filter((name) => !values.some((other) => other !== name && other.toLowerCase().startsWith(`${name.toLowerCase()} `)));
  };
  const openChoices = (key: keyof MeetingColumnFilter) => {
    if (key === 'meetingDate' && verified) { const [from = '', to = ''] = (filters[key] ?? '').replace('range:', '').split(','); setDateRange({ from, to }); }
    else setDraftChoices((filters[key] ?? '').split('|').filter(Boolean));
    setOpenFilter(key);
  };
  const dateFilterOpen = openFilter === 'meetingDate' && verified;
  return <>
    <View style={[styles.listHeader, styles.verifiedListHeader, styles.desktopRow]}>
      {columns.map((column, index) => <View key={column.key} style={[styles.headerColumn, styles.fluidColumn, index === 0 && styles.clientColumn, column.key === 'leadStatus' && styles.leadStatusColumn, verified && column.key === 'meetingConducted' && styles.verifiedConductedColumn]}>
        {dropdownKeys.includes(column.key)
          ? <View style={styles.headerFilterWrap}><Pressable onPress={() => openChoices(column.key)} style={styles.headerFilterButton}><Text numberOfLines={1} style={[styles.headerFilterText, filters[column.key] && styles.columnLabelFiltered]}>{column.label}</Text><View style={[styles.headerFilterIcon, filters[column.key] && styles.headerFilterIconActive]}><Icon source="filter-variant" size={10} color={filters[column.key] ? '#FFFFFF' : '#536B9F'} /></View></Pressable></View>
          : <Text numberOfLines={1} style={styles.columnLabel}>{column.label}</Text>}
      </View>)}
      {taskOnly && (filters.employeeName || filters.employeeRole) ? <Pressable accessibilityLabel="Clear assignment filters" onPress={() => onFiltersChange((current) => ({ ...current, employeeName: '', employeeRole: '' }))} style={styles.taskFilterClear}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}
      {!taskOnly ? <Pressable onPress={() => onFiltersChange({})} style={[styles.clearFilters, verified && styles.verifiedActionColumn]}><Text style={styles.clearFiltersText}>Clear</Text></Pressable> : null}
    </View>
    {openFilter ? <Modal transparent visible animationType="fade" onRequestClose={() => setOpenFilter(null)}><Pressable style={styles.filterBackdrop} onPress={() => setOpenFilter(null)}><Pressable style={styles.filterPopover} onPress={() => undefined}>
      <View style={styles.filterPopoverTitle}><View><Text style={styles.filterPopoverTitleText}>{dateFilterOpen ? 'MEETING DATE RANGE' : columns.find((column) => column.key === openFilter)?.label}</Text><Text style={styles.filterPopoverHint}>{dateFilterOpen ? 'Choose a start and end date' : 'Select one or more values'}</Text></View><Pressable onPress={() => setOpenFilter(null)}><Icon source="close" size={18} color="#64748B" /></Pressable></View>
      {dateFilterOpen
        ? <View style={styles.dateRangeFields}>{(['from', 'to'] as const).map((target) => <View key={target}><Text style={styles.dateRangeLabel}>{target === 'from' ? 'From date' : 'To date'}</Text><Pressable onPress={() => setDateTarget(target)} style={styles.datePickerButton}><Icon source="calendar-outline" size={16} color="#3156C8" /><Text style={styles.datePickerText}>{dateRange[target] || 'Choose date'}</Text></Pressable></View>)}{dateTarget ? <InlineCalendar value={dateRange[dateTarget]} onSelect={(value) => { setDateRange((current) => ({ ...current, [dateTarget]: value })); setDateTarget(null); }} /> : null}</View>
        : <ScrollView style={styles.filterChoices}>{optionsFor(openFilter).map((option) => { const checked = draftChoices.includes(option); return <Pressable key={option} onPress={() => setDraftChoices((items) => checked ? items.filter((item) => item !== option) : [...items, option])} style={[styles.filterChoice, checked && styles.filterChoiceSelected]}><View style={[styles.filterCheckbox, checked && styles.filterCheckboxSelected]}>{checked ? <Icon source="check" size={13} color="#FFFFFF" /> : null}</View><Text style={[styles.filterChoiceText, checked && styles.filterChoiceTextSelected]}>{option.replace(/_/g, ' ')}</Text></Pressable>; })}</ScrollView>}
      <View style={styles.filterActions}>
        <Pressable onPress={() => dateFilterOpen ? setDateRange({ from: '', to: '' }) : setDraftChoices([])} style={styles.filterReset}><Text style={styles.filterResetText}>Clear</Text></Pressable>
        <Pressable onPress={() => { onFiltersChange((current) => ({ ...current, [openFilter]: dateFilterOpen ? (dateRange.from || dateRange.to ? `range:${dateRange.from},${dateRange.to}` : '') : draftChoices.join('|') })); setOpenFilter(null); }} style={styles.filterApply}><Text style={styles.filterApplyText}>Apply</Text></Pressable>
      </View>
    </Pressable></Pressable></Modal> : null}
  </>;
}

export function Cards({ items, empty, action, onOpen, verified = false, taskOnly = false, hideMeetingDate = false }: { items: readonly MeetingResponse[]; empty: string; action?: string; onOpen?: (m: MeetingResponse) => void; verified?: boolean; taskOnly?: boolean; hideMeetingDate?: boolean }) {
  const compact = useWindowDimensions().width < 760;
  if (!items.length) return <State message={empty} />;
  if (compact) return <View style={styles.list}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.mobileRow, i % 2 === 1 && styles.listRowAlternate]}><View style={styles.personCell}><View style={styles.cellCopy}><Text style={styles.client}>{show(m.clientName)}</Text><Text style={styles.code}>{show(maskedMobile(m.mobileNumber))}</Text></View></View><View style={styles.mobileMeeting}><Text style={styles.cellMain}>{show(m.meetingTitle ?? m.meetingType)}</Text><Text style={styles.cellSub}>{show(m.meetingDate)} · {show(m.nextMeetingDate)}{verified ? ` · Verified by ${show(m.verifiedBy)}` : ''}</Text></View>{onOpen ? <Pressable onPress={() => onOpen(m)} style={styles.mobileAction}><Icon source="chevron-right" size={16} color="#3156C8" /></Pressable> : null}</View>)}</View>;
  const columns = (taskOnly ? [
    ['MEETING TYPE', (m: MeetingResponse) => m.meetingTitle ?? m.meetingType],
    ['ASSIGNED TO', (m: MeetingResponse) => m.employeeName],
    ['ROLE', (m: MeetingResponse) => meetingRole(m)],
    ['MEETING DATE', (m: MeetingResponse) => m.meetingDate],
  ] : [
    ['MEETING TYPE', (m: MeetingResponse) => m.meetingTitle ?? m.meetingType],
    ['ASSIGNED TO', (m: MeetingResponse) => m.employeeName],
    ['ROLE', (m: MeetingResponse) => meetingRole(m)],
    ['LEAD STATUS', (m: MeetingResponse) => m.leadStatus],
    ['MEETING DATE', (m: MeetingResponse) => m.meetingDate],
    ['NEXT PLAN DATE', (m: MeetingResponse) => m.nextMeetingDate],
    ['JOINED', (m: MeetingResponse) => m.aloneWith],
    ['CONDUCTED', (m: MeetingResponse) => m.meetingConducted],
    ...(verified ? [['VERIFIED BY', (m: MeetingResponse) => m.verifiedBy] as const] : []),
  ]).filter(([label]) => !hideMeetingDate || label !== 'MEETING DATE') as unknown as readonly [string, (m: MeetingResponse) => unknown][];
  return <View style={styles.desktopTable}>{items.map((m, i) => <View key={m.meetingCode ?? m.id ?? i} style={[styles.listRow, styles.desktopRow, i % 2 === 1 && styles.listRowAlternate]}>
     <View style={[styles.personCell, styles.fluidColumn, styles.clientColumn]}><View style={styles.cellCopy}><Text numberOfLines={1} style={styles.client}>{show(m.clientName)}</Text></View></View>
    {columns.map(([label, value]) => <View key={label} style={[styles.cell, styles.fluidColumn, label === 'LEAD STATUS' && styles.leadStatusColumn, verified && label === 'CONDUCTED' && styles.verifiedConductedColumn]}><Text numberOfLines={1} style={[styles.cellMain, label === 'LEAD STATUS' && styles.status, label === 'LEAD STATUS' && styles.leadStatusValue, label === 'LEAD STATUS' && m.leadStatus === 'CONVERTED_CLIENT' && styles.statusVerified, label === 'JOINED' && styles.joinedBadge, label === 'CONDUCTED' && styles.conductedBadge, label === 'CONDUCTED' && m.meetingConducted === 'NOT_CONDUCTED' && styles.notConductedBadge, label === 'ROLE' && styles.roleBadge, label === 'ROLE' && meetingRole(m) === 'RM' && styles.roleBadgeRm, label === 'ROLE' && meetingRole(m) === 'SC' && styles.roleBadgeSc]}>{label === 'LEAD STATUS' || label === 'CONDUCTED' ? show(value(m)).replace(/_/g, ' ') : show(value(m))}</Text></View>)}
    {onOpen ? <Pressable onPress={() => onOpen(m)} style={({ pressed }) => [styles.rowAction, styles.desktopActionColumn, verified && styles.verifiedActionColumn, verified && styles.verifiedRowAction, pressed && styles.rowActionPressed]}><Text numberOfLines={1} style={styles.rowActionText}>{action}</Text><Icon source="chevron-right" size={13} color="#3156C8" /></Pressable> : taskOnly ? null : <View style={styles.desktopActionColumn} />}
  </View>)}</View>;
}
