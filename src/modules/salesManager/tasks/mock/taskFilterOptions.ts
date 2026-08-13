export const taskTypeOptions = ['All Tasks', 'Today', 'Pending', 'Future 3 Days'] as const;

export const defaultTaskStageOptions = ['All Stages', 'LEADS'] as const;

export type TaskTypeFilter = (typeof taskTypeOptions)[number];
export type TaskStageFilter = string;
