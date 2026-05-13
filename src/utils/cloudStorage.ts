import { AppStateSnapshot, createDefaultAppState, normalizeAppState, toSerializableAppState } from './appState';
import { supabase } from '../lib/supabase';

const CACHE_PREFIX = 'circle-day:user-cache:';
const CACHE_VERSION = 2;

const getCacheKey = (userId: string) => `${CACHE_PREFIX}${userId}`;

export interface CachedAppState {
  snapshot: AppStateSnapshot;
  remoteUpdatedAt: string | null;
}

const throwSupabaseError = (error: { message?: string; details?: string; hint?: string }) => {
  const message = [
    error.message,
    error.details,
    error.hint,
  ].filter(Boolean).join(' ');
  throw new Error(message || 'Supabase 요청에 실패했습니다.');
};

export const loadCachedAppState = (userId: string, todayStr: string): CachedAppState | null => {
  try {
    const raw = window.localStorage.getItem(getCacheKey(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AppStateSnapshot | {
      version?: number;
      snapshot?: AppStateSnapshot;
      remoteUpdatedAt?: string | null;
    };

    if ('snapshot' in parsed && parsed.snapshot) {
      return {
        snapshot: normalizeAppState(parsed.snapshot, todayStr),
        remoteUpdatedAt: parsed.remoteUpdatedAt ?? null,
      };
    }

    return {
      snapshot: normalizeAppState(parsed as AppStateSnapshot, todayStr),
      remoteUpdatedAt: null,
    };
  } catch {
    return null;
  }
};

export const persistCachedAppState = (userId: string, snapshot: AppStateSnapshot, remoteUpdatedAt: string | null = null) => {
  try {
    const serializableSnapshot = toSerializableAppState(snapshot);
    window.localStorage.setItem(getCacheKey(userId), JSON.stringify({
      version: CACHE_VERSION,
      cachedAt: Date.now(),
      remoteUpdatedAt,
      snapshot: serializableSnapshot,
    }));
  } catch {
    // Ignore local cache failures.
  }
};

export const loadRemoteAppStateUpdatedAt = async (userId: string): Promise<string | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_app_state')
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }

  return data?.updated_at ?? null;
};

export const loadRemoteAppState = async (userId: string, todayStr: string): Promise<CachedAppState> => {
  if (!supabase) {
    return {
      snapshot: createDefaultAppState(todayStr),
      remoteUpdatedAt: null,
    };
  }

  const { data, error } = await supabase
    .from('user_app_state')
    .select('routines, tasks_by_date, skipped_rating_task_ids, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }

  if (!data) {
    return {
      snapshot: createDefaultAppState(todayStr),
      remoteUpdatedAt: null,
    };
  }

  return {
    snapshot: normalizeAppState({
      routines: data.routines,
      tasksByDate: data.tasks_by_date ?? {},
      skippedRatingTaskIds: data.skipped_rating_task_ids ?? [],
    }, todayStr),
    remoteUpdatedAt: data.updated_at ?? null,
  };
};

export const persistRemoteAppState = async (userId: string, snapshot: AppStateSnapshot): Promise<string | null> => {
  if (!supabase) {
    return null;
  }
  const serializableSnapshot = toSerializableAppState(snapshot);
  const updatedAt = new Date().toISOString();

  const { error } = await supabase
    .from('user_app_state')
    .upsert({
      user_id: userId,
      routines: serializableSnapshot.routines,
      tasks_by_date: serializableSnapshot.tasksByDate,
      skipped_rating_task_ids: serializableSnapshot.skippedRatingTaskIds,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' });

  if (error) {
    throwSupabaseError(error);
  }

  return updatedAt;
};
