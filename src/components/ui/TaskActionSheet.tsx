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
    <div className="modal-backdrop" style={{ zIndex: 60 }} onClick={onClose}>
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
                className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700"
              >
                평가 취소
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => onSetRating(task, 0)}
              className={`flex-1 flex justify-center py-2 transition-transform hover:scale-110 active:scale-95 ${task.rating === 0 ? 'text-rose-700' : 'text-stone-200 hover:text-rose-300'}`}
              aria-label="0점 평가"
            >
              <Icon name="close" size={30} className="[font-variation-settings:'wght'_600]" />
            </button>
            {[1, 2, 3, 4, 5].map((score) => {
              const isActive = task.rating !== undefined && task.rating >= score;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => onSetRating(task, score)}
                  className={`flex-1 flex justify-center py-2 transition-transform hover:scale-110 active:scale-95 ${isActive ? 'text-amber-400' : 'text-stone-200 hover:text-amber-300'}`}
                  aria-label={`${score}점 평가`}
                >
                  <Icon name="star" size={36} className={isActive ? "[font-variation-settings:'FILL'_1]" : "[font-variation-settings:'FILL'_0]"} />
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
            className="textarea-field mt-2"
          />
        </label>
        <button onClick={onClose} className="btn-primary mt-4 w-full">
          닫기
        </button>
      </div>
    </div>
  );
};

export default TaskActionSheet;
