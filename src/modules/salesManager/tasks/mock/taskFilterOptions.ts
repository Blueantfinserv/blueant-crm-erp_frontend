export const taskTypeOptions = ['All Tasks', 'Today', 'Pending', 'Future 3 Days'] as const;

export const taskStageOptions = [
  'All Stages',
  '1st Meeting',
  '2nd Meeting',
  '3rd Meeting',
  '4th Meeting',
  '5th Meeting',
  '6th Meeting',
  '7th Meeting',
  '8th Meeting',
  '9th Meeting',
  '10th Meeting',
] as const;

export type TaskTypeFilter = (typeof taskTypeOptions)[number];
export type TaskStageFilter = (typeof taskStageOptions)[number];
