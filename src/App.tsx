import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Home, Calendar as CalendarIcon, Loader2, LogOut } from 'lucide-react';
import { RoutineState, Task, RoutineScope } from './types';
import { addOrReplaceDateTasks, getRoutineBaseId, getRoutineBucketForDate, getTodayString } from './utils/task';
import RoutineSettingsModal from './components/ui/RoutineSettingsModal';
import DayScheduleView from './components/calendar/DayScheduleView';
import CalendarView from './components/calendar/CalendarView';
import TaskRatingCarousel from './components/ui/TaskRatingCarousel';
import { syncTaskAlarms, requestNotificationPermissions } from './utils/notifications';
import { timeToMinutes } from './utils/time';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthScreen from './components/auth/AuthScreen';
import { AppStateSnapshot, createDefaultAppState, normalizeAppState } from './utils/appState';
import { loadCachedAppState, loadRemoteAppState, persistCachedAppState, persistRemoteAppState } from './utils/cloudStorage';

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
  const hydrationTokenRef = useRef(0);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    let isActive = true;
    const hydrationToken = hydrationTokenRef.current + 1;
    hydrationTokenRef.current = hydrationToken;
    setIsBootstrapping(true);
    isHydratedRef.current = false;
    setSaveError(null);

    const cachedState = loadCachedAppState(user.id, todayStr);
    if (cachedState && isActive) {
      setRoutines(cachedState.routines);
      setTasksByDate(cachedState.tasksByDate);
      setSkippedRatingTaskIds(new Set(cachedState.skippedRatingTaskIds));
    } else if (isActive) {
      const defaultState = createDefaultAppState(todayStr);
      setRoutines(defaultState.routines);
      setTasksByDate(defaultState.tasksByDate);
      setSkippedRatingTaskIds(new Set(defaultState.skippedRatingTaskIds));
    }

    const hydrate = async () => {
      try {
        const remoteState = await loadRemoteAppState(user.id, todayStr);
        if (!isActive || hydrationTokenRef.current !== hydrationToken) {
          return;
        }
        const normalizedState = normalizeAppState(remoteState, todayStr);
        setRoutines(normalizedState.routines);
        setTasksByDate(normalizedState.tasksByDate);
        setSkippedRatingTaskIds(new Set(normalizedState.skippedRatingTaskIds));
        persistCachedAppState(user.id, normalizedState);
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

    const snapshot: AppStateSnapshot = {
      routines,
      tasksByDate,
      skippedRatingTaskIds: Array.from(skippedRatingTaskIds),
    };

    persistCachedAppState(user.id, snapshot);
    syncTaskAlarms(tasksByDate);

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        await persistRemoteAppState(user.id, snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : '변경사항을 저장하지 못했습니다.';
        setSaveError(message);
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [routines, tasksByDate, skippedRatingTaskIds, user.id]);

  useEffect(() => {
    if (!isHydratedRef.current) {
      return;
    }
    setTasksByDate((current) => addOrReplaceDateTasks(current, todayStr, routines));
  }, [todayStr, routines]);

  useEffect(() => {
    if (!isHydratedRef.current) {
      return;
    }

    const checkEndedTasks = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todayTasks = tasksByDate[todayStr] ?? [];
      const endedUnratedTasks = todayTasks.filter((task) => {
        if (!task.startTime || !task.duration) {
          return false;
        }
        if (task.rating !== undefined) {
          return false;
        }
        if (skippedRatingTaskIds.has(task.id)) {
          return false;
        }

        const taskEndMinutes = timeToMinutes(task.startTime) + task.duration;
        return currentMinutes >= taskEndMinutes;
      });

      setPendingRatingTasks(endedUnratedTasks);
    };

    checkEndedTasks();
    const intervalId = window.setInterval(checkEndedTasks, 60000);
    return () => window.clearInterval(intervalId);
  }, [tasksByDate, todayStr, skippedRatingTaskIds]);

  const handleRateTask = (taskId: string, rating: number) => {
    setTasksByDate((current) => {
      const todayTasks = current[todayStr] ?? [];
      const nextTasks = todayTasks.map((task) => task.id === taskId ? { ...task, rating } : task);
      return { ...current, [todayStr]: nextTasks };
    });
  };

  const handleCloseRating = () => {
    setSkippedRatingTaskIds((current) => new Set([...current, ...pendingRatingTasks.map((task) => task.id)]));
    setPendingRatingTasks([]);
  };

  const updateTasksForDate = (date: string, nextTasks: Task[]) => {
    setTasksByDate((current) => ({ ...current, [date]: nextTasks }));
  };

  const applyRoutineEdit = (
    date: string,
    task: Task,
    updates: Pick<Task, 'title' | 'tags' | 'startTime' | 'duration'>,
    scope: RoutineScope,
  ) => {
    if (scope === 'single') {
      setTasksByDate((current) => ({
        ...current,
        [date]: (current[date] ?? []).map((item) => item.id === task.id ? { ...item, ...updates } : item),
      }));
      return;
    }

    const baseId = getRoutineBaseId(task.id, date);
    if (!baseId) {
      return;
    }
    const bucket = getRoutineBucketForDate(date);

    setRoutines((current) => ({
      ...current,
      [bucket]: current[bucket].map((item) => item.id === baseId ? { ...item, ...updates } : item),
    }));

    setTasksByDate((current) => {
      const next = { ...current };
      (Object.entries(current) as [string, Task[]][]).forEach(([entryDate, entryTasks]) => {
        if (entryDate < date || getRoutineBucketForDate(entryDate) !== bucket) {
          return;
        }
        next[entryDate] = entryTasks.map((item) => {
          const entryBaseId = getRoutineBaseId(item.id, entryDate);
          return entryBaseId === baseId ? { ...item, ...updates } : item;
        });
      });
      return next;
    });
  };

  const applyRoutineDelete = (date: string, task: Task, scope: RoutineScope) => {
    if (scope === 'single') {
      setTasksByDate((current) => ({
        ...current,
        [date]: (current[date] ?? []).filter((item) => item.id !== task.id),
      }));
      return;
    }

    const baseId = getRoutineBaseId(task.id, date);
    if (!baseId) {
      return;
    }
    const bucket = getRoutineBucketForDate(date);

    setRoutines((current) => ({
      ...current,
      [bucket]: current[bucket].filter((item) => item.id !== baseId),
    }));

    setTasksByDate((current) => {
      const next = { ...current };
      (Object.entries(current) as [string, Task[]][]).forEach(([entryDate, entryTasks]) => {
        if (entryDate < date || getRoutineBucketForDate(entryDate) !== bucket) {
          return;
        }
        next[entryDate] = entryTasks.filter((item) => getRoutineBaseId(item.id, entryDate) !== baseId);
      });
      return next;
    });
  };

  const openDate = (date: string) => {
    setTasksByDate((current) => addOrReplaceDateTasks(current, date, routines));
    setSelectedDate(date);
    setActiveTab('calendar');
  };

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] text-stone-500">
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
        onClose={() => setSettingsOpen(false)}
        onSaveRoutines={setRoutines}
      />
      {pendingRatingTasks.length > 0 && (
        <TaskRatingCarousel
          tasks={pendingRatingTasks}
          onRateTask={handleRateTask}
          onClose={handleCloseRating}
        />
      )}

      <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 bg-white/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Supabase Sync</div>
          <div className="truncate text-sm text-stone-600">{user.email}</div>
          {saveError ? <div className="mt-1 text-xs text-rose-600">{saveError}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? <span className="text-xs text-stone-400">저장 중...</span> : null}
          <button
            onClick={() => void onSignOut()}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        {activeTab === 'home' && (
          <DayScheduleView
            date={todayStr}
            tasks={tasksByDate[todayStr] ?? []}
            onOpenSettings={() => setSettingsOpen(true)}
            onTasksChange={(nextTasks) => updateTasksForDate(todayStr, nextTasks)}
            onApplyRoutineEdit={applyRoutineEdit}
            onApplyRoutineDelete={applyRoutineDelete}
          />
        )}

        {activeTab === 'calendar' && selectedDate ? (
          <DayScheduleView
            date={selectedDate}
            tasks={tasksByDate[selectedDate] ?? []}
            onBack={() => setSelectedDate(null)}
            onOpenSettings={() => setSettingsOpen(true)}
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-18 items-center justify-around border-t border-stone-200 bg-white/90 px-2 pb-safe shadow-[0_-12px_25px_rgba(85,72,56,0.08)] backdrop-blur">
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
  <div className="min-h-screen bg-[#f6f6f8] px-6 py-10 text-stone-900">
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

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrapSession = async () => {
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
      return;
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
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      if (!data.session) {
        setAuthNotice('회원가입이 완료되었습니다. 이메일 확인이 필요하면 메일함에서 인증을 완료한 뒤 로그인해 주세요.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인을 처리하지 못했습니다.';
      setAuthError(message);
    } finally {
      setIsAuthSubmitting(false);
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
    return <SupabaseConfigNotice />;
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] text-stone-500">
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
        isSubmitting={isAuthSubmitting}
        errorMessage={authError}
        noticeMessage={authNotice}
      />
    );
  }

  return <AppShell user={session.user} onSignOut={handleSignOut} />;
};

export default App;
