import { TaskStageFilter } from '../mock/taskFilterOptions';

export type TaskScheduleFilter = 'Today' | 'Pending' | 'Future 3 Days';
export type MeetingStage = Exclude<TaskStageFilter, 'All Stages'>;

export interface SalesTask {
  id: string;
  name: string;
  phone: string;
  locationText: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  hasLocationPin?: boolean;
  meetingStage: MeetingStage;
  remarks: string;
  lastUpdated: string;
  nextFollowUpDate: string;
  schedule: TaskScheduleFilter;
}
