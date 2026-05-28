import React, { useEffect, useState } from 'react';
import { Task } from '../../types';
import { minutesToTime } from '../../utils/time';
import { timeToMinutes } from '../../utils/time';
import { Icon } from '../../components/ui/Icon';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

export const TaskActionSheet = ({
  task,
  onClose,
  onEdit,
  onDelete,
  onSetRating,
  onUpdateNote,
}: {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSetRating: (task: Task, rating?: number) => void;
  onUpdateNote: (task: Task, note: string) => void;
}) => {
  const [note, setNote] = useState('');
  useBodyScrollLock(Boolean(task));

  useEffect(() => {
    setNote(task?.note ?? '');
  }, [task?.id, task?.note]);

  if (!task) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="action-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h3 className="sheet-header__title font-hand text-2xl text-stone-800">{task.title}</h3>
          <div className="sheet-header__actions">
            <button type="button" onClick={() => onEdit(task)} className="sheet-icon-button" aria-label="일정 수정">
              <Icon name="edit" size={18} />
            </button>
            <button type="button" onClick={() => onDelete(task)} className="sheet-icon-button sheet-icon-button--danger" aria-label="일정 삭제">
              <Icon name="delete" size={18} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-base font-semibold tracking-[-0.03em] text-stone-500">
          <span>{task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '아직 배치되지 않음'}</span>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold tracking-[-0.02em] text-stone-700">별점</span>
            {task.rating !== undefined ? (
              <button
                type="button"
                onClick={() => onSetRating(task, undefined)}
                className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-600"
              >
                평가 취소
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((score) => {
              const isActive = (task.rating ?? 0) >= score;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => onSetRating(task, score)}
                  className={`rounded-full p-1.5 transition-transform hover:scale-105 active:scale-95 ${isActive ? 'text-amber-400' : 'text-stone-200 hover:text-amber-300'}`}
                  aria-label={`${score}점 평가`}
                >
                  <Icon name="star" size={22} className="fill-current" />
                </button>
              );
            })}
          </div>
        </div>
        <label className="mt-5 block">
          <span className="text-sm font-semibold tracking-[-0.02em] text-stone-700">메모</span>
          <textarea
            value={note}
            onChange={(event) => {
              const nextNote = event.target.value;
              setNote(nextNote);
              onUpdateNote(task, nextNote);
            }}
            rows={3}
            maxLength={240}
            placeholder="짧은 메모를 남겨보세요"
            className="mt-2 w-full resize-none rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-5 text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 focus:bg-white"
          />
        </label>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 text-white transition-colors hover:bg-stone-800">
          닫기
        </button>
      </div>
    </div>
  );
};

export default TaskActionSheet;
