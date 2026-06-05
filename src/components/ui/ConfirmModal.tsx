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
      <div className="modal-shell max-w-[320px] p-6" onClick={(event) => event.stopPropagation()}>
        {title && <h2 className="font-hand text-2xl text-stone-800 mb-2">{title}</h2>}
        <p className={`text-stone-700 ${title ? 'mt-2 text-sm' : 'text-base font-medium'}`}>
          {message}
        </p>
        <div className="mt-6 flex gap-3">
          <button 
            onClick={onClose} 
            className="btn-outline flex-1"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={
              isDestructive 
                ? "btn-danger flex-1" 
                : "btn-primary flex-1"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
