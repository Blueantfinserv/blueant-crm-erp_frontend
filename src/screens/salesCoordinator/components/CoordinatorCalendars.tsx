import { useEffect,useState } from 'react';
import { Modal,Pressable,Text,View } from 'react-native';
import { Icon } from 'react-native-paper';
import { styles,verificationStyles } from '../../salesCoordinatorStyles';
import { calendarDate } from '../coordinatorUtils';

export function InlineCalendar({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const empty = Array.from({ length: (month.getDay() + 6) % 7 });
  const iso = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <View style={styles.inlineCalendar}><View style={styles.calendarHeader}><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><Icon source="chevron-left" size={18} color="#3156C8" /></Pressable><Text style={styles.calendarMonth}>{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><Icon source="chevron-right" size={18} color="#3156C8" /></Pressable></View><View style={styles.calendarGrid}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Text key={`${day}${index}`} style={styles.calendarWeekday}>{day}</Text>)}{empty.map((_, index) => <View key={`empty${index}`} style={styles.calendarDay} />)}{days.map((day) => <Pressable key={day} onPress={() => onSelect(iso(day))} style={[styles.calendarDay, value === iso(day) && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, value === iso(day) && styles.calendarDayTextSelected]}>{day}</Text></Pressable>)}</View></View>;
}

export function CompactAssignmentCalendar({ visible, value, maxDate, onDismiss, onSelect }: { visible: boolean; value: string; maxDate?: string; onDismiss: () => void; onSelect: (value: string) => void }) {
  const selected = value ? new Date(`${value}T12:00:00`) : new Date();
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => { if (visible) { const next = value ? new Date(`${value}T12:00:00`) : new Date(); setCursor(new Date(next.getFullYear(), next.getMonth(), 1)); } }, [value, visible]);
  const firstDay = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + days }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}><View style={styles.dateBackdrop}><View style={styles.datePopover}>
    <View style={styles.datePopoverHeader}>
      <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={styles.dateNav}><Icon source="chevron-left" size={19} color="#3156C8" /></Pressable>
      <Text style={styles.datePopoverTitle}>{cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Text>
      <View style={styles.datePopoverActions}><Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={styles.dateNav}><Icon source="chevron-right" size={19} color="#3156C8" /></Pressable><Pressable accessibilityLabel="Close calendar" onPress={onDismiss} style={styles.dateClose}><Icon source="close" size={17} color="#64748B" /></Pressable></View>
    </View>
    <View style={styles.dateWeekRow}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <Text key={day} style={styles.dateWeekday}>{day}</Text>)}</View>
    <View style={styles.dateGrid}>{cells.map((day, index) => {
      if (day === null) return <View key={`blank-${index}`} style={styles.dateCell} />;
      const date = calendarDate(new Date(cursor.getFullYear(), cursor.getMonth(), day));
      const disabled = Boolean(maxDate && date > maxDate);
      return <Pressable key={day} disabled={disabled} onPress={() => { onSelect(date); onDismiss(); }} style={({ pressed }) => [styles.dateCell, value === date && styles.dateCellSelected, disabled && styles.dateCellDisabled, pressed && !disabled && styles.pressed]}><Text style={[styles.dateCellText, value === date && styles.dateCellTextSelected, disabled && styles.dateCellTextDisabled]}>{day}</Text></Pressable>;
    })}</View>
  </View></View></Modal>;
}

export function DatePickerField({ label, value, placeholder, maxDate, onSelect, style, tone, controlStyle }: { label: string; value: string; placeholder: string; maxDate?: string; onSelect: (value: string) => void; style?: object; tone?: object; controlStyle?: object }) {
  const [visible, setVisible] = useState(false);
  return <View style={[styles.field, tone, style]}><Text style={styles.fieldLabel}>{label}</Text><Pressable onPress={() => setVisible(true)} style={[styles.assignDatePicker, verificationStyles.control, controlStyle]}><Icon source="calendar-month-outline" size={18} color="#3156C8" /><Text style={styles.assignDatePickerText}>{value || placeholder}</Text><Icon source="chevron-down" size={18} color="#64748B" /></Pressable><CompactAssignmentCalendar visible={visible} value={value} maxDate={maxDate} onDismiss={() => setVisible(false)} onSelect={onSelect} /></View>;
}
