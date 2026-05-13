import React, { useState } from 'react';
import { Task } from '../../types';
import { Star } from 'lucide-react';

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
  const [notesByTaskId, setNotesByTaskId] = useState<Record<string, string>>({});

  if (tasks.length === 0) return null;

  const handleRate = (taskId: string, rating: number) => {
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
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <h2 className="font-hand text-3xl text-white drop-shadow-md">일정 평가</h2>
          <p className="mt-1 text-sm text-white/90">종료된 일정들의 달성도를 평가해주세요!</p>
          <div className="mt-1 text-xs text-white/70">{tasks.length - unratedTasks.length} / {tasks.length} 완료</div>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
          {unratedTasks.map((task) => (
            <div key={task.id} className="flex min-w-full snap-center flex-col items-center rounded-3xl border border-stone-100 bg-white p-6 text-center shadow-xl">
              <h3 className="mb-2 font-hand text-2xl text-stone-800">{task.title}</h3>
              <p className="mb-6 text-sm text-stone-500">얼마나 만족스럽게 달성하셨나요?</p>
              
              <div className="mb-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => handleRate(task.id, score)}
                    className="p-2 text-stone-200 transition-transform hover:scale-110 hover:text-amber-400 active:scale-95"
                  >
                    <Star size={36} className="fill-current" />
                  </button>
                ))}
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
                  className="mt-2 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-5 text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 focus:bg-white"
                />
              </label>
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
