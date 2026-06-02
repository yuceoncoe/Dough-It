import { RoutineState, Task, Tag } from '../types';
import { INITIAL_ROUTINES, addOrReplaceDateTasks, seedTasksForToday } from './task';

export interface AppStateSnapshot {
  routines: RoutineState;
  tasksByDate: Record<string, Task[]>;
  skippedRatingTaskIds: string[];
}

const ONE_TIME_PAST_CLEANUP_CUTOFF = '2026-05-11';
const ONE_TIME_PAST_CLEANUP_MARKER = `__circle_day_past_cleanup_before_${ONE_TIME_PAST_CLEANUP_CUTOFF}__`;

export const createDefaultAppState = (todayStr: string): AppStateSnapshot => ({
  routines: INITIAL_ROUTINES,
  tasksByDate: seedTasksForToday(todayStr, INITIAL_ROUTINES),
  skippedRatingTaskIds: [],
});

const removePastDateTasks = (tasksByDate: Record<string, Task[]>, cutoffDate: string) =>
  Object.fromEntries(
    Object.entries(tasksByDate).filter(([date]) => date >= cutoffDate),
  );

const normalizeTags = (tags: unknown): Tag[] => (
  Array.isArray(tags)
    ? tags.filter((tag): tag is Tag => tag === 'urgent' || tag === 'important')
    : []
);

const normalizeTask = (task: Partial<Task> | null | undefined, fallbackId: string): Task => ({
  id: typeof task?.id === 'string' && task.id ? task.id : fallbackId,
  title: typeof task?.title === 'string' ? task.title : '',
  tags: normalizeTags(task?.tags),
  startTime: typeof task?.startTime === 'string' ? task.startTime : null,
  duration: typeof task?.duration === 'number' ? task.duration : null,
  completed: Boolean(task?.completed),
  isRoutine: Boolean(task?.isRoutine) || undefined,
  routineDays: Array.isArray(task?.routineDays) ? task.routineDays.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6) : undefined,
  activeFromDate: typeof task?.activeFromDate === 'string' ? task.activeFromDate : undefined,
  rating: typeof task?.rating === 'number' ? task.rating : undefined,
  note: typeof task?.note === 'string' ? task.note : undefined,
});

const normalizeTasksByDate = (tasksByDate: Record<string, Task[]>) =>
  Object.fromEntries(
    Object.entries(tasksByDate ?? {}).map(([date, tasks]) => [
      date,
      Array.isArray(tasks) ? tasks.map((task, index) => normalizeTask(task, `task-${date}-${index}`)) : [],
    ]),
  );

const normalizeRoutines = (routines: any | null | undefined): RoutineState => {
  if (Array.isArray(routines)) {
    return routines.map((task, index) => normalizeTask(task, `routine-${index}`));
  }

  // Migration from old { weekday, weekend } format
  if (routines && typeof routines === 'object') {
    const migrated: Task[] = [];
    if (Array.isArray(routines.weekday)) {
      routines.weekday.forEach((task: any, index: number) => {
        migrated.push({
          ...normalizeTask(task, `weekday-routine-${index}`),
          routineDays: [1, 2, 3, 4, 5],
        });
      });
    }
    if (Array.isArray(routines.weekend)) {
      routines.weekend.forEach((task: any, index: number) => {
        migrated.push({
          ...normalizeTask(task, `weekend-routine-${index}`),
          routineDays: [0, 6],
        });
      });
    }
    return migrated;
  }

  return [];
};

export const toSerializableAppState = (snapshot: AppStateSnapshot): AppStateSnapshot => ({
  routines: normalizeRoutines(snapshot.routines),
  tasksByDate: normalizeTasksByDate(snapshot.tasksByDate ?? {}),
  skippedRatingTaskIds: Array.isArray(snapshot.skippedRatingTaskIds)
    ? snapshot.skippedRatingTaskIds.filter((id): id is string => typeof id === 'string')
    : [],
});

export const normalizeAppState = (snapshot: AppStateSnapshot, todayStr: string): AppStateSnapshot => {
  const serializableSnapshot = toSerializableAppState(snapshot);
  const routines = serializableSnapshot.routines;
  const skippedRatingTaskIds = serializableSnapshot.skippedRatingTaskIds;
  const hasCompletedPastCleanup = skippedRatingTaskIds.includes(ONE_TIME_PAST_CLEANUP_MARKER);
  const sourceTasksByDate = serializableSnapshot.tasksByDate;
  const tasksAfterOneTimeCleanup = hasCompletedPastCleanup
    ? sourceTasksByDate
    : removePastDateTasks(sourceTasksByDate, ONE_TIME_PAST_CLEANUP_CUTOFF);
  const tasksByDate = addOrReplaceDateTasks(tasksAfterOneTimeCleanup, todayStr, routines);

  return {
    routines,
    tasksByDate,
    skippedRatingTaskIds: hasCompletedPastCleanup
      ? skippedRatingTaskIds
      : [...skippedRatingTaskIds, ONE_TIME_PAST_CLEANUP_MARKER],
  };
};
