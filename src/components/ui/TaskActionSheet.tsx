import React, { useEffect, useRef, useState } from 'react';
import { Task } from '../../types';
import { minutesToTime } from '../../utils/time';
import { timeToMinutes } from '../../utils/time';
import { Pencil, Trash2 } from 'lucide-react';

export const TaskActionSheet = ({
  task,
  onClose,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  task: Task | null;
  onClose: () => void;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) => {
  if (!task) {
    return null;
  }

  return (
    <div className="modal-backdrop items-center" onClick={onClose}>
      <div className="action-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h3 className="sheet-header__title font-hand text-2xl text-stone-800">{task.title}</h3>
          <div className="sheet-header__actions">
            <button type="button" onClick={() => onEdit(task)} className="sheet-icon-button" aria-label="일정 수정">
              <Pencil size={18} />
            </button>
            <button type="button" onClick={() => onDelete(task)} className="sheet-icon-button sheet-icon-button--danger" aria-label="일정 삭제">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-base font-semibold tracking-[-0.03em] text-stone-500">
          <span>{task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '아직 배치되지 않음'}</span>
        </div>
        <div className="mt-5 space-y-3">
          <div className="sheet-toggle-row">
            <span>진행 상태</span>
            <button
              type="button"
              onClick={() => onToggleComplete(task)}
              className={`sheet-toggle ${task.completed ? 'is-on' : ''}`}
              aria-pressed={task.completed}
              aria-label={task.completed ? '완료 상태 끄기' : '완료 상태 켜기'}
            >
              <span className="sheet-toggle__label">{task.completed ? '완료됨' : '진행 중'}</span>
              <span className="sheet-toggle__thumb" />
            </button>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-[8px] bg-stone-900 px-4 py-3 text-white transition-colors hover:bg-stone-800">
          닫기
        </button>
      </div>
    </div>
  );
};

export default TaskActionSheet;
