import React, { useEffect, useRef, useState } from 'react';
import { RoutineState, Tag, Task } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/time';
import { getTaskTonePillClass, getTaskToneLabel, QuadrantBadge } from '../../utils/task';
import { Clock, LogOut, Trash2, X } from 'lucide-react';

export const RoutineSettingsModal = ({
  isOpen,
  routines,
  userEmail,
  saveError,
  isSaving,
  onClose,
  onSaveRoutines,
  onSignOut,
}: {
  isOpen: boolean;
  routines: RoutineState;
  userEmail: string | null;
  saveError: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSaveRoutines: (routines: RoutineState) => void;
  onSignOut: () => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend'>('weekday');
  const [draft, setDraft] = useState<RoutineState>(routines);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraft(routines);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
    setActiveTab('weekday');
  }, [isOpen, routines]);

  if (!isOpen) {
    return null;
  }

  const toggleTag = (tag: Tag) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const handleAdd = () => {
    if (!title.trim() || !startTime || !endTime) {
      return;
    }
    const start = timeToMinutes(startTime);
    let duration = timeToMinutes(endTime) - start;
    if (duration <= 0) {
      duration += 1440;
    }
    const nextTask: Task = {
      id: `routine-editor-${Date.now()}`,
      title: title.trim(),
      tags,
      startTime,
      duration,
      completed: false,
      isRoutine: true,
    };
    const nextTasks = [...draft[activeTab], nextTask].sort((left, right) => timeToMinutes(left.startTime ?? '00:00') - timeToMinutes(right.startTime ?? '00:00'));
    setDraft({ ...draft, [activeTab]: nextTasks });
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
  };

  const handleDelete = (id: string) => {
    setDraft((current) => ({ ...current, [activeTab]: current[activeTab].filter((task) => task.id !== id) }));
  };

  return (
    <div className="modal-backdrop items-center" onClick={onClose}>
      <div className="action-sheet h-[92vh] !w-full !max-w-4xl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-hand text-3xl text-stone-800">루틴 보관함</h2>
              <p className="text-sm text-stone-500">평일과 주말의 기본 루틴을 관리합니다.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-rose-500">
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">계정</div>
                <div className="truncate text-sm text-stone-600">{userEmail ?? '로그인됨'}</div>
                {saveError ? <div className="mt-1 text-xs text-rose-600">{saveError}</div> : null}
                {isSaving ? <div className="mt-1 text-xs text-stone-400">저장 중...</div> : null}
              </div>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
            <button
              onClick={() => setActiveTab('weekday')}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${activeTab === 'weekday' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              평일
            </button>
            <button
              onClick={() => setActiveTab('weekend')}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${activeTab === 'weekend' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              주말
            </button>
          </div>
        </div>
        <div className="grid h-[calc(92vh-250px)] grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-y-auto border-b border-stone-200 p-5 md:border-b-0 md:border-r">
            <div className="space-y-2.5">
              {draft[activeTab].map((task) => (
                <div
                  key={task.id}
                  className="task-card block w-full rounded-[0.75rem] bg-white px-4 py-3.5 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <QuadrantBadge task={task} />
                        <span className={`truncate text-[1.03rem] font-semibold tracking-[-0.03em] ${task.completed ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                          {task.title}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[12px] text-stone-400">
                        <Clock size={12} className="shrink-0" />
                        {task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '시간 미지정'}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.02em] ${getTaskTonePillClass(task)}`}>
                          {getTaskToneLabel(task)}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(task.id)} className="rounded-full p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto bg-white p-5">
            <h3 className="font-hand text-2xl text-stone-700">루틴 블록 추가</h3>
            <div className="mt-4 space-y-4">
              <input
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-500"
                placeholder="일정 이름"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
                  <div className="mb-1">시작</div>
                  <input type="time" className="time-field" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </label>
                <label className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
                  <div className="mb-1">종료</div>
                  <input type="time" className="time-field" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => toggleTag('urgent')} className={`rounded-2xl border px-4 py-3 text-left ${tags.includes('urgent') ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                  긴급
                </button>
                <button onClick={() => toggleTag('important')} className={`rounded-2xl border px-4 py-3 text-left ${tags.includes('important') ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                  중요
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!title.trim() || !startTime || !endTime}
                className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                블록 추가
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-200 px-5 py-4">
          <button onClick={onClose} className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-700">
            취소
          </button>
          <button
            onClick={() => {
              onSaveRoutines(draft);
              onClose();
            }}
            className="rounded-2xl bg-amber-400 px-4 py-3 text-stone-900"
          >
            루틴 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoutineSettingsModal;
