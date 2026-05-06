import { RoutineState } from '../types';

export const STORAGE_KEYS = {
  routines: 'circle-day:routines',
  tasksByDate: 'circle-day:tasks-by-date',
};
export const loadStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const persistJson = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the app usable even if storage is unavailable.
  }
};
