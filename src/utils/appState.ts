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
  rating: typeof task?.rating === 'number' ? task.rating : undefined,
  note: typeof task?.note === 'string' ? task.note : undefined,
});

const normalizeTasksByDate = (tasksByDate: Record<string, Task[]>) =>
  Object.fromEntries(
    Object.entries(tasksByDate).map(([date, tasks]) => [
      date,
      Array.isArray(tasks) ? tasks.map((task, index) => normalizeTask(task, `task-${date}-${index}`)) : [],
    ]),
  );

export const normalizeAppState = (snapshot: AppStateSnapshot, todayStr: string): AppStateSnapshot => {
  const sourceRoutines = snapshot.routines ?? INITIAL_ROUTINES;
  const routines = {
    weekday: Array.isArray(sourceRoutines.weekday) ? sourceRoutines.weekday.map((task, index) => normalizeTask(task, `weekday-routine-${index}`)) : [],
    weekend: Array.isArray(sourceRoutines.weekend) ? sourceRoutines.weekend.map((task, index) => normalizeTask(task, `weekend-routine-${index}`)) : [],
  };
  const skippedRatingTaskIds = snapshot.skippedRatingTaskIds ?? [];
  const hasCompletedPastCleanup = skippedRatingTaskIds.includes(ONE_TIME_PAST_CLEANUP_MARKER);
  const sourceTasksByDate = normalizeTasksByDate(snapshot.tasksByDate ?? {});
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
