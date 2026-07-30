import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthButton } from '../../../components/AuthButton';
import { AuthInput } from '../../../components/AuthInput';
import { theme } from '../../../theme/theme';
import { LeadStatusBadge } from '../details/LeadDetailsComponents';
import { leadInfo, type FollowupItem } from '../details/leadDetailsData';

export type FollowupFormValue = {
  type: string;
  date: string;
  time: string;
  priority: string;
  reminder: string;
  notes: string;
};

export function AddFollowupScreen({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (followup: FollowupItem) => void;
}) {
  const [value, setValue] = useState<FollowupFormValue>({
    type: '',
    date: '',
    time: '',
    priority: 'High',
    reminder: '15 Minutes Before',
    notes: '',
  });
  const [touched, setTouched] = useState<Record<keyof Pick<FollowupFormValue, 'type' | 'date' | 'time'>, boolean>>({
    type: false,
    date: false,
    time: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => onCancel(), 900);
    return () => clearTimeout(timer);
  }, [onCancel, successMessage]);

  const errors = useMemo(() => {
    return {
      type: touched.type && !value.type ? 'Follow-up type is required.' : '',
      date: touched.date && !value.date ? 'Follow-up date is required.' : '',
      time: touched.time && !value.time ? 'Follow-up time is required.' : '',
    };
  }, [touched, value.date, value.time, value.type]);

  const isValid = Boolean(value.type && value.date && value.time);

  const submit = () => {
    setTouched({ type: true, date: true, time: true });
    if (!isValid || saving) {
      return;
    }

    setSaving(true);
    const followup: FollowupItem = {
      date: value.date,
      time: value.time,
      type: value.type,
      assignedTo: leadInfo.assignedSalesManager,
      status: 'Scheduled',
    };

    onSave(followup);
    setSuccessMessage('Follow-up saved successfully.');
    setSaving(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Follow-up</Text>
          <Text style={styles.subtitle}>Schedule the next interaction with this lead.</Text>
        </View>

        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <LeadSummaryCard />
        <FollowupForm
          value={value}
          errors={errors}
          onChange={setValue}
          onTouch={(field) => setTouched((current) => ({ ...current, [field]: true }))}
        />

        <FormActions
          primaryLabel="Save Follow-up"
          secondaryLabel="Cancel"
          onPrimaryPress={submit}
          onSecondaryPress={onCancel}
          loading={saving}
        />
      </View>
    </ScrollView>
  );
}

export function LeadSummaryCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Lead Summary</Text>
      <View style={styles.summaryGrid}>
        <SummaryField label="Lead Name" value={leadInfo.customerName} />
        <SummaryField label="Company" value={leadInfo.company} />
        <SummaryField label="Phone" value={leadInfo.phone} />
        <SummaryField label="Assigned Sales Manager" value={leadInfo.assignedSalesManager} />
        <SummaryField label="Current Lead Status" status={leadInfo.leadStatus} />
      </View>
    </View>
  );
}

export function FollowupForm({
  value,
  errors,
  onChange,
  onTouch,
}: {
  value: FollowupFormValue;
  errors: Record<'type' | 'date' | 'time', string>;
  onChange: (value: FollowupFormValue) => void;
  onTouch: (field: 'type' | 'date' | 'time') => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Follow-up Form</Text>
      <View style={styles.formGrid}>
        <FollowupTypeSelector
          value={value.type}
          error={errors.type}
          onSelect={(type) => {
            onChange({ ...value, type });
            onTouch('type');
          }}
        />
        <DatePickerField
          label="Follow-up Date"
          value={value.date}
          error={errors.date}
          onChangeText={(date) => onChange({ ...value, date })}
          onBlur={() => onTouch('date')}
        />
        <TimePickerField
          label="Follow-up Time"
          value={value.time}
          error={errors.time}
          onChangeText={(time) => onChange({ ...value, time })}
          onBlur={() => onTouch('time')}
        />
        <PrioritySelector value={value.priority} onSelect={(priority) => onChange({ ...value, priority })} />
        <ReminderSelector value={value.reminder} onSelect={(reminder) => onChange({ ...value, reminder })} />
        <NotesField value={value.notes} onChangeText={(notes) => onChange({ ...value, notes })} />
      </View>
    </View>
  );
}

export function FollowupTypeSelector({
  value,
  error,
  onSelect,
}: {
  value: string;
  error?: string;
  onSelect: (value: string) => void;
}) {
  const options = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Site Visit'];
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>Follow-up Type</Text>
      <View style={styles.optionRow}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => onSelect(option)} style={[styles.optionChip, value === option && styles.optionChipActive]}>
            <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function DatePickerField({
  label,
  value,
  error,
  onChangeText,
  onBlur,
}: {
  label: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
}) {
  return <AuthInput label={label} value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder="DD MMM YYYY" error={error} />;
}

export function TimePickerField({
  label,
  value,
  error,
  onChangeText,
  onBlur,
}: {
  label: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
}) {
  return <AuthInput label={label} value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder="HH:MM AM" error={error} />;
}

export function PrioritySelector({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const options = ['High', 'Medium', 'Low'];
  return (
    <SelectorField label="Priority">
      {options.map((option) => (
        <Pressable key={option} onPress={() => onSelect(option)} style={[styles.optionChip, value === option && styles.optionChipActive]}>
          <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option}</Text>
        </Pressable>
      ))}
    </SelectorField>
  );
}

export function ReminderSelector({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const options = ['None', '15 Minutes Before', '30 Minutes Before', '1 Hour Before'];
  return (
    <SelectorField label="Reminder">
      {options.map((option) => (
        <Pressable key={option} onPress={() => onSelect(option)} style={[styles.optionChip, value === option && styles.optionChipActive]}>
          <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option}</Text>
        </Pressable>
      ))}
    </SelectorField>
  );
}

export function NotesField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={[styles.fieldBlock, styles.notesBlock]}>
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Add call objectives, meeting notes or next actions..."
        placeholderTextColor={theme.colors.subtle}
        multiline
        textAlignVertical="top"
        style={styles.notesInput}
      />
    </View>
  );
}

export function FormActions({
  primaryLabel,
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  loading,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.actions}>
      <AuthButton title={secondaryLabel} onPress={onSecondaryPress} variant="secondary" />
      <AuthButton title={primaryLabel} onPress={onPrimaryPress} loading={loading} />
    </View>
  );
}

function SelectorField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>{children}</View>
    </View>
  );
}

function SummaryField({ label, value, status }: { label: string; value?: string; status?: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost' }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {status ? <LeadStatusBadge status={status} /> : <Text style={styles.summaryValue}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  shell: {
    gap: 20,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  header: {
    gap: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  successBox: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 16,
    ...theme.shadow.card,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: 200,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    padding: 14,
    gap: 6,
  },
  summaryLabel: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  formGrid: {
    gap: 16,
  },
  fieldBlock: {
    gap: 10,
  },
  label: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionChipActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.24)',
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextActive: {
    color: theme.colors.primary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  notesBlock: {
    marginTop: 2,
  },
  notesInput: {
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-end',
  },
});
