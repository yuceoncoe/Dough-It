import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Home, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { RoutineState, Task, RoutineScope } from './types';
import { addOrReplaceDateTasks, getRoutineBaseId, getRoutineBucketForDate, getTodayString } from './utils/task';
import RoutineSettingsModal from './components/ui/RoutineSettingsModal';
import DayScheduleView from './components/calendar/DayScheduleView';
import CalendarView from './components/calendar/CalendarView';
import TaskRatingCarousel from './components/ui/TaskRatingCarousel';
import HarvestModal from './components/ui/HarvestModal';
import { getCropComment } from './utils/crop';
import { syncTaskAlarms, requestNotificationPermissions } from './utils/notifications';
import { timeToMinutes } from './utils/time';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthScreen from './components/auth/AuthScreen';
import { AppStateSnapshot, createDefaultAppState, normalizeAppState } from './utils/appState';
import { loadCachedAppState, loadRemoteAppState, loadRemoteAppStateUpdatedAt, persistCachedAppState, persistRemoteAppState } from './utils/cloudStorage';

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

const AppShell = ({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => Promise<void>;
}) => {
  const todayStr = getTodayString();
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
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              setNotificationStatus('enabled');
              return;
            }
          }
        } catch (error) {
          // ignore
        }
      }
    };
    void checkNotificationStatus();
  }, [user.id]);

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
    const bucket = getRoutineBucketForDate(date);

    setRoutines((current) => {
      const bucketRoutines = getTaskList(current[bucket]);

      return {
        ...current,
        [bucket]: bucketRoutines.map((item) => item.id === baseId ? { ...item, ...safeUpdates } : item),
      };
    });

    setTasksByDate((current) => {
      const next = { ...current };
      Object.entries(current).forEach(([entryDate, entryTasks]) => {
        if (entryDate < date || getRoutineBucketForDate(entryDate) !== bucket) {
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
    const bucket = getRoutineBucketForDate(date);

    setRoutines((current) => {
      const bucketRoutines = getTaskList(current[bucket]);

      return {
        ...current,
        [bucket]: bucketRoutines.filter((item) => item.id !== baseId),
      };
    });

    setTasksByDate((current) => {
      const next = { ...current };
      Object.entries(current).forEach(([entryDate, entryTasks]) => {
        if (entryDate < date || getRoutineBucketForDate(entryDate) !== bucket) {
          return;
        }
        next[entryDate] = getTaskList(entryTasks).filter((item) => getRoutineBaseId(item.id, entryDate) !== baseId);
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

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e8e8ed] text-stone-500">
        <div className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-black/5">
          <Loader2 size={18} className="animate-spin" />
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900">
      <RoutineSettingsModal
        isOpen={settingsOpen}
        routines={routines}
        userEmail={user.email ?? null}
        saveError={saveError}
        isSaving={isSaving}
        notificationStatus={notificationStatus}
        notificationMessage={notificationMessage}
        onClose={() => setSettingsOpen(false)}
        onSaveRoutines={updateRoutines}
        onSignOut={onSignOut}
        onEnableNotifications={async () => {
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
        }}
      />
      {pendingRatingTasks.length > 0 && (
        <TaskRatingCarousel
          tasks={pendingRatingTasks}
          onRateTask={handleRateTask}
          onClose={handleCloseRating}
        />
      )}


      <main className="app-main flex-1 overflow-hidden">
        {activeTab === 'home' && (
          <DayScheduleView
            date={todayStr}
            tasks={tasksByDate[todayStr] ?? []}
            tasksByDate={tasksByDate}
            onOpenSettings={() => setSettingsOpen(true)}
            onPreviousDate={() => moveToDate(todayStr, -1)}
            onNextDate={() => moveToDate(todayStr, 1)}
            onTasksChange={(nextTasks) => updateTasksForDate(todayStr, nextTasks)}
            onApplyRoutineEdit={applyRoutineEdit}
            onApplyRoutineDelete={applyRoutineDelete}
          />
        )}

        {activeTab === 'calendar' && selectedDate ? (
          <DayScheduleView
            date={selectedDate}
            tasks={tasksByDate[selectedDate] ?? []}
            tasksByDate={tasksByDate}
            onOpenSettings={() => setSettingsOpen(true)}
            onPreviousDate={() => moveToDate(selectedDate, -1)}
            onNextDate={() => moveToDate(selectedDate, 1)}
            onTasksChange={(nextTasks) => updateTasksForDate(selectedDate, nextTasks)}
            onApplyRoutineEdit={applyRoutineEdit}
            onApplyRoutineDelete={applyRoutineDelete}
          />
        ) : null}

        {activeTab === 'calendar' && !selectedDate ? (
          <CalendarView
            tasksByDate={tasksByDate}
            onOpenSettings={() => setSettingsOpen(true)}
            onSelectDate={openDate}
          />
        ) : null}
      </main>

      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-stone-200 bg-white/90 px-2 shadow-[0_-12px_25px_rgba(85,72,56,0.08)] backdrop-blur">
        <button
          onClick={() => {
            setActiveTab('home');
            setSelectedDate(null);
          }}
          className={`flex w-full flex-col items-center gap-1 py-3 ${activeTab === 'home' ? 'text-amber-600' : 'text-stone-400'}`}
        >
          <Home size={22} />
          <span className="text-xs tracking-[0.2em]">오늘</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('calendar');
            if (selectedDate) {
              setSelectedDate(null);
            }
          }}
          className={`flex w-full flex-col items-center gap-1 py-3 ${activeTab === 'calendar' ? 'text-amber-600' : 'text-stone-400'}`}
        >
          <CalendarIcon size={22} />
          <span className="text-xs tracking-[0.2em]">달력</span>
        </button>
      </nav>
    </div>
  );
};

const SupabaseConfigNotice = () => (
  <div className="min-h-screen bg-[#e8e8ed] px-6 py-10 text-stone-900">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center">
      <div className="w-full rounded-[28px] border border-white/80 bg-white px-6 py-7 shadow-[0_24px_80px_rgba(73,54,31,0.12)]">
        <h1 className="font-hand text-3xl text-stone-900">Supabase 설정이 필요합니다</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          배포 환경 또는 로컬 `.env` 파일에 `VITE_SUPABASE_URL` 과 `VITE_SUPABASE_ANON_KEY` 를 추가해 주세요.
        </p>
        <div className="mt-5 rounded-2xl bg-stone-100 px-4 py-3 font-mono text-sm text-stone-700">
          <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=your-anon-key</div>
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-500">
          테이블과 권한 정책은 프로젝트의 `supabase/schema.sql` 파일 기준으로 생성하면 됩니다.
        </p>
      </div>
    </div>
  </div>
);

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const getAuthRedirectUrl = () => `${window.location.origin}/?auth=confirmed`;

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrapSession = async () => {
      const authUrl = new URL(window.location.href);
      const authCode = authUrl.searchParams.get('code');
      const authStatus = authUrl.searchParams.get('auth');
      const authErrorDescription = authUrl.searchParams.get('error_description') ?? authUrl.searchParams.get('error');

      if (authErrorDescription) {
        setAuthError(decodeURIComponent(authErrorDescription).replace(/\+/g, ' '));
      }

      if (authCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) {
          setAuthError(exchangeError.message);
        }
      }

      if (authStatus === 'confirmed' && !authErrorDescription) {
        setAuthNotice('이메일 인증이 완료되었습니다. 이제 Circle Day에 로그인할 수 있어요.');
      }

      if (authCode || authStatus || authErrorDescription) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError(error.message);
      }
      setSession(data.session);
      setIsAuthLoading(false);
    };

    void bootstrapSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (mode: 'sign-in' | 'sign-up', email: string, password: string) => {
    if (!supabase) {
      return false;
    }

    try {
      setIsAuthSubmitting(true);
      setAuthError(null);
      setAuthNotice(null);

      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        return true;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) {
        throw error;
      }
      if (!data.session) {
        setAuthNotice('가입 신청이 완료되었습니다. 인증 메일을 보냈으니 메일의 확인 링크를 눌러 주세요.');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인을 처리하지 못했습니다.';
      setAuthError(message);
      return false;
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleResendConfirmation = async (email: string) => {
    if (!supabase) {
      return;
    }

    try {
      setAuthError(null);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) {
        throw error;
      }
      setAuthNotice(`${email}로 인증 메일을 다시 보냈습니다. 스팸함도 함께 확인해 주세요.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '인증 메일을 다시 보내지 못했습니다.';
      setAuthError(message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
  };

  if (!isSupabaseConfigured) {
    // Supabase 설정이 없는 로컬 환경에서는 UI 테스트를 위해 가짜 세션으로 앱을 엽니다.
    const mockUser = { email: 'local@test.com', id: 'local-123' } as any;
    return <AppShell user={mockUser} onSignOut={async () => {}} />;
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e8e8ed] text-stone-500">
        <div className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-black/5">
          <Loader2 size={18} className="animate-spin" />
          인증 상태를 확인하는 중...
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <AuthScreen
        onSubmit={handleAuthSubmit}
        onResendConfirmation={handleResendConfirmation}
        isSubmitting={isAuthSubmitting}
        errorMessage={authError}
        noticeMessage={authNotice}
      />
    );
  }

  return <AppShell user={session.user} onSignOut={handleSignOut} />;
};

export default App;
