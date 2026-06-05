import React, { useEffect, useState, useRef } from 'react';
import { Task, Tag, RoutineScope, RoutineAction } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/time';
import { getTaskColor, getTaskTonePillClass, getTaskToneLabel } from '../../utils/task';
import { formatDateLabel, getTodayString } from '../../utils/task';
import TaskActionSheet from '../ui/TaskActionSheet';
import RoutineActionModal from '../ui/RoutineActionModal';
import DayTaskEditorModal from '../ui/DayTaskEditorModal';
import CircleScheduler from '../scheduler/CircleScheduler';
import TaskReportModal from '../ui/TaskReportModal';
import ConfirmModal from '../ui/ConfirmModal';
import { Icon } from '../../components/ui/Icon';
import { QuadrantBadge, getMaxOverlap } from '../../utils/task';
import { getTaskReport } from '../../utils/report';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';
import { useSwipeCard } from '../../hooks/useSwipeCard';

export const DayScheduleView = ({
  date,
  tasks,
  tasksByDate,
  onOpenSettings,
  onPreviousDate,
  onNextDate,
  onTasksChange,
  onApplyRoutineEdit,
  onApplyRoutineDelete,
}: {
  key?: React.Key;
  date: string;
  tasks: Task[];
  tasksByDate: Record<string, Task[]>;
  onOpenSettings: () => void;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onTasksChange: (tasks: Task[]) => void;
  onApplyRoutineEdit: (date: string, task: Task, updates: Pick<Task, 'title' | 'tags' | 'startTime' | 'duration'>, scope: RoutineScope) => void;
  onApplyRoutineDelete: (date: string, task: Task, scope: RoutineScope) => void;
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeFilters, setActiveFilters] = useState({
    routine: true,
    general: true,
    important: true,
    urgent: true,
    urgentImportant: true,
  });
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingRoutineAction, setPendingRoutineAction] = useState<{ action: RoutineAction; task: Task } | null>(null);
  const [routineEditScope, setRoutineEditScope] = useState<RoutineScope>('single');
  const [reportOpen, setReportOpen] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [now, setNow] = useState(() => new Date());

  const {
    swipedTaskId,
    registerCardRef,
    getPointerHandlers,
    getCardStyle,
    resetSwipe,
  } = useSwipeCard();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);
  const isToday = date === getTodayString();
  const isPastDate = date < getTodayString();
  const report = getTaskReport(tasks);
  const hasOpenOverlay = Boolean(sheetTask || editorOpen || pendingRoutineAction || reportOpen || pendingDeleteTask);
  useBodyScrollLock(hasOpenOverlay);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000);
  };

  const sortedTasks = tasks
    .filter((task) => {
      if (task.isRoutine && !activeFilters.routine) return false;
      
      const isImportant = task.tags?.includes('important');
      const isUrgent = task.tags?.includes('urgent');

      if (isImportant && isUrgent) return activeFilters.urgentImportant;
      if (isImportant) return activeFilters.important;
      if (isUrgent) return activeFilters.urgent;
      
      return activeFilters.general;
    })
    .sort((left, right) => {
      if (!!left.startTime !== !!right.startTime) {
        return left.startTime ? -1 : 1;
      }
      if (!left.startTime || !right.startTime) {
        return 0;
      }
      return timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    });

  useEffect(() => {
    if (!isToday) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(intervalId);
  }, [isToday]);

  useEffect(() => {
    if (date !== getTodayString() || report.completedCount === 0) {
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const midnightOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

    const hasPassedMidnight = now.getTime() >= midnightOfNextDay.getTime();
    const storageKey = `circle-day:report-shown:${date}`;

    if (!hasPassedMidnight || window.localStorage.getItem(storageKey) === 'true') {
      return;
    }

    window.localStorage.setItem(storageKey, 'true');
    setReportOpen(true);
  }, [date, now, report.completedCount]);

  const resetForm = () => {
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
    setEditingId(null);
    setRoutineEditScope('single');
  };

  const closeEditor = () => {
    setEditorOpen(false);
    resetForm();
  };

  const addTask = (nextTitle: string, nextTags: Tag[], nextStartTime: string, duration: number): boolean => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: nextTitle,
      tags: nextTags,
      startTime: nextStartTime,
      duration,
      completed: false,
      isRoutine: false,
    };
    if (getMaxOverlap([...tasks, newTask]) > 2) {
      showToast('알림은 한 번에 2개까지만 가능해요!');
      return false;
    }
    onTasksChange([...tasks, newTask]);
    return true;
  };

  const updateTask = (updatedTask: Task) => {
    onTasksChange(tasks.map((task) => task.id === updatedTask.id ? updatedTask : task));
  };

  const deleteTask = (id: string) => {
    onTasksChange(tasks.filter((task) => task.id !== id));
  };

  const requestDeleteTask = (task: Task) => {
    resetSwipe(task.id);
    if (task.isRoutine) {
      setPendingRoutineAction({ action: 'delete', task });
      return;
    }
    setPendingDeleteTask(task);
  };

  const startEditing = (task: Task, scope: RoutineScope = 'single') => {
    setEditingId(task.id);
    setTitle(task.title);
    setTags(Array.isArray(task.tags) ? task.tags : []);
    setStartTime(task.startTime ?? '');
    setEndTime(task.startTime && task.duration ? minutesToTime(timeToMinutes(task.startTime) + task.duration) : '');
    setRoutineEditScope(scope);
    setEditorOpen(true);
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      return;
    }
    const start = timeToMinutes(startTime);
    const duration = timeToMinutes(endTime) - start;
    if (duration <= 0) {
      showToast('종료 시간이 시작 시간보다 더 뒤여야 해요.');
      return;
    }

    if (editingId) {
      const current = tasks.find((task) => task.id === editingId);
      if (current) {
        const nextValues = {
          title: title.trim(),
          tags,
          startTime,
          duration,
        };
        const updatedTask = { ...current, ...nextValues };
        if (getMaxOverlap(tasks.map((task) => task.id === editingId ? updatedTask : task)) > 2) {
          showToast('알림은 한 번에 2개까지만 가능해요!');
          return;
        }
        if (current.isRoutine && routineEditScope === 'future') {
          onApplyRoutineEdit(date, current, nextValues, 'future');
        } else {
          updateTask(updatedTask);
        }
      }
    } else {
      const added = addTask(title.trim(), tags, startTime, duration);
      if (!added) return;
    }
    resetForm();
    setEditorOpen(false);
  };

  return (
    <section className="flex h-full flex-col bg-[#f0f0f4]">
      <TaskActionSheet
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onEdit={(task) => {
          if (task.isRoutine) {
            setPendingRoutineAction({ action: 'edit', task });
          } else {
            startEditing(task);
            setSheetTask(null);
          }
        }}
        onDelete={(task) => {
          if (task.isRoutine) {
            setPendingRoutineAction({ action: 'delete', task });
          } else {
            deleteTask(task.id);
            setSheetTask(null);
          }
        }}
        onSetRating={(task, rating) => {
          const nextTask = {
            ...task,
            rating,
            completed: rating !== undefined && rating !== 0,
          };
          updateTask(nextTask);
          setSheetTask(nextTask);
        }}
        onUpdateNote={(task, note) => {
          const nextTask = {
            ...task,
            note: note.trim() ? note : undefined,
          };
          updateTask(nextTask);
          setSheetTask(nextTask);
        }}
      />
      <TaskReportModal
        isOpen={reportOpen}
        date={date}
        tasks={tasks}
        tasksByDate={tasksByDate}
        onClose={() => setReportOpen(false)}
        onTaskClick={(task) => setSheetTask(task)}
      />
      <ConfirmModal
        isOpen={pendingDeleteTask !== null}
        message={`'${pendingDeleteTask?.title}' 일정을 정말 삭제하시겠습니까?`}
        isDestructive={true}
        confirmLabel="삭제"
        onConfirm={() => {
          if (pendingDeleteTask) {
            deleteTask(pendingDeleteTask.id);
          }
        }}
        onClose={() => setPendingDeleteTask(null)}
      />
      <RoutineActionModal
        isOpen={pendingRoutineAction !== null}
        action={pendingRoutineAction?.action ?? null}
        taskTitle={pendingRoutineAction?.task.title ?? ''}
        onClose={() => setPendingRoutineAction(null)}
        onSelectScope={(scope) => {
          if (!pendingRoutineAction) {
            return;
          }
          const { action, task } = pendingRoutineAction;
          setPendingRoutineAction(null);
          setSheetTask(null);
          if (action === 'edit') {
            startEditing(task, scope);
            return;
          }
          if (action === 'delete') {
            if (scope === 'future') {
              onApplyRoutineDelete(date, task, 'future');
            } else {
              deleteTask(task.id);
            }
          }
        }}
      />
      <DayTaskEditorModal
        isOpen={editorOpen}
        title={title}
        startTime={startTime}
        endTime={endTime}
        tags={tags}
        isEditing={editingId !== null}
        onClose={closeEditor}
        onTitleChange={setTitle}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        onSetTags={setTags}
        onSubmit={submitForm}
      />

      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-stone-200/0 bg-[#f0f0f4]/95 px-4 pb-3 pt-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreviousDate}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
            aria-label="전일로 이동"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <h1 className="font-hand min-w-0 whitespace-nowrap text-2xl text-stone-800 md:text-3xl">{formatDateLabel(date)}</h1>
          <button
            type="button"
            onClick={onNextDate}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
            aria-label="후일로 이동"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setEditorOpen(true);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
            aria-label="빠른 일정 추가"
          >
            <Icon name="add" size={18} />
          </button>
          <button onClick={onOpenSettings} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-visible px-4 pb-4 md:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-h-[50vh] overflow-hidden">
          <CircleScheduler
            tasks={tasks}
            tasksByDate={tasksByDate}
            date={date}
            onAddTask={addTask}
            showCurrentTime={isToday}
            centerAction={isPastDate ? {
              label: '보고서 보기',
              onClick: () => setReportOpen(true),
            } : undefined}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-visible">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between gap-3 relative">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-stone-900">일정 목록</h2>
              </div>
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)} 
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200/50"
                  aria-label="필터"
                >
                  <Icon name="filter_list" size={20} />
                  {(!activeFilters.routine || !activeFilters.general || !activeFilters.important || !activeFilters.urgent || !activeFilters.urgentImportant) && (
                    <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  )}
                </button>
                {filterDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl border border-stone-100 bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[100]">
                    {[
                      { key: 'routine', label: '루틴' },
                      { key: 'divider', isDivider: true },
                      { key: 'general', label: '일반', tags: [] },
                      { key: 'important', label: '중요', tags: ['important'] },
                      { key: 'urgent', label: '긴급', tags: ['urgent'] },
                      { key: 'urgentImportant', label: '긴급+중요', tags: ['urgent', 'important'] }
                    ].map((filter) => 
                      filter.isDivider ? (
                        <div key={filter.key} className="mx-2 my-1 border-t border-stone-100" />
                      ) : (
                      <label key={filter.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-stone-50">
                        <input 
                          type="checkbox" 
                          className="h-[18px] w-[18px] cursor-pointer accent-stone-800 shrink-0"
                          checked={activeFilters[filter.key as keyof typeof activeFilters]}
                          onChange={(e) => setActiveFilters(prev => ({ ...prev, [filter.key]: e.target.checked }))}
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-medium text-stone-700">{filter.label}</span>
                          {filter.tags && (
                            <QuadrantBadge task={{ tags: filter.tags as Tag[] } as Task} sizeClassName="h-[12px] w-[12px]" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-y-auto pb-safe">
              <div className="space-y-2.5">
                {sortedTasks.length === 0 && (
                  <div className="task-card rounded-xl bg-white px-4 py-6 text-center text-stone-400">
                    아직 이 날짜에 등록된 일정이 없습니다.
                  </div>
                )}
                {sortedTasks.map((task) => (
                  <div key={task.id} className="relative overflow-hidden rounded-xl">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDeleteTask(task);
                      }}
                      className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-xl bg-transparent text-rose-500"
                      aria-label={`${task.title} 삭제`}
                    >
                      <Icon name="delete" size={20} />
                    </button>
                    <button
                      onClick={() => {
                        if (swipedTaskId === task.id) {
                          resetSwipe(task.id);
                          return;
                        }
                        setSheetTask(task);
                      }}
                      {...getPointerHandlers(task.id)}
                      ref={registerCardRef(task.id)}
                      className="task-card relative block w-full rounded-xl bg-white px-4 py-3.5 text-left"
                      style={getCardStyle(task.id)}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex shrink-0 items-center">
                          <QuadrantBadge task={task} sizeClassName="h-[32px] w-[32px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] font-semibold tracking-[-0.03em] ${task.completed || task.rating === 0 ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                            {task.title}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-stone-400">
                            <Icon name="schedule" size={12} className="shrink-0" />
                            {task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '시간 미지정'}
                          </div>
                          {task.note ? (
                            <div className="mt-1 truncate text-[12px] font-medium text-stone-400">
                              {task.note}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {!task.completed && task.rating !== 0 ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.02em] ${getTaskTonePillClass(task)}`}>
                              {getTaskToneLabel(task)}
                            </span>
                          ) : null}
                          {task.rating !== undefined && (
                            <span className="flex items-center whitespace-nowrap text-xs font-bold">
                              {task.rating === 0 ? (
                                <>
                                  <Icon name="close" size={13} className="mr-0.5 text-rose-500 [font-variation-settings:'wght'_700]" />
                                  <span className="text-rose-500">0</span>
                                </>
                              ) : (
                                <>
                                  <Icon name="star" size={15} className="mr-0.5 text-amber-400 [font-variation-settings:'FILL'_1]" />
                                  <span className="text-amber-500">{task.rating}</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap animate-[fade-in_200ms_ease-out] rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-white shadow-xl sm:bottom-8">
          {toastMessage}
        </div>
      )}
    </section>
  );
};

export default DayScheduleView;
