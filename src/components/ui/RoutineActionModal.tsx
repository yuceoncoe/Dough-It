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
    <div className="modal-backdrop" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="modal-shell max-w-[320px] !p-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 text-center">
          <h2 className="font-hand text-xl text-stone-800 mb-2">{isDelete ? '루틴 삭제 범위' : '루틴 수정 범위'}</h2>
          <p className="mt-1 text-sm text-stone-800">
            <span className="font-semibold">{taskTitle}</span>
            {isDelete ? ' 루틴을 어디까지 삭제할까요?' : ' 루틴을 어디까지 수정할까요?'}
          </p>
        </div>
        <div className="flex flex-col border-t border-stone-200/80">
          <button 
            onClick={() => {
              onSelectScope('single');
              onClose();
            }} 
            className={`py-3.5 text-[16px] font-medium transition-colors active:bg-stone-100 border-b border-stone-200/80 ${isDelete ? 'text-rose-500' : 'text-blue-500'}`}
          >
            {isDelete ? '이번 일정만 삭제하기' : '이번 일정만 수정하기'}
          </button>
          <button 
            onClick={() => {
              onSelectScope('future');
              onClose();
            }} 
            className={`py-3.5 text-[16px] font-medium transition-colors active:bg-stone-100 border-b border-stone-200/80 ${isDelete ? 'text-rose-500' : 'text-blue-500'}`}
          >
            {isDelete ? '앞으로 모든 일정 삭제하기' : '앞으로 모든 일정 수정하기'}
          </button>
          <button 
            onClick={onClose} 
            className="py-3.5 text-[16px] font-semibold text-stone-500 active:bg-stone-100 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoutineActionModal;
