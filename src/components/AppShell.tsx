import React from 'react';
import type { User } from '@supabase/supabase-js';
import { useAppState } from '../hooks/useAppState';
import { getTodayString } from '../utils/task';
import { Icon } from './ui/Icon';
import RoutineSettingsModal from './ui/RoutineSettingsModal';
import TaskRatingCarousel from './ui/TaskRatingCarousel';
import DayScheduleView from './calendar/DayScheduleView';
import CalendarView from './calendar/CalendarView';

export const AppShell = ({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => Promise<void>;
}) => {
  const todayStr = getTodayString();
  const {
    routines,
    tasksByDate,
    backlogTasks,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    settingsOpen,
    setSettingsOpen,
    pendingRatingTasks,
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
    addBacklogTask,
    removeBacklogTask,
    handleEnableNotifications,
    handleDisableNotifications,
  } = useAppState(user, todayStr);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0f4] text-stone-500">
        <div className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-black/5">
          <Icon name="progress_activity" size={18} className="animate-spin" />
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f0f4] text-stone-900">
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
        onEnableNotifications={handleEnableNotifications}
        onDisableNotifications={handleDisableNotifications}
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
            key={`home-${todayStr}`}
            date={todayStr}
            tasks={tasksByDate[todayStr] ?? []}
            tasksByDate={tasksByDate}
            onOpenSettings={() => setSettingsOpen(true)}
            onPreviousDate={() => moveToDate(todayStr, -1)}
            onNextDate={() => moveToDate(todayStr, 1)}
            onTasksChange={(nextTasks) => updateTasksForDate(todayStr, nextTasks)}
            onApplyRoutineEdit={applyRoutineEdit}
            onApplyRoutineDelete={applyRoutineDelete}
            backlogTasks={backlogTasks}
            onAddBacklogTask={addBacklogTask}
            onRemoveBacklogTask={removeBacklogTask}
          />
        )}

        {activeTab === 'calendar' && selectedDate ? (
          <DayScheduleView
            key={`calendar-${selectedDate}`}
            date={selectedDate}
            tasks={tasksByDate[selectedDate] ?? []}
            tasksByDate={tasksByDate}
            onOpenSettings={() => setSettingsOpen(true)}
            onPreviousDate={() => moveToDate(selectedDate, -1)}
            onNextDate={() => moveToDate(selectedDate, 1)}
            onTasksChange={(nextTasks) => updateTasksForDate(selectedDate, nextTasks)}
            onApplyRoutineEdit={applyRoutineEdit}
            onApplyRoutineDelete={applyRoutineDelete}
            backlogTasks={backlogTasks}
            onAddBacklogTask={addBacklogTask}
            onRemoveBacklogTask={removeBacklogTask}
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

      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around bg-white/90 px-2 shadow-[0_-12px_25px_rgba(85,72,56,0.04)] backdrop-blur">
        <button
          onClick={() => {
            setActiveTab('home');
            setSelectedDate(null);
          }}
          className={`flex w-full flex-col items-center gap-1 py-3 ${activeTab === 'home' ? 'text-blue-500' : 'text-stone-400'}`}
        >
          <Icon name="home" size={22} />
          <span className="text-xs tracking-[0.2em]">오늘</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('calendar');
            if (selectedDate) {
              setSelectedDate(null);
            }
          }}
          className={`flex w-full flex-col items-center gap-1 py-3 ${activeTab === 'calendar' ? 'text-blue-500' : 'text-stone-400'}`}
        >
          <Icon name="calendar_today" size={22} />
          <span className="text-xs tracking-[0.2em]">달력</span>
        </button>
      </nav>
    </div>
  );
};

export default AppShell;
