import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { RoutineState, Task, RoutineScope } from '../types';
import { addOrReplaceDateTasks, getRoutineBaseId } from '../utils/task';
import { syncTaskAlarms, requestNotificationPermissions, disableNotificationPermissions } from '../utils/notifications';
import { timeToMinutes } from '../utils/time';
import { AppStateSnapshot, createDefaultAppState, normalizeAppState } from '../utils/appState';
import {
  loadCachedAppState,
  loadRemoteAppState,
  loadRemoteAppStateUpdatedAt,
  persistCachedAppState,
  persistRemoteAppState,
} from '../utils/cloudStorage';

const collectEndedUnratedTasks = (
  tasksByDate: Record<string, Task[]>,
  skippedRatingTaskIds: Set<string>,
  now: Date,
) => {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const actualTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const targetDates = [yesterdayStr, actualTodayStr];
  const endedUnratedTasks: Task[] = [];
  let nextEndAt: number | null = null;

  targetDates.forEach((dateStr) => {
    const tasks = tasksByDate[dateStr] ?? [];
    const [year, month, day] = dateStr.split('-').map(Number);

    tasks.forEach((task) => {
      if (!task.startTime || !task.duration) return;
      if (task.rating !== undefined) return;
      if (skippedRatingTaskIds.has(task.id)) return;

      const [hours, minutes] = task.startTime.split(':').map(Number);
      const startAt = new Date(year, month - 1, day, hours, minutes, 0);
      const endAt = new Date(startAt.getTime() + task.duration * 60 * 1000);
      const endTime = endAt.getTime();

      if (now.getTime() >= endTime) {
        if (!endedUnratedTasks.find((endedTask) => endedTask.id === task.id)) {
          endedUnratedTasks.push(task);
        }
        return;
      }

      nextEndAt = nextEndAt === null ? endTime : Math.min(nextEndAt, endTime);
    });
  });

  return { endedUnratedTasks, nextEndAt };
};

const getTaskList = (tasks: unknown): Task[] => Array.isArray(tasks) ? tasks : [];
const getSafeTags = (tags: unknown): Task['tags'] => (
  Array.isArray(tags)
    ? tags.filter((tag): tag is Task['tags'][number] => tag === 'urgent' || tag === 'important')
    : []
);

