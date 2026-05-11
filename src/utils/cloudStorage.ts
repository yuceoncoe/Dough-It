import { AppStateSnapshot, createDefaultAppState, normalizeAppState } from './appState';
import { supabase } from '../lib/supabase';

const CACHE_PREFIX = 'circle-day:user-cache:';

const getCacheKey = (userId: string) => `${CACHE_PREFIX}${userId}`;

export const loadCachedAppState = (userId: string, todayStr: string): AppStateSnapshot | null => {
  try {
    const raw = window.localStorage.getItem(getCacheKey(userId));
    if (!raw) {
      return null;
    }
    return normalizeAppState(JSON.parse(raw) as AppStateSnapshot, todayStr);
  } catch {
    return null;
  }
};

export const persistCachedAppState = (userId: string, snapshot: AppStateSnapshot) => {
  try {
    window.localStorage.setItem(getCacheKey(userId), JSON.stringify(snapshot));
  } catch {
    // Ignore local cache failures.
  }
};

export const loadRemoteAppState = async (userId: string, todayStr: string): Promise<AppStateSnapshot> => {
  if (!supabase) {
    return createDefaultAppState(todayStr);
  }

  const { data, error } = await supabase
    .from('user_app_state')
    .select('routines, tasks_by_date, skipped_rating_task_ids')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return createDefaultAppState(todayStr);
  }

  return normalizeAppState({
    routines: data.routines,
    tasksByDate: data.tasks_by_date ?? {},
    skippedRatingTaskIds: data.skipped_rating_task_ids ?? [],
  }, todayStr);
};

export const persistRemoteAppState = async (userId: string, snapshot: AppStateSnapshot) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('user_app_state')
    .upsert({
      user_id: userId,
      routines: snapshot.routines,
      tasks_by_date: snapshot.tasksByDate,
      skipped_rating_task_ids: snapshot.skippedRatingTaskIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    throw error;
  }
};
