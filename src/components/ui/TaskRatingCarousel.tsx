import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { Icon } from '../../components/ui/Icon';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';
import { playHarpChime } from '../../utils/audio';

export const TaskRatingCarousel = ({
  tasks,
  onRateTask,
  onClose,
}: {
  tasks: Task[];
  onRateTask: (taskId: string, rating: number, note?: string) => void;
  onClose: () => void;
}) => {
  const [ratedTaskIds, setRatedTaskIds] = useState<Set<string>>(new Set());
  const [ratingsByTaskId, setRatingsByTaskId] = useState<Record<string, number>>({});
  const [notesByTaskId, setNotesByTaskId] = useState<Record<string, string>>({});
  useBodyScrollLock(tasks.length > 0);

  useEffect(() => {
    if (tasks.length > 0) {
      playHarpChime();
    }
  }, []);

  if (tasks.length === 0) return null;

  const handleConfirm = (taskId: string) => {
    const rating = ratingsByTaskId[taskId];
    if (rating === undefined) {
      return;
    }
    const note = notesByTaskId[taskId]?.trim();
    onRateTask(taskId, rating, note || undefined);
    setRatedTaskIds(prev => new Set(prev).add(taskId));
  };

  const unratedTasks = tasks.filter(t => !ratedTaskIds.has(t.id));

  if (unratedTasks.length === 0) {
    // We must use setTimeout to avoid state updates during render
    setTimeout(onClose, 0);
    return null;
  }

  return (
    <div className="modal-backdrop z-[100] flex-col justify-center">
      <div className="w-full max-w-sm animate-jelly">
        <div className="mb-4 text-center">
          <h2 className="font-hand text-3xl text-white drop-shadow-md">일정 평가</h2>
          <p className="mt-1 text-sm text-white/90">종료된 일정들의 달성도를 평가해주세요!</p>
          <div className="mt-1 text-xs text-white/70">{tasks.length - unratedTasks.length} / {tasks.length} 완료</div>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
          {unratedTasks.map((task) => (
            <div key={task.id} className="flex min-w-full snap-center flex-col items-center rounded-3xl bg-white p-6 text-center shadow-xl">
              <h3 className="mb-2 font-hand text-2xl text-stone-800">{task.title}</h3>
              <p className="mb-6 text-sm text-stone-500">얼마나 만족스럽게 달성하셨나요?</p>
              
              <div className="mb-4 flex w-full items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setRatingsByTaskId((current) => ({ ...current, [task.id]: 0 }))}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-transform hover:scale-110 active:scale-95 ${ratingsByTaskId[task.id] === 0 ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                  aria-label="0점 선택"
                >
                  <Icon name="close" size={28} className={ratingsByTaskId[task.id] === 0 ? "[font-variation-settings:'wght'_700]" : "[font-variation-settings:'wght'_400]"} />
                </button>
                <div className="flex flex-1 items-center justify-between">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setRatingsByTaskId((current) => ({ ...current, [task.id]: score }))}
                      className={`flex-1 flex justify-center py-2 transition-transform hover:scale-110 active:scale-95 ${(ratingsByTaskId[task.id] ?? -1) >= score ? 'text-amber-400' : 'text-stone-200 hover:text-amber-300'}`}
                      aria-label={`${score}점 선택`}
                    >
                      <Icon name="star" size={42} className={(ratingsByTaskId[task.id] ?? -1) >= score ? "[font-variation-settings:'FILL'_1]" : "[font-variation-settings:'FILL'_0]"} />
                    </button>
                  ))}
                </div>
              </div>
              <label className="w-full text-left">
                <span className="text-sm font-semibold tracking-[-0.02em] text-stone-700">메모</span>
                <textarea
                  value={notesByTaskId[task.id] ?? task.note ?? ''}
                  onChange={(event) => {
                    const nextNote = event.target.value;
                    setNotesByTaskId((current) => ({ ...current, [task.id]: nextNote }));
                  }}
                  rows={3}
                  maxLength={240}
                  placeholder="오늘 이 일정에 대해 짧게 남겨보세요"
                  className="textarea-field mt-2"
                />
              </label>
              <button
                type="button"
                onClick={() => handleConfirm(task.id)}
                disabled={ratingsByTaskId[task.id] === undefined}
                className="btn-primary mt-5 w-full"
              >
                확인
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-2 text-center">
          <button onClick={onClose} className="text-sm text-white/60 underline hover:text-white">
            나중에 평가하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskRatingCarousel;
