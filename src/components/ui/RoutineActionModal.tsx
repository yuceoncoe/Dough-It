import React, { useEffect, useRef, useState } from 'react';
import { RoutineAction, RoutineScope } from '../../types';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

export const RoutineActionModal = ({
  isOpen,
  action,
  taskTitle,
  onClose,
  onSelectScope,
}: {
  isOpen: boolean;
  action: RoutineAction | null;
  taskTitle: string;
  onClose: () => void;
  onSelectScope: (scope: RoutineScope) => void;
}) => {
  useBodyScrollLock(isOpen && Boolean(action));

  if (!isOpen || !action) {
    return null;
  }

  const isDelete = action === 'delete';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell max-w-md" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-hand text-2xl text-stone-800">{isDelete ? '루틴 삭제 범위' : '루틴 수정 범위'}</h2>
        <p className="mt-2 text-sm text-stone-500">
          <span className="font-semibold text-stone-700">{taskTitle}</span>
          {isDelete ? ' 루틴을 어디까지 반영할지 선택해 주세요.' : ' 루틴 변경을 어디까지 반영할지 선택해 주세요.'}
        </p>
        <div className="mt-5 space-y-3">
          <button onClick={() => onSelectScope('single')} className="sheet-button">
            {isDelete ? '이번 일정만 삭제하기' : '이번 일정만 수정하기'}
          </button>
          <button onClick={() => onSelectScope('future')} className="sheet-button">
            {isDelete ? '앞으로 모든 일정 삭제하기' : '앞으로 모든 일정 수정하기'}
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-700 transition-colors hover:bg-stone-50">
          취소
        </button>
      </div>
    </div>
  );
};

export default RoutineActionModal;
