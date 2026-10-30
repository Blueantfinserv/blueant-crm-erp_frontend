import type { SalesTask } from './tasks';
import type { TaskTypeFilter } from '../mock/taskFilterOptions';

export type SalesManagerTasksProps = {
  onCreateNewLead?: () => void;
  onUpdateMeeting?: (lead: SalesTask) => void;
  onOpenLeadDetails?: (lead: SalesTask) => void;
  includeClientTasks?: boolean;
  initialTaskType?: TaskTypeFilter;
  allTaskMode?: boolean;
  taskToDoMode?: boolean;
  todaysTaskMode?: boolean;
  pendingTaskMode?: boolean;
  future3DaysTaskMode?: boolean;
  allLeadsMode?: boolean;
};
