import React, { useEffect, useRef, useState } from 'react';
import { RoutineState, Task, RoutineScope } from './types';
import { STORAGE_KEYS, loadStoredJson, persistJson } from './utils/storage';
import { INITIAL_ROUTINES, getTodayString, seedTasksForToday, addOrReplaceDateTasks, getRoutineBaseId, getRoutineBucketForDate } from './utils/task';
import RoutineSettingsModal from './components/ui/RoutineSettingsModal';
import DayScheduleView from './components/calendar/DayScheduleView';
import CalendarView from './components/calendar/CalendarView';
import TaskRatingCarousel from './components/ui/TaskRatingCarousel';
import { Home, Calendar as CalendarIcon } from 'lucide-react';
import { syncTaskAlarms, requestNotificationPermissions } from './utils/notifications';
import { timeToMinutes } from './utils/time';

const App = () => {
  const todayStr = getTodayString();
  const [routines, setRoutines] = useState<RoutineState>(() => loadStoredJson(STORAGE_KEYS.routines, INITIAL_ROUTINES));
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>(() => {
    const storedRoutines = loadStoredJson(STORAGE_KEYS.routines, INITIAL_ROUTINES);
    return loadStoredJson(STORAGE_KEYS.tasksByDate, seedTasksForToday(todayStr, storedRoutines));
  });
  const [activeTab, setActiveTab] = useState<'home' | 'calendar'>('home');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingRatingTasks, setPendingRatingTasks] = useState<Task[]>([]);
  const [skippedRatingTaskIds, setSkippedRatingTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    persistJson(STORAGE_KEYS.routines, routines);
  }, [routines]);

  useEffect(() => {
    persistJson(STORAGE_KEYS.tasksByDate, tasksByDate);
    syncTaskAlarms(tasksByDate);
  }, [tasksByDate]);

  useEffect(() => {
    setTasksByDate((current) => addOrReplaceDateTasks(current, todayStr, routines));
  }, [todayStr, routines]);

  useEffect(() => {
    const checkEndedTasks = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const todayTasks = tasksByDate[todayStr] ?? [];
      const endedUnratedTasks = todayTasks.filter(task => {
        if (!task.startTime || !task.duration) return false;
        if (task.rating !== undefined) return false;
        if (skippedRatingTaskIds.has(task.id)) return false;
        
        const taskEndMinutes = timeToMinutes(task.startTime) + task.duration;
        return currentMinutes >= taskEndMinutes;
      });

      if (endedUnratedTasks.length > 0) {
        setPendingRatingTasks(endedUnratedTasks);
      } else {
        setPendingRatingTasks([]);
      }
    };

    checkEndedTasks();
    const interval = setInterval(checkEndedTasks, 60000);
    return () => clearInterval(interval);
  }, [tasksByDate, todayStr, skippedRatingTaskIds]);

  const handleRateTask = (taskId: string, rating: number) => {
    setTasksByDate(current => {
      const todayTasks = current[todayStr] ?? [];
      const nextTasks = todayTasks.map(t => t.id === taskId ? { ...t, rating } : t);
      return { ...current, [todayStr]: nextTasks };
    });
  };

  const handleCloseRating = () => {
    setSkippedRatingTaskIds(new Set([...skippedRatingTaskIds, ...pendingRatingTasks.map(t => t.id)]));
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

export default App;
