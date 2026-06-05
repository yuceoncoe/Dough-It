import React from 'react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onClose,
  isDestructive = false,
}: {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDestructive?: boolean;
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell max-w-[280px] !p-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 text-center">
          {title && <h2 className="font-hand text-xl text-stone-800 mb-2">{title}</h2>}
          <p className={`text-stone-800 ${title ? 'mt-1 text-sm' : 'text-base font-medium'}`}>
            {message}
          </p>
        </div>
        <div className="flex border-t border-stone-200/80">
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 text-[16px] font-medium text-blue-500 active:bg-stone-100 transition-colors border-r border-stone-200/80"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`flex-1 py-3.5 text-[16px] font-semibold transition-colors active:bg-stone-100 ${
              isDestructive ? 'text-rose-500' : 'text-blue-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
