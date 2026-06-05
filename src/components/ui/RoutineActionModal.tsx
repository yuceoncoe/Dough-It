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
    <div className="fixed inset-0 z-[110] flex flex-col justify-end bg-black/20 p-4 pb-6 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="w-full max-w-md mx-auto animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)]" onClick={(event) => event.stopPropagation()}>
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden text-center divide-y divide-stone-200/80">
          <div className="px-4 py-3.5">
            <h2 className="text-[13px] font-semibold text-stone-500">{isDelete ? '루틴 삭제 범위' : '루틴 수정 범위'}</h2>
            <p className="mt-1 text-[13px] text-stone-500">
              '{taskTitle}' {isDelete ? '루틴을 어디까지 삭제할까요?' : '루틴을 어디까지 수정할까요?'}
            </p>
          </div>
          <button 
            onClick={() => {
              onSelectScope('single');
              onClose();
            }} 
            className={`w-full py-4 text-[17px] transition-colors active:bg-stone-200/50 ${isDelete ? 'text-rose-500' : 'text-blue-500'}`}
          >
            {isDelete ? '이번 일정만 삭제하기' : '이번 일정만 수정하기'}
          </button>
          <button 
            onClick={() => {
              onSelectScope('future');
              onClose();
            }} 
            className={`w-full py-4 text-[17px] transition-colors active:bg-stone-200/50 ${isDelete ? 'text-rose-500' : 'text-blue-500'}`}
          >
            {isDelete ? '앞으로 모든 일정 삭제하기' : '앞으로 모든 일정 수정하기'}
          </button>
        </div>
        <div className="mt-2 bg-white rounded-2xl overflow-hidden">
          <button 
            onClick={onClose} 
            className="w-full py-4 text-[17px] font-semibold text-blue-500 transition-colors active:bg-stone-200/50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoutineActionModal;
