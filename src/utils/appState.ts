import { RoutineState, Task } from '../types';
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

export const normalizeAppState = (snapshot: AppStateSnapshot, todayStr: string): AppStateSnapshot => {
  const routines = snapshot.routines ?? INITIAL_ROUTINES;
  const skippedRatingTaskIds = snapshot.skippedRatingTaskIds ?? [];
  const hasCompletedPastCleanup = skippedRatingTaskIds.includes(ONE_TIME_PAST_CLEANUP_MARKER);
  const sourceTasksByDate = snapshot.tasksByDate ?? {};
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
