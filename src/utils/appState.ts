import { RoutineState, Task } from '../types';
import { INITIAL_ROUTINES, addOrReplaceDateTasks, seedTasksForToday } from './task';

export interface AppStateSnapshot {
  routines: RoutineState;
  tasksByDate: Record<string, Task[]>;
  skippedRatingTaskIds: string[];
}

export const createDefaultAppState = (todayStr: string): AppStateSnapshot => ({
  routines: INITIAL_ROUTINES,
  tasksByDate: seedTasksForToday(todayStr, INITIAL_ROUTINES),
  skippedRatingTaskIds: [],
});

export const normalizeAppState = (snapshot: AppStateSnapshot, todayStr: string): AppStateSnapshot => {
  const routines = snapshot.routines ?? INITIAL_ROUTINES;
  const tasksByDate = addOrReplaceDateTasks(snapshot.tasksByDate ?? {}, todayStr, routines);

  return {
    routines,
    tasksByDate,
    skippedRatingTaskIds: snapshot.skippedRatingTaskIds ?? [],
  };
};
