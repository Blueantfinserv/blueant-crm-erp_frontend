import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import type { DashboardDateFilterDisplayState } from '../../screens/dashboard/dashboardTypes';

type Props = {
  period: string;
  dateFilter: DashboardDateFilterDisplayState;
  onPeriodChange: (value: string) => void;
  onOpenDatePicker: (field: 'from' | 'to') => void;
  onApply: () => void;
};

export function FilterBar({ period, dateFilter, onPeriodChange, onOpenDatePicker, onApply }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pills}>
        <Pressable onPress={() => onPeriodChange('Past Week')} style={[styles.pill, styles.pillActive]}>
          <Text style={[styles.pillText, styles.pillTextActive]}>Past Week</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.24)',
  },
  pillText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: theme.colors.primary,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  inputButton: {
    minWidth: 132,
    maxWidth: 142,
    flexGrow: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputTextBlock: {
    flex: 1,
    gap: 1,
  },
  inputLabel: {
    color: theme.colors.subtle,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inputPlaceholder: {
    color: theme.colors.subtle,
    fontWeight: '600',
  },
  inputIcon: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  apply: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
  },
  applyPressed: {
    opacity: 0.92,
  },
  applyDisabled: {
    opacity: 0.45,
  },
  applyText: {
    color: theme.colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
});
