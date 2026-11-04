import type { SalesTask } from './types/tasks';
import type { SalesManagerTasksProps } from './types/screen';
import type { TaskTypeFilter, TaskStageFilter } from './mock/taskFilterOptions';
import { LEAD_FILTER_OPTIONS, type FutureDayFilter } from './taskConstants';
import { assignedOnToday, calendarDateFromValue, calendarDateOffset, matchesAssignmentTaskFilter } from './taskDateUtils';
import { isRemovedLead } from './taskMeetingSelectors';

type TaskFilterInput = {
  tasks: SalesTask[];
  allLeadTasks: SalesTask[];
  search: string;
  taskType: TaskTypeFilter;
  taskStage: TaskStageFilter;
  leadFilter: typeof LEAD_FILTER_OPTIONS[number];
  meetingFilter: string;
  allTaskFilter: string;
  futureDayFilter: FutureDayFilter;
} & Pick<SalesManagerTasksProps, 'allLeadsMode' | 'allTaskMode' | 'future3DaysTaskMode' | 'pendingTaskMode' | 'taskToDoMode' | 'todaysTaskMode'>;

export function getTaskFilterCounts(tasks: SalesTask[], search: string, taskType: TaskTypeFilter) {
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedPhoneSearch = search.replace(/\D/g, '');
  const searchedTasks = tasks.filter((task) => {
    const matchesSearch =
      !normalizedSearch
      || task.name.toLowerCase().includes(normalizedSearch)
      || (normalizedPhoneSearch.length > 0 && task.phone.replace(/\D/g, '').includes(normalizedPhoneSearch));
    return matchesSearch;
  });
  const countableTasks = searchedTasks.filter((task) => {
    const matchesTaskType = task.taskKind === 'LEAD' || task.taskKind === 'CLIENT'
      ? matchesAssignmentTaskFilter(task.nextPlanDate ?? task.assignedAt, taskType)
      : taskType === 'All Tasks' || task.schedule === taskType;
    return matchesTaskType;
  });
  const activeLeads = countableTasks.filter((task) => (
    task.taskKind === 'LEAD' && !isRemovedLead(task.leadStatus)
  ));
  const todayLeads = activeLeads.filter((task) => assignedOnToday(task.nextPlanDate ?? task.assignedAt)).length;
  const removedLeads = countableTasks.filter((task) => (
    task.taskKind === 'LEAD' && isRemovedLead(task.leadStatus)
  )).length;
  const meetings = countableTasks.filter((task) => task.taskKind === 'MEETING');
  const meetingsByTitle = meetings.reduce<Record<string, number>>((counts, task) => {
    if (task.meetingTitle) counts[task.meetingTitle] = (counts[task.meetingTitle] ?? 0) + 1;
    return counts;
  }, {});
  return { todayLeads, activeLeads: activeLeads.length, removedLeads, meetings: meetings.length, meetingsByTitle };
}

export function filterSalesTasks({ allLeadTasks, allLeadsMode, allTaskFilter, allTaskMode, future3DaysTaskMode, futureDayFilter, leadFilter, meetingFilter, pendingTaskMode, search, taskStage, taskToDoMode, taskType, tasks, todaysTaskMode }: TaskFilterInput) {
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedPhoneSearch = search.replace(/\D/g, '');

  const sourceTasks = allLeadsMode ? allLeadTasks : tasks;
  return sourceTasks.filter((task) => {
    const matchesSearch =
      !normalizedSearch ||
      task.name.toLowerCase().includes(normalizedSearch) ||
      (normalizedPhoneSearch.length > 0 && task.phone.replace(/\D/g, '').includes(normalizedPhoneSearch)) ||
      ((allTaskMode || taskToDoMode || todaysTaskMode || pendingTaskMode || future3DaysTaskMode || allLeadsMode) && [task.leadCode, task.meetingCode, task.uniqueLeadId]
        .filter(Boolean)
        .some((identifier) => identifier?.toLowerCase().includes(normalizedSearch)));
    if (allTaskMode) {
      const matchesAllTaskFilter = allTaskFilter === 'All Task'
        || (allTaskFilter === 'Leads'
          ? task.taskKind === 'LEAD'
          : allTaskFilter === 'Clients'
            ? task.taskKind === 'CLIENT'
          : task.taskKind === 'MEETING' && task.meetingTitle === allTaskFilter);
      return matchesSearch && matchesAllTaskFilter;
    }
    if (allLeadsMode) return matchesSearch;
    if (taskToDoMode) {
      const matchesTaskToDo = task.taskKind === 'LEAD' || task.taskKind === 'CLIENT'
        ? !isRemovedLead(task.leadStatus) && (
          matchesAssignmentTaskFilter(task.nextPlanDate ?? task.assignedAt, 'Today') || matchesAssignmentTaskFilter(task.nextPlanDate ?? task.assignedAt, 'Pending')
        )
        : task.schedule === 'Today' || task.schedule === 'Pending';
      return matchesSearch && matchesTaskToDo;
    }
    if (todaysTaskMode) {
      const matchesTodaysTask = task.taskKind === 'LEAD' || task.taskKind === 'CLIENT'
        ? matchesAssignmentTaskFilter(task.nextPlanDate ?? task.assignedAt, 'Today')
        : task.schedule === 'Today';
      return matchesSearch && matchesTodaysTask;
    }
    if (pendingTaskMode) {
      const matchesPendingTask = task.taskKind === 'LEAD' || task.taskKind === 'CLIENT'
        ? matchesAssignmentTaskFilter(task.nextPlanDate ?? task.assignedAt, 'Pending')
        : task.schedule === 'Pending';
      return matchesSearch && matchesPendingTask;
    }
    if (future3DaysTaskMode) {
      const offset = futureDayFilter === 'Tomorrow' ? 1 : futureDayFilter === 'Day After Tomorrow' ? 2 : 3;
      return matchesSearch && calendarDateFromValue(task.scheduledAt) === calendarDateOffset(offset);
    }
    const matchesTaskType = task.taskKind === 'LEAD' || task.taskKind === 'CLIENT'
      ? matchesAssignmentTaskFilter(task.nextPlanDate ?? task.assignedAt, taskType)
      : taskType === 'All Tasks' || task.schedule === taskType;
    const matchesStage = (taskStage === 'Leads' && task.taskKind === 'LEAD')
      || (taskStage === 'Clients' && task.taskKind === 'CLIENT')
      || (taskStage === 'Meetings' && task.taskKind === 'MEETING');
    const removedLead = isRemovedLead(task.leadStatus);
    const matchesLead = taskStage !== 'Leads'
      || (leadFilter === 'Removed Prospects'
        ? removedLead
        : !removedLead);
    const matchesMeeting = taskStage !== 'Meetings'
      || meetingFilter === 'All Meetings'
      || task.meetingTitle === meetingFilter;
    return matchesSearch && matchesTaskType && matchesStage && matchesLead && matchesMeeting;
  });
}
