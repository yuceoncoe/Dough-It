import React, { useEffect, useRef, useState } from 'react';
import { RoutineState, Tag, Task } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/time';
import { getTaskTonePillClass, getTaskToneLabel, QuadrantBadge, getToneSelectionKey, getToneTags, getMaxOverlap } from '../../utils/task';
import { Icon } from '../../components/ui/Icon';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

export const RoutineSettingsModal = ({
  isOpen,
  routines,
  userEmail,
  saveError,
  isSaving,
  notificationStatus,
  notificationMessage,
  onClose,
  onSaveRoutines,
  onSignOut,
  onEnableNotifications,
}: {
  isOpen: boolean;
  routines: RoutineState;
  userEmail: string | null;
  saveError: string | null;
  isSaving: boolean;
  notificationStatus: 'idle' | 'enabled' | 'unsupported' | 'denied' | 'error';
  notificationMessage: string | null;
  onClose: () => void;
  onSaveRoutines: (routines: RoutineState) => void;
  onSignOut: () => Promise<void>;
  onEnableNotifications: () => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'weekday' | 'weekend'>('main');
  const [draft, setDraft] = useState<RoutineState>(routines);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isEnabling, setIsEnabling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);
  useBodyScrollLock(isOpen);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = true;
    setDraft(routines);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
    setActiveTab('main');
    setPendingDeleteTask(null);
  }, [isOpen, routines]);

  if (!isOpen) {
    return null;
  }

  const handleAdd = (explicitTags?: Tag[]) => {
    if (!title.trim() || !startTime || !endTime) {
      return;
    }
    const finalTags = explicitTags ?? tags;
    const start = timeToMinutes(startTime);
    const duration = timeToMinutes(endTime) - start;
    if (duration <= 0) {
      showToast('종료 시간이 시작 시간보다 더 뒤여야 해요.');
      return;
    }
    const nextTask: Task = {
      id: `routine-editor-${Date.now()}`,
      title: title.trim(),
      tags: finalTags,
      startTime,
      duration,
      completed: false,
      isRoutine: true,
    };
    const currentTab = activeTab === 'main' ? 'weekday' : activeTab;
    const currentTasks = Array.isArray(draft[currentTab]) ? draft[currentTab] : [];
    if (getMaxOverlap([...currentTasks, nextTask]) > 2) {
      showToast('알림은 한 번에 2개까지만 가능해요!');
      return;
    }
    const nextTasks = [...currentTasks, nextTask].sort((left, right) => timeToMinutes(left.startTime ?? '00:00') - timeToMinutes(right.startTime ?? '00:00'));
    const nextDraft = { ...draft, [currentTab]: nextTasks };
    setDraft(nextDraft);
    onSaveRoutines(nextDraft);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
  };

  const handleTagSelect = (selectedTags: Tag[]) => {
    setTags(selectedTags);
  };

  const handleDelete = (id: string) => {
    const currentTab = activeTab === 'main' ? 'weekday' : activeTab;
    const nextDraft = { ...draft, [currentTab]: draft[currentTab].filter((task) => task.id !== id) };
    setDraft(nextDraft);
    onSaveRoutines(nextDraft);
    setPendingDeleteTask(null);
  };

  const notificationLabel = {
    idle: '푸쉬 알림 켜기',
    enabled: '푸쉬 알림 켜짐',
    unsupported: '알림 미지원',
    denied: '알림 차단됨',
    error: '알림 설정 실패',
  }[notificationStatus];

  const handleEnableNotifications = async () => {
    if (isEnabling || notificationStatus === 'enabled') return;
    setIsEnabling(true);
    try {
      await onEnableNotifications();
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {activeTab === 'main' ? (
        <div className="action-sheet mx-auto flex h-auto w-full max-w-md flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
          <div className="shrink-0 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <h2 className="font-hand truncate text-2xl text-stone-800">설정</h2>
              </div>
              <button onClick={onClose} className="sheet-icon-button shrink-0" aria-label="닫기">
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto bg-white p-5 space-y-6">
            <section>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">프로필 정보</h3>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="truncate text-sm font-medium text-stone-700">{userEmail ?? '로그인됨'}</div>
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                  >
                    <Icon name="logout" size={14} />
                    로그아웃
                  </button>
                </div>
                {saveError && <div className="mt-2 text-xs text-rose-600">{saveError}</div>}
                {isSaving && <div className="mt-2 text-xs text-stone-400">저장 중...</div>}
              </div>
            </section>

            <section>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">푸시 알림</h3>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-stone-700">앱 푸시 알림</div>
                  <button
                    type="button"
                    onClick={() => void handleEnableNotifications()}
                    disabled={notificationStatus === 'unsupported' || notificationStatus === 'enabled' || isEnabling}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${notificationStatus === 'enabled' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'}`}
                  >
                    {isEnabling ? '설정 중...' : notificationLabel}
                  </button>
                </div>
                {notificationMessage && <div className="mt-2 text-xs text-stone-500">{notificationMessage}</div>}
              </div>
            </section>

            <section>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">루틴 설정 리스트</h3>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-stone-100 divide-y divide-stone-100">
                <button 
                  onClick={() => setActiveTab('weekday')}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-stone-50"
                >
                  <span className="text-sm font-medium text-stone-700">평일 루틴 설정</span>
                  <Icon name="chevron_right" size={18} className="text-stone-400" />
                </button>
                <button 
                  onClick={() => setActiveTab('weekend')}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-stone-50"
                >
                  <span className="text-sm font-medium text-stone-700">주말 루틴 설정</span>
                  <Icon name="chevron_right" size={18} className="text-stone-400" />
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="action-sheet flex h-[min(92dvh,46rem)] !w-full !max-w-4xl flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
          <div className="shrink-0 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveTab('main')} className="sheet-icon-button shrink-0" aria-label="이전">
                  <Icon name="chevron_left" size={20} />
                </button>
                <div className="min-w-0 pr-3">
                  <h2 className="font-hand truncate text-2xl text-stone-800 sm:text-3xl">
                    {activeTab === 'weekday' ? '평일 루틴 보관함' : '주말 루틴 보관함'}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500 sm:text-sm">
                    {activeTab === 'weekday' ? '평일의 기본 루틴을 관리합니다.' : '주말의 기본 루틴을 관리합니다.'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="sheet-icon-button shrink-0" aria-label="닫기">
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
          <div className="min-h-0 overflow-y-auto p-5 md:border-b-0 md:border-r">
            <div className="space-y-2.5">
              {draft[activeTab].map((task) => (
                <div
                  key={task.id}
                  className="task-card block w-full rounded-xl bg-white px-4 py-3.5 text-left"
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
                        <Icon name="schedule" size={12} className="shrink-0" />
                        {task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '시간 미지정'}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.02em] ${getTaskTonePillClass(task)}`}>
                          {getTaskToneLabel(task)}
                        </span>
                      </div>
                      <button onClick={() => setPendingDeleteTask(task)} className="rounded-full p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500">
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-col bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <h3 className="font-hand text-2xl text-stone-700">루틴 블록 추가</h3>
              <form 
              className="mt-4 space-y-3"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
              >
                <input
                  type="text"
                  name="routine-title"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full rounded-2xl bg-white px-5 py-4 text-lg font-medium text-stone-800 placeholder:text-stone-300 outline-none border border-stone-200 focus:border-stone-400 transition-all"
                  placeholder="루틴 이름"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block rounded-xl bg-white px-4 py-2.5 text-sm text-stone-600 border border-stone-200 focus-within:border-stone-400 transition-all">
                    <div className="mb-1">시작</div>
                    <input type="time" className="time-field" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                  </label>
                  <label className="block rounded-xl bg-white px-4 py-2.5 text-sm text-stone-600 border border-stone-200 focus-within:border-stone-400 transition-all">
                    <div className="mb-1">종료</div>
                    <input type="time" className="time-field" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleTagSelect(getToneTags('urgent-important'))} className={`rounded-xl border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'urgent-important' ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                    긴급+중요
                  </button>
                  <button type="button" onClick={() => handleTagSelect(getToneTags('urgent'))} className={`rounded-xl border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'urgent' ? 'border-yellow-400 bg-yellow-100 text-yellow-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                    긴급
                  </button>
                  <button type="button" onClick={() => handleTagSelect(getToneTags('important'))} className={`rounded-xl border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'important' ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                    중요
                  </button>
                  <button type="button" onClick={() => handleTagSelect(getToneTags('normal'))} className={`rounded-xl border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'normal' ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                    일반
                  </button>
                </div>
              </form>
            </div>
            <div className="shrink-0 bg-white p-5">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!title.trim() || !startTime || !endTime}
                className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                블록 추가
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap animate-[fade-in_200ms_ease-out] rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          {toastMessage}
        </div>
      )}
      {pendingDeleteTask ? (
        <div className="modal-backdrop z-[110]" onClick={(event) => {
          event.stopPropagation();
          setPendingDeleteTask(null);
        }}>
          <div className="action-sheet max-w-md" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-hand text-2xl text-stone-800">루틴 삭제</h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              <span className="font-semibold text-stone-700">{pendingDeleteTask.title}</span>
              {' '}루틴 일정을 삭제할까요?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteTask(null)}
                className="rounded-xl bg-white px-4 py-3 text-sm text-stone-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pendingDeleteTask.id)}
                className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RoutineSettingsModal;
