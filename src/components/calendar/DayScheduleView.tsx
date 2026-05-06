import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag, RoutineScope, RoutineAction } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/time';
import { getTaskColor, getTaskTonePillClass, getTaskToneLabel } from '../../utils/task';
import { formatDateLabel } from '../../utils/task';
import TaskActionSheet from '../ui/TaskActionSheet';
import RoutineActionModal from '../ui/RoutineActionModal';
import DayTaskEditorModal from '../ui/DayTaskEditorModal';
import CircleScheduler from '../scheduler/CircleScheduler';
import { ChevronLeft, Plus, Settings, Clock, Lock, Zap } from 'lucide-react';

export const DayScheduleView = ({
  date,
  tasks,
  onBack,
  onOpenSettings,
  onTasksChange,
  onApplyRoutineEdit,
  onApplyRoutineDelete,
}: {
  date: string;
  tasks: Task[];
  onBack?: () => void;
  onOpenSettings: () => void;
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
  const [routineEditScope, setRoutineEditScope] = useState<RoutineScope>('single');

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

  const addTask = (nextTitle: string, nextTags: Tag[], nextStartTime: string, duration: number) => {
    onTasksChange([...tasks, {
      id: `task-${Date.now()}`,
      title: nextTitle,
      tags: nextTags,
      startTime: nextStartTime,
      duration,
      completed: false,
      isRoutine: false,
    }]);
  };

  const updateTask = (updatedTask: Task) => {
    onTasksChange(tasks.map((task) => task.id === updatedTask.id ? updatedTask : task));
  };

  const deleteTask = (id: string) => {
    onTasksChange(tasks.filter((task) => task.id !== id));
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setTags(task.tags);
    setStartTime(task.startTime ?? '');
    setEndTime(task.startTime && task.duration ? minutesToTime(timeToMinutes(task.startTime) + task.duration) : '');
    setEditorOpen(true);
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      return;
    }
    const start = timeToMinutes(startTime);
    let duration = timeToMinutes(endTime) - start;
    if (duration <= 0) {
      duration += 1440;
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
        if (current.isRoutine && routineEditScope === 'future') {
          onApplyRoutineEdit(date, current, nextValues, 'future');
        } else {
          updateTask({
            ...current,
            ...nextValues,
          });
        }
      }
    } else {
      addTask(title.trim(), tags, startTime, duration);
    }
    resetForm();
    setEditorOpen(false);
  };

  return (
    <section className="flex h-full flex-col bg-[#f6f6f8]">
      <TaskActionSheet
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onToggleComplete={(task) => {
          const nextTask = { ...task, completed: !task.completed };
          updateTask(nextTask);
          setSheetTask(nextTask);
        }}
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
            setRoutineEditScope(scope);
            startEditing(task);
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

      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 md:px-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full border border-stone-300 bg-white p-2 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="font-hand text-3xl text-stone-800 md:text-4xl">{formatDateLabel(date)}</h1>
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
            onAddTask={addTask}
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
                  <button
                    key={task.id}
                    onClick={() => setSheetTask(task)}
                    className="task-card block w-full rounded-[0.75rem] bg-white px-4 py-3.5 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: task.completed ? '#d4d4d4' : getTaskColor(task.tags) }}
                          />
                          <span className={`truncate text-[1.03rem] font-semibold tracking-[-0.03em] ${task.completed ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-stone-400">
                          <Clock size={12} className="shrink-0" />
                          {task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '시간 미지정'}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.02em] ${getTaskTonePillClass(task)}`}>
                          {getTaskToneLabel(task)}
                        </span>
                        {task.isRoutine ? <Lock size={13} className="text-stone-300" /> : <Zap size={13} className="text-stone-300" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DayScheduleView;
