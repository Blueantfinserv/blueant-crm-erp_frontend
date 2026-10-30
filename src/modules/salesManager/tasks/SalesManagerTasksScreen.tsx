import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { taskTypeOptions } from './mock/taskFilterOptions';
import { SalesTaskCard } from './components/SalesTaskCard';
import { FilterDropdown } from './components/FilterDropdown';
import { styles } from './salesManagerTasksStyles';
import { FUTURE_DAY_OPTIONS, LEAD_FILTER_OPTIONS, SERVICE_REQUEST_FORM_URL, SHOW_NEW_LEAD_ACTION } from './taskConstants';
import { useSalesManagerTasks } from './hooks/useSalesManagerTasks';
import type { SalesManagerTasksProps } from './types/screen';

export { matchesAssignmentTaskFilter } from './taskDateUtils';

export function SalesManagerTasksScreen({ onCreateNewLead, onUpdateMeeting, onOpenLeadDetails, includeClientTasks = false, initialTaskType = 'Today', allTaskMode = false, taskToDoMode = false, todaysTaskMode = false, pendingTaskMode = false, future3DaysTaskMode = false, allLeadsMode = false }: SalesManagerTasksProps) {
  const { isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const cardWidth: `${number}%` = width >= 1200 ? '31%' : width >= 700 ? '48%' : '100%';
  const { clientLoading, clientError, search, setSearch, taskType, setTaskType, taskStage, setTaskStage, leadFilter, setLeadFilter, meetingFilter, setMeetingFilter, allTaskFilter, setAllTaskFilter, futureDayFilter, setFutureDayFilter, openDropdown, setOpenDropdown, searchFocused, setSearchFocused, isRefreshing, leadState, meetingState, meetingFilterOptions, allTaskFilterOptions, refreshTasks, getLeadFilterCount, getMeetingFilterCount, filteredTasks } = useSalesManagerTasks({ includeClientTasks, initialTaskType, allTaskMode, taskToDoMode, todaysTaskMode, pendingTaskMode, future3DaysTaskMode, allLeadsMode });

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.headerCard}>
            <View style={[styles.heading, isMobile && styles.mobileHeading]}>
              <View style={[styles.headingCopy, isMobile && styles.mobileHeadingCopy]}>
                <Text style={styles.title}>{allTaskMode ? 'All Task' : allLeadsMode ? 'All Prospects' : taskToDoMode ? 'Task To Do' : todaysTaskMode ? "Today's Task" : pendingTaskMode ? 'Pending Task' : future3DaysTaskMode ? 'Future 3 Days' : 'Your Tasks'}</Text>
              </View>
              <View style={[styles.headingActions, isMobile && styles.mobileHeadingActions]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh tasks"
                  accessibilityState={{ disabled: isRefreshing }}
                  disabled={isRefreshing}
                  onPress={() => void refreshTasks()}
                  style={({ pressed }) => [styles.refreshAction, isRefreshing && styles.refreshActionDisabled, pressed && styles.pressed]}
                >
                  {isRefreshing ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Icon source="refresh" size={16} color={theme.colors.primary} />}
                  <Text style={[styles.refreshActionText, isDark && styles.darkModeWhiteSource]}>{isRefreshing ? 'Refreshing' : 'Refresh'}</Text>
                </Pressable>
                {SHOW_NEW_LEAD_ACTION ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create new prospect"
                    onPress={onCreateNewLead}
                    style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                  >
                    <Text style={styles.secondaryActionText}>New Prospect</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create service request"
                  onPress={() => void Linking.openURL(SERVICE_REQUEST_FORM_URL)}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
                >
                  <Text style={[styles.primaryActionText, isDark && styles.darkModeWhiteSource]}>Service Request</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.filters, isMobile && !allTaskMode && !future3DaysTaskMode && !allLeadsMode && styles.mobileFilters]}>
              <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused, isMobile && !allTaskMode && !future3DaysTaskMode && !allLeadsMode && styles.mobileSearch, (allTaskMode || future3DaysTaskMode || allLeadsMode) && styles.allTaskSearch]}>
                <View style={styles.searchIcon}>
                  <Icon source="magnify" size={18} color={theme.colors.primary} />
                </View>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={allTaskMode || taskToDoMode || todaysTaskMode || pendingTaskMode || future3DaysTaskMode || allLeadsMode ? 'Search by name, mobile or code' : 'Search by name or mobile number'}
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

              {allTaskMode ? (
                <View style={[styles.dropdowns, isMobile && styles.allTaskMobileDropdowns]}>
                  <FilterDropdown
                    value={allTaskFilter}
                    options={allTaskFilterOptions}
                    compactWidth
                    open={openDropdown === 'task'}
                    onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                    onSelect={(value) => {
                      setAllTaskFilter(value);
                      setOpenDropdown(null);
                    }}
                    accessibilityLabel="Filter all tasks by prospect or meeting label"
                  />
                </View>
              ) : allLeadsMode ? null : future3DaysTaskMode ? (
                <View style={[styles.dropdowns, isMobile && styles.allTaskMobileDropdowns]}>
                  <FilterDropdown
                    value={futureDayFilter}
                    options={FUTURE_DAY_OPTIONS}
                    compactWidth
                    open={openDropdown === 'task'}
                    onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                    onSelect={(value) => {
                      setFutureDayFilter(value);
                      setOpenDropdown(null);
                    }}
                    accessibilityLabel="Filter future tasks by scheduled day"
                  />
                </View>
              ) : taskToDoMode || todaysTaskMode || pendingTaskMode ? null : (
              <View style={[styles.dropdowns, isMobile && styles.mobileDropdowns]}>
                <FilterDropdown
                  value={taskType}
                  options={taskTypeOptions}
                  compactWidth={isMobile}
                  open={openDropdown === 'task'}
                  onToggle={() => setOpenDropdown((current) => (current === 'task' ? null : 'task'))}
                  onSelect={(value) => {
                    setTaskType(value);
                    setOpenDropdown(null);
                  }}
                  accessibilityLabel="Filter by task type"
                />
                <View style={[styles.stageTabs, isMobile && styles.mobileStageTabs]}>
                  <View style={[styles.meetingStageRoot, isMobile && styles.mobileStageRoot]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Filter prospects by status"
                      accessibilityState={{
                        expanded: openDropdown === 'lead',
                        selected: taskStage === 'Leads',
                      }}
                      onPress={() => {
                        setTaskStage('Leads');
                        setOpenDropdown((current) => (current === 'lead' ? null : 'lead'));
                      }}
                      style={({ pressed }) => [
                        styles.stageTab,
                        styles.leadStageButton,
                        isMobile && styles.mobileStageButton,
                        taskStage === 'Leads' && styles.stageTabSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.stageTabText, taskStage === 'Leads' && styles.stageTabTextSelected]}
                      >
                        {leadFilter} ({getLeadFilterCount(leadFilter)})
                      </Text>
                      <Icon
                        source={openDropdown === 'lead' ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={taskStage === 'Leads' ? '#FFFFFF' : theme.colors.muted}
                      />
                    </Pressable>

                    {openDropdown === 'lead' ? (
                      <View style={styles.leadStageMenu}>
                        {LEAD_FILTER_OPTIONS.map((option) => {
                          const selected = leadFilter === option;
                          return (
                            <Pressable
                              key={option}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setLeadFilter(option);
                                setTaskStage('Leads');
                                setOpenDropdown(null);
                              }}
                              style={({ pressed }) => [
                                styles.dropdownOption,
                                selected && styles.selectedOption,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text style={[styles.optionText, selected && styles.selectedOptionText]}>
                                {option} ({getLeadFilterCount(option)})
                              </Text>
                              {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.meetingStageRoot, isMobile && styles.mobileStageRoot]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Filter meetings by backend title"
                      accessibilityState={{
                        expanded: openDropdown === 'meeting',
                        selected: taskStage === 'Meetings',
                      }}
                      onPress={() => {
                        setTaskStage('Meetings');
                        setOpenDropdown((current) => (current === 'meeting' ? null : 'meeting'));
                      }}
                      style={({ pressed }) => [
                        styles.stageTab,
                        styles.meetingStageButton,
                        isMobile && styles.mobileStageButton,
                        taskStage === 'Meetings' && styles.stageTabSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.stageTabText, taskStage === 'Meetings' && styles.stageTabTextSelected]}
                      >
                        {meetingFilter === 'All Meetings' ? 'Meetings' : meetingFilter} ({getMeetingFilterCount(meetingFilter)})
                      </Text>
                      <Icon
                        source={openDropdown === 'meeting' ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={taskStage === 'Meetings' ? '#FFFFFF' : theme.colors.muted}
                      />
                    </Pressable>

                    {openDropdown === 'meeting' ? (
                      <ScrollView
                        style={styles.meetingStageMenu}
                        contentContainerStyle={styles.dropdownMenuContent}
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                      >
                        {meetingFilterOptions.map((option) => {
                          const selected = meetingFilter === option;
                          return (
                            <Pressable
                              key={option}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setMeetingFilter(option);
                                setTaskStage('Meetings');
                                setOpenDropdown(null);
                              }}
                              style={({ pressed }) => [
                                styles.dropdownOption,
                                selected && styles.selectedOption,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text style={[styles.optionText, selected && styles.selectedOptionText]}>
                                {option} ({getMeetingFilterCount(option)})
                              </Text>
                              {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}
                  </View>
                </View>
              </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyHeader}>
            <Text style={styles.bodyTitle}>Task Pipeline</Text>
            <Text style={[styles.bodyCount, isDark && styles.darkModeWhiteSource]}>
              {filteredTasks.length ? `${filteredTasks.length} tasks` : '0 tasks'}
            </Text>
          </View>
          {leadState.isLoading || meetingState.isLoading || clientLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>Loading tasks</Text>
            </View>
          ) : leadState.error || meetingState.error || clientError ? (
            <View style={styles.emptyState}>
              <Icon source="alert-circle-outline" size={30} color="#DC2626" />
              <Text style={styles.emptyTitle}>Tasks could not be loaded</Text>
              <Text style={styles.emptyText}>{leadState.error ?? meetingState.error ?? clientError}</Text>
            </View>
          ) : filteredTasks.length ? (
            <>
              <View style={styles.taskGrid}>
                {filteredTasks.map((task) => (
                  <SalesTaskCard
                    key={task.id}
                    task={task}
                    width={cardWidth}
                  highlightTaskLabel={allTaskMode || taskToDoMode || todaysTaskMode || pendingTaskMode || future3DaysTaskMode || allLeadsMode}
                    onUpdateMeeting={onUpdateMeeting}
                    onOpenDetails={onOpenLeadDetails}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Icon source="clipboard-search-outline" size={30} color={theme.colors.subtle} />
              <Text style={styles.emptyTitle}>{allLeadsMode && !search ? 'No prospects assigned' : allLeadsMode ? 'No matching prospects found' : pendingTaskMode && !search ? 'No pending tasks' : future3DaysTaskMode && !search ? 'No tasks scheduled' : 'No matching tasks found'}</Text>
              <Text style={styles.emptyText}>{pendingTaskMode && !search ? 'There are no pending tasks.' : future3DaysTaskMode && !search ? `There are no tasks scheduled for ${futureDayFilter.toLowerCase()}.` : 'Try changing the search.'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
