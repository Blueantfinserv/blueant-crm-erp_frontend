import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import {
  TaskStageFilter,
  TaskTypeFilter,
  taskStageOptions,
  taskTypeOptions,
} from './mock/taskFilterOptions';
import { salesTasksData } from './mock/salesTasksData';
import { SalesTaskCard } from './components/SalesTaskCard';
import type { SalesTask } from './types/tasks';

type DropdownProps<T extends string> = {
  value: T;
  options: readonly T[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
};

function FilterDropdown<T extends string>({
  value,
  options,
  open,
  onToggle,
  onSelect,
  accessibilityLabel,
}: DropdownProps<T>) {
  return (
    <View style={styles.dropdownRoot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.dropdownButton, open && styles.dropdownButtonOpen, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.dropdownValue}>{value}</Text>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={19} color={theme.colors.muted} />
      </Pressable>

      {open ? (
        <ScrollView
          style={styles.dropdownMenu}
          contentContainerStyle={styles.dropdownMenuContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{option}</Text>
                {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

type Props = {
  onCreateNewLead?: () => void;
  onUpdateMeeting?: (lead: SalesTask) => void;
};

export function SalesManagerTasksScreen({ onCreateNewLead, onUpdateMeeting }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const [search, setSearch] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeFilter>('All Tasks');
  const [taskStage, setTaskStage] = useState<TaskStageFilter>('All Stages');
  const [openDropdown, setOpenDropdown] = useState<'task' | 'stage' | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const cardWidth: `${number}%` = width >= 1200 ? '31%' : width >= 700 ? '48%' : '100%';
  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedPhoneSearch = search.replace(/\D/g, '');

    return salesTasksData.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.name.toLowerCase().includes(normalizedSearch) ||
        (normalizedPhoneSearch.length > 0 && task.phone.replace(/\D/g, '').includes(normalizedPhoneSearch));
      const matchesTaskType = taskType === 'All Tasks' || task.schedule === taskType;
      const matchesStage = taskStage === 'All Stages' || task.meetingStage === taskStage;

      return matchesSearch && matchesTaskType && matchesStage;
    });
  }, [search, taskStage, taskType]);

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.headerCard}>
            <View style={styles.heading}>
              <View style={styles.headingCopy}>
                <Text style={styles.title}>Your Tasks</Text>
              </View>
              <View style={styles.headingActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create new lead"
                  onPress={onCreateNewLead}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryActionText}>New Lead</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create service request"
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryActionText}>Service Request</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.filters, isMobile && styles.mobileFilters]}>
              <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused, isMobile && styles.mobileSearch]}>
                <View style={styles.searchIcon}>
                  <Icon source="magnify" size={18} color={theme.colors.primary} />
                </View>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search by name or mobile number"
                  placeholderTextColor={theme.colors.subtle}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {search ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}>
                    <Icon source="close-circle" size={18} color={theme.colors.subtle} />
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.dropdowns, isMobile && styles.mobileDropdowns]}>
                <FilterDropdown
                  value={taskType}
                  options={taskTypeOptions}
                  open={openDropdown === 'task'}
                  onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                  onSelect={(value) => {
                    setTaskType(value);
                    setOpenDropdown(null);
                  }}
                  accessibilityLabel="Filter by task type"
                />
                <FilterDropdown
                  value={taskStage}
                  options={taskStageOptions}
                  open={openDropdown === 'stage'}
                  onToggle={() => setOpenDropdown((current) => (current === 'stage' ? null : 'stage'))}
                  onSelect={(value) => {
                    setTaskStage(value);
                    setOpenDropdown(null);
                  }}
                  accessibilityLabel="Filter by task stage"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyHeader}>
            <Text style={styles.bodyTitle}>Task Pipeline</Text>
            <Text style={styles.bodyCount}>{filteredTasks.length} tasks</Text>
          </View>
          {filteredTasks.length ? (
            <View style={styles.taskGrid}>
              {filteredTasks.map((task, index) => (
                <SalesTaskCard
                  key={task.id}
                  task={task}
                  width={cardWidth}
                  index={index}
                  onUpdateMeeting={onUpdateMeeting}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon source="clipboard-search-outline" size={30} color={theme.colors.subtle} />
              <Text style={styles.emptyTitle}>No matching tasks</Text>
              <Text style={styles.emptyText}>Try changing the search or filter selection.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  stickyHeader: {
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    zIndex: 50,
    elevation: 4,
  },
  body: {
    width: '100%',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bodyTitle: { color: theme.colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  bodyCount: { color: theme.colors.muted, fontSize: 10, fontWeight: '800' },
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  emptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '900' },
  emptyText: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  headerCard: {
    width: '100%',
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: theme.spacing.sm,
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F1',
    backgroundColor: 'transparent',
  },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  headingCopy: {
    minWidth: 190,
    flex: 1,
    zIndex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  headingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    zIndex: 1,
  },
  secondaryAction: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#CBD9EE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  primaryAction: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    shadowColor: '#2563EB',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 0,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  mobileFilters: {
    flexDirection: 'column',
  },
  searchContainer: {
    minWidth: 220,
    minHeight: 30,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchContainerFocused: {
    borderColor: theme.colors.primary,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4FF',
  },
  mobileSearch: {
    width: '100%',
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  dropdowns: {
    flexDirection: 'row',
    gap: 6,
  },
  mobileDropdowns: {
    width: '100%',
  },
  dropdownRoot: {
    position: 'relative',
    width: 180,
    minWidth: 0,
    flexShrink: 1,
    zIndex: 10,
  },
  dropdownButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownButtonOpen: {
    borderColor: theme.colors.primary,
  },
  dropdownValue: {
    minWidth: 0,
    flex: 1,
    color: theme.colors.text,
    fontSize: 9,
    fontWeight: '800',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    maxHeight: 190,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  dropdownMenuContent: {
    padding: 3,
  },
  dropdownOption: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 7,
  },
  selectedOption: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  selectedOptionText: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
