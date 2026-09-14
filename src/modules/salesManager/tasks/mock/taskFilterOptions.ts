export const taskTypeOptions = ['All Meetings', 'Today', 'Pending', 'Future 3 Days'] as const;

export const taskStageOptions = ['Leads', 'Meetings'] as const;

export type TaskTypeFilter = (typeof taskTypeOptions)[number];
export type TaskStageFilter = (typeof taskStageOptions)[number];