export const useAppState = (user: User, todayStr: string) => {
  const initialState = useMemo(() => createDefaultAppState(todayStr), [todayStr]);
  const [routines, setRoutines] = useState<RoutineState>(initialState.routines);
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>(initialState.tasksByDate);
  const [activeTab, setActiveTab] = useState<'home' | 'calendar'>('home');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingRatingTasks, setPendingRatingTasks] = useState<Task[]>([]);
  const [skippedRatingTaskIds, setSkippedRatingTaskIds] = useState<Set<string>>(new Set());
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'enabled' | 'unsupported' | 'denied' | 'error'>('idle');
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const hydrationTokenRef = useRef(0);
  const isHydratedRef = useRef(false);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const saveRequestIdRef = useRef(0);

  // Check notification status
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setNotificationStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setNotificationStatus('denied');
        return;
      }
      if (Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            setNotificationStatus('enabled');
          }
        } catch (error) {
          // ignore
        }
      }
    };
    void checkNotificationStatus();
  }, [user.id]);

  // Load and hydrate state from cache / remote database
  useEffect(() => {
    let isActive = true;
    const hydrationToken = hydrationTokenRef.current + 1;
    hydrationTokenRef.current = hydrationToken;
    setIsBootstrapping(true);
    isHydratedRef.current = false;
    setSaveError(null);

    const cachedState = loadCachedAppState(user.id, todayStr);
    if (cachedState && isActive) {
      remoteUpdatedAtRef.current = cachedState.remoteUpdatedAt;
      setRoutines(cachedState.snapshot.routines);
      setTasksByDate(cachedState.snapshot.tasksByDate);
      setSkippedRatingTaskIds(new Set(cachedState.snapshot.skippedRatingTaskIds));
    } else if (isActive) {
      remoteUpdatedAtRef.current = null;
      const defaultState = createDefaultAppState(todayStr);
      setRoutines(defaultState.routines);
      setTasksByDate(defaultState.tasksByDate);
      setSkippedRatingTaskIds(new Set(defaultState.skippedRatingTaskIds));
    }

    const hydrate = async () => {
      try {
        if (cachedState?.remoteUpdatedAt) {
          const remoteUpdatedAt = await loadRemoteAppStateUpdatedAt(user.id);
          if (!isActive || hydrationTokenRef.current !== hydrationToken) {
            return;
          }
          if (remoteUpdatedAt === cachedState.remoteUpdatedAt) {
            remoteUpdatedAtRef.current = remoteUpdatedAt;
            return;
          }
        }

        const remoteState = await loadRemoteAppState(user.id, todayStr);
        if (!isActive || hydrationTokenRef.current !== hydrationToken) {
          return;
        }
        const normalizedState = normalizeAppState(remoteState.snapshot, todayStr);
        remoteUpdatedAtRef.current = remoteState.remoteUpdatedAt;
        setRoutines(normalizedState.routines);
        setTasksByDate(normalizedState.tasksByDate);
        setSkippedRatingTaskIds(new Set(normalizedState.skippedRatingTaskIds));
        persistCachedAppState(user.id, normalizedState, remoteState.remoteUpdatedAt);
      } catch (error) {
        if (!isActive || hydrationTokenRef.current !== hydrationToken) {
          return;
        }
        const message = error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.';
        setSaveError(message);
      } finally {
        if (!isActive || hydrationTokenRef.current !== hydrationToken) {
          return;
        }
        isHydratedRef.current = true;
        setIsBootstrapping(false);
      }
    };

    void hydrate();

    return () => {
      isActive = false;
    };
  }, [todayStr, user.id]);

  // Persist state changes with debounce timer
  useEffect(() => {
    if (!isHydratedRef.current) {
      return;
    }

    const saveRequestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = saveRequestId;
    setSaveError(null);

    const snapshot: AppStateSnapshot = {
      routines,
      tasksByDate,
      skippedRatingTaskIds: Array.from(skippedRatingTaskIds),
    };

    persistCachedAppState(user.id, snapshot, remoteUpdatedAtRef.current);
    void syncTaskAlarms(tasksByDate, user.id).catch(() => undefined);

    const timeoutId = window.setTimeout(async () => {
      try {
        if (saveRequestIdRef.current === saveRequestId) {
          setIsSaving(true);
        }
        const remoteUpdatedAt = await persistRemoteAppState(user.id, snapshot);
        if (saveRequestIdRef.current !== saveRequestId) {
          return;
        }
        remoteUpdatedAtRef.current = remoteUpdatedAt;
        persistCachedAppState(user.id, snapshot, remoteUpdatedAt);
        setSaveError(null);
      } catch (error) {
        if (saveRequestIdRef.current !== saveRequestId) {
          return;
        }
        const message = error instanceof Error ? error.message : '변경사항을 저장하지 못했습니다.';
        setSaveError(message);
      } finally {
        if (saveRequestIdRef.current === saveRequestId) {
          setIsSaving(false);
        }
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [routines, tasksByDate, skippedRatingTaskIds, user.id]);

  // Ended tasks checking logic
  useEffect(() => {
    if (!isHydratedRef.current) {
      return;
    }

    let nextEndTimeoutId: number | null = null;

    const checkEndedTasks = () => {
      const now = new Date();
      const { endedUnratedTasks, nextEndAt } = collectEndedUnratedTasks(tasksByDate, skippedRatingTaskIds, now);

      setPendingRatingTasks(endedUnratedTasks);

      if (nextEndTimeoutId !== null) {
        window.clearTimeout(nextEndTimeoutId);
        nextEndTimeoutId = null;
      }

      if (nextEndAt !== null) {
        const delay = Math.max(250, nextEndAt - now.getTime() + 250);
        nextEndTimeoutId = window.setTimeout(checkEndedTasks, delay);
      }
    };

    checkEndedTasks();
    const intervalId = window.setInterval(checkEndedTasks, 60000);
    document.addEventListener('visibilitychange', checkEndedTasks);
    window.addEventListener('focus', checkEndedTasks);

    return () => {
      window.clearInterval(intervalId);
      if (nextEndTimeoutId !== null) {
        window.clearTimeout(nextEndTimeoutId);
      }
      document.removeEventListener('visibilitychange', checkEndedTasks);
      window.removeEventListener('focus', checkEndedTasks);
    };
  }, [tasksByDate, todayStr, skippedRatingTaskIds]);

  const handleRateTask = (taskId: string, rating: number, note?: string) => {
    setTasksByDate((current) => {
      const next = { ...current };
      Object.entries(current).forEach(([dateStr, tasks]) => {
        if (tasks.some((t) => t.id === taskId)) {
          next[dateStr] = tasks.map((task) => task.id === taskId ? { ...task, rating, note: note ?? task.note, completed: true } : task);
        }
      });
      return next;
    });
  };

  const handleCloseRating = () => {
    setSkippedRatingTaskIds((current) => new Set([...current, ...pendingRatingTasks.map((task) => task.id)]));
    setPendingRatingTasks([]);
  };

  const updateTasksForDate = (date: string, nextTasks: Task[]) => {
    setTasksByDate((current) => ({ ...current, [date]: nextTasks }));
  };

  const updateRoutines = (nextRoutines: RoutineState) => {
    setSaveError(null);
    setRoutines(nextRoutines);
    setTasksByDate((current) => addOrReplaceDateTasks(current, todayStr, nextRoutines));
  };

  const applyRoutineEdit = (
    date: string,
    task: Task,
    updates: Pick<Task, 'title' | 'tags' | 'startTime' | 'duration'>,
    scope: RoutineScope,
  ) => {
    const safeUpdates = {
      ...updates,
      tags: getSafeTags(updates.tags),
    };

    if (scope === 'single') {
      setTasksByDate((current) => ({
        ...current,
        [date]: getTaskList(current[date]).map((item) => item.id === task.id ? { ...item, ...safeUpdates } : item),
      }));
      return;
    }

    const baseId = getRoutineBaseId(task.id, date);
    if (!baseId) {
      return;
    }

    setRoutines((current) => {
      const routinesArray = getTaskList(current);
      return routinesArray.map((item) => item.id === baseId ? { ...item, ...safeUpdates } : item);
    });

    setTasksByDate((current) => {
      const next = { ...current };
      Object.entries(current).forEach(([entryDate, entryTasks]) => {
        if (entryDate < date) {
          return;
        }
        next[entryDate] = getTaskList(entryTasks).map((item) => {
          const entryBaseId = getRoutineBaseId(item.id, entryDate);
          return entryBaseId === baseId ? { ...item, ...safeUpdates } : item;
        });
      });
      return next;
    });
  };

  const applyRoutineDelete = (date: string, task: Task, scope: RoutineScope) => {
    if (scope === 'single') {
      setTasksByDate((current) => ({
        ...current,
        [date]: getTaskList(current[date]).filter((item) => item.id !== task.id),
      }));
      return;
    }

    const baseId = getRoutineBaseId(task.id, date);
    if (!baseId) {
      return;
    }

    setRoutines((current) => {
      const routinesArray = getTaskList(current);
      return routinesArray.filter((item) => item.id !== baseId);
    });

    setTasksByDate((current) => {
      const next = { ...current };
      Object.entries(current).forEach(([entryDate, entryTasks]) => {
        if (entryDate < date) {
          return;
        }
        next[entryDate] = getTaskList(entryTasks).filter((item) => {
          if (getRoutineBaseId(item.id, entryDate) !== baseId) {
            return true;
          }
          return item.completed || item.rating !== undefined || (item.note !== undefined && item.note.trim() !== '');
        });
      });
      return next;
    });
  };

  const openDate = (date: string) => {
    setTasksByDate((current) => addOrReplaceDateTasks(current, date, routines));
    setSelectedDate(date);
    setActiveTab('calendar');
  };

  const moveToDate = (date: string, offsetDays: number) => {
    const nextDate = new Date(`${date}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + offsetDays);
    const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    openDate(nextDateStr);
  };

  const handleEnableNotifications = async () => {
    try {
      setNotificationMessage(null);
      const enabled = await requestNotificationPermissions(user.id);
      setNotificationStatus(enabled ? 'enabled' : 'denied');
      if (enabled) {
        setNotificationMessage('테스트 알림을 보냈습니다. 일정 알림도 예약할게요.');
        await syncTaskAlarms(tasksByDate, user.id);
      } else {
        setNotificationMessage('알림 권한이 허용되지 않았습니다.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '푸쉬 알림 설정에 실패했습니다.';
      setNotificationStatus('error');
      setNotificationMessage(message);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      setNotificationMessage(null);
      await disableNotificationPermissions(user.id);
      setNotificationStatus('idle');
      setNotificationMessage('푸쉬 알림이 꺼졌습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '알림 해제에 실패했습니다.';
      setNotificationStatus('error');
      setNotificationMessage(message);
    }
  };

  return {
    routines,
    tasksByDate,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    settingsOpen,
    setSettingsOpen,
    pendingRatingTasks,
    skippedRatingTaskIds,
    isBootstrapping,
    saveError,
    isSaving,
    notificationStatus,
    notificationMessage,
    handleRateTask,
    handleCloseRating,
    updateTasksForDate,
    updateRoutines,
    applyRoutineEdit,
    applyRoutineDelete,
    openDate,
    moveToDate,
    handleEnableNotifications,
    handleDisableNotifications,
  };
};
