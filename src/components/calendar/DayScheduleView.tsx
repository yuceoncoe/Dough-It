import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag, RoutineScope, RoutineAction } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/time';
import { getTaskColor, getTaskTonePillClass, getTaskToneLabel } from '../../utils/task';
import { formatDateLabel, getTodayString } from '../../utils/task';
import TaskActionSheet from '../ui/TaskActionSheet';
import RoutineActionModal from '../ui/RoutineActionModal';
import DayTaskEditorModal from '../ui/DayTaskEditorModal';
import CircleScheduler from '../scheduler/CircleScheduler';
import TaskReportModal from '../ui/TaskReportModal';
import { ChevronLeft, ChevronRight, Plus, Settings, Clock, Trash2 } from 'lucide-react';
import { QuadrantBadge, getMaxOverlap } from '../../utils/task';
import { getTaskReport } from '../../utils/report';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';



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
  const [showRoutines, setShowRoutines] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingRoutineAction, setPendingRoutineAction] = useState<{ action: RoutineAction; task: Task } | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [routineEditScope, setRoutineEditScope] = useState<RoutineScope>('single');
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const swipeStartRef = useRef<{ id: string; x: number; y: number; isHorizontal: boolean | null } | null>(null);
  const swipeCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const isToday = date === getTodayString();
  const isPastDate = date < getTodayString();
  const report = getTaskReport(tasks);
  const hasOpenOverlay = Boolean(sheetTask || editorOpen || pendingRoutineAction || pendingDeleteTask || reportOpen);
  useBodyScrollLock(hasOpenOverlay);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000);
  };

  const sortedTasks = tasks
    .filter((task) => showRoutines || !task.isRoutine)
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

  const toggleTag = (tag: Tag) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
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
    setSwipedTaskId(null);
    if (task.isRoutine) {
      setPendingRoutineAction({ action: 'delete', task });
      return;
    }
    setPendingDeleteTask(task);
  };

  const setSwipeCardOffset = (taskId: string, offset: number, animated: boolean) => {
    const card = swipeCardRefs.current[taskId];
    if (!card) {
      return;
    }
    card.style.transition = animated ? 'transform 180ms ease' : 'none';
    card.style.transform = `translateX(${offset}px)`;
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
            completed: rating !== undefined,
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
      {pendingDeleteTask ? (
        <div className="modal-backdrop" onClick={() => setPendingDeleteTask(null)}>
          <div className="action-sheet max-w-md" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-hand text-2xl text-stone-800">일정 삭제</h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              <span className="font-semibold text-stone-700">{pendingDeleteTask.title}</span>
              {' '}일정을 삭제할까요?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteTask(null)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTask(pendingDeleteTask.id);
                  setPendingDeleteTask(null);
                }}
                className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onPreviousDate}
              className="rounded-full border border-stone-300 bg-white p-2 text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
              aria-label="전일로 이동"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="font-hand min-w-0 whitespace-nowrap text-2xl text-stone-800 md:text-3xl">{formatDateLabel(date)}</h1>
            <button
              type="button"
              onClick={onNextDate}
              className="rounded-full border border-stone-300 bg-white p-2 text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
              aria-label="후일로 이동"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setEditorOpen(true);
            }}
            className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
            aria-label="빠른 일정 추가"
          >
            <Plus size={18} />
          </button>
          <button onClick={onOpenSettings} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-visible px-4 pb-4 md:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-h-[45vh] overflow-hidden">
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-stone-900">일정 목록</h2>
              </div>
              <button onClick={() => setShowRoutines((current) => !current)} className="inline-flex h-9 min-w-[100px] items-center justify-center rounded-full bg-white px-4 py-2 text-[10px] font-medium text-stone-500 shadow-[0_1px_8px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
                {showRoutines ? '루틴숨기기' : '루틴보기'}
              </button>
            </div>

            <div className="overflow-y-auto pb-safe">
              <div className="space-y-2.5">
                {sortedTasks.length === 0 && (
                  <div className="task-card rounded-[1.4rem] bg-white px-4 py-6 text-center text-stone-400">
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
                      className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-xl bg-rose-500 text-white"
                      aria-label={`${task.title} 삭제`}
                    >
                      <Trash2 size={20} />
                    </button>
                    <button
                      onClick={() => {
                        if (swipedTaskId === task.id) {
                          setSwipedTaskId(null);
                          return;
                        }
                        setSheetTask(task);
                      }}
                      onPointerDown={(event) => {
                        setSwipeCardOffset(task.id, swipedTaskId === task.id ? -80 : 0, false);
                        swipeStartRef.current = { id: task.id, x: event.clientX, y: event.clientY, isHorizontal: null };
                      }}
                      onPointerMove={(event) => {
                        const start = swipeStartRef.current;
                        if (!start || start.id !== task.id) {
                          return;
                        }
                        const deltaX = event.clientX - start.x;
                        const deltaY = event.clientY - start.y;
                        if (start.isHorizontal === null) {
                          if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
                            return;
                          }
                          start.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
                        }
                        if (!start.isHorizontal) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        const baseOffset = swipedTaskId === task.id ? -80 : 0;
                        const nextOffset = Math.max(-96, Math.min(0, baseOffset + deltaX));
                        setSwipeCardOffset(task.id, nextOffset, false);
                      }}
                      onPointerUp={(event) => {
                        const start = swipeStartRef.current;
                        swipeStartRef.current = null;
                        if (!start || start.id !== task.id) {
                          return;
                        }
                        const deltaX = event.clientX - start.x;
                        const deltaY = event.clientY - start.y;
                        if (!start.isHorizontal && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        const baseOffset = swipedTaskId === task.id ? -80 : 0;
                        const currentOffset = Math.max(-96, Math.min(0, baseOffset + deltaX));
                        const shouldOpen = currentOffset <= -42;
                        setSwipedTaskId(shouldOpen ? task.id : null);
                        setSwipeCardOffset(task.id, shouldOpen ? -80 : 0, true);
                      }}
                      onPointerCancel={() => {
                        swipeStartRef.current = null;
                        setSwipeCardOffset(task.id, swipedTaskId === task.id ? -80 : 0, true);
                      }}
                      ref={(node) => {
                        swipeCardRefs.current[task.id] = node;
                      }}
                      className="task-card relative block w-full rounded-xl bg-white px-4 py-3.5 text-left"
                      style={{
                        transform: `translateX(${swipedTaskId === task.id ? -80 : 0}px)`,
                        touchAction: 'pan-y',
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex shrink-0 items-center">
                          <QuadrantBadge task={task} sizeClassName="h-[32px] w-[32px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block truncate text-[1.03rem] font-semibold tracking-[-0.03em] ${task.completed ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                            {task.title}
                          </span>
                          <div className="mt-1 flex items-center gap-2 text-[12px] text-stone-400">
                            <Clock size={12} className="shrink-0" />
                            {task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '시간 미지정'}
                          </div>
                          {task.note ? (
                            <div className="mt-1 truncate text-[12px] font-medium text-stone-400">
                              {task.note}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {!task.completed ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.02em] ${getTaskTonePillClass(task)}`}>
                              {getTaskToneLabel(task)}
                            </span>
                          ) : null}
                          {task.rating !== undefined && <span className="whitespace-nowrap text-xs font-bold text-amber-500">⭐️ {task.rating}</span>}
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
