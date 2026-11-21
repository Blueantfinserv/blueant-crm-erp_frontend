import type { SalesTask } from './types/tasks';

export const mergeReadyClientTasks = (previous: readonly SalesTask[], refreshed: readonly SalesTask[]) => {
  const tasks = new Map(previous.map((task) => [task.id, task]));
  refreshed.forEach((task) => {
    if (!task.historyLoadState) tasks.set(task.id, task);
  });
  return [...tasks.values()];
};
