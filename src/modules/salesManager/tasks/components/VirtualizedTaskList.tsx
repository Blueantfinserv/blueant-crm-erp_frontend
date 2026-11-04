import { SectionList, View } from 'react-native';
import type { ReactNode } from 'react';
import type { SalesTask } from '../types/tasks';
import { SalesTaskCard } from './SalesTaskCard';
import { styles } from '../salesManagerTasksStyles';
import { theme } from '../../../../theme/theme';

export const buildTaskRows = (tasks: readonly SalesTask[], columns: number) => {
  const rows: { key: string; tasks?: SalesTask[] }[] = [{ key: 'summary' }];
  for (let offset = 0; offset < tasks.length; offset += columns) rows.push({ key: `row:${offset}`, tasks: tasks.slice(offset, offset + columns) });
  if (!tasks.length) rows.push({ key: 'empty' });
  return rows;
};

export function VirtualizedTaskList({ header, summary, placeholder, tasks, width, columns, highlightTaskLabel, onUpdateMeeting, onOpenDetails }: {
  header: ReactNode; summary: ReactNode; placeholder: ReactNode; tasks: SalesTask[];
  width: `${number}%`; columns: number; highlightTaskLabel: boolean;
  onUpdateMeeting?: (task: SalesTask) => void; onOpenDetails?: (task: SalesTask) => void;
}) {
  return <View style={styles.page}><SectionList
    sections={[{ data: buildTaskRows(tasks, columns) }]}
    keyExtractor={row => row.key}
    renderSectionHeader={() => <>{header}</>}
    stickySectionHeadersEnabled
    contentContainerStyle={styles.scrollContent}
    initialNumToRender={5} maxToRenderPerBatch={6} windowSize={5}
    removeClippedSubviews={false} showsVerticalScrollIndicator={false}
    renderItem={({ item }) => item.key === 'summary' ? <View style={styles.body}>{summary}</View>
      : item.key === 'empty' ? <View style={styles.body}>{placeholder}</View>
      : <View style={[styles.taskGrid, { paddingTop: theme.spacing.md }]}>{item.tasks!.map(task =>
        <SalesTaskCard key={task.id} task={task} width={width} highlightTaskLabel={highlightTaskLabel}
          onUpdateMeeting={onUpdateMeeting} onOpenDetails={onOpenDetails} />)}</View>}
  /></View>;
}
