import React, { useEffect, useRef, useState } from 'react';
import { Tag } from '../../types';
import { getToneTags, getToneSelectionKey } from '../../utils/task';
import { Icon } from '../../components/ui/Icon';
import { QuadrantPicker } from './QuadrantPicker';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

export const DayTaskEditorModal = ({
  isOpen,
  title,
  startTime,
  endTime,
  tags,
  isEditing,
  onClose,
  onTitleChange,
  onStartTimeChange,
  onEndTimeChange,
  onSetTags,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  startTime: string;
  endTime: string;
  tags: Tag[];
  isEditing: boolean;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onSetTags: (tags: Tag[]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="action-sheet relative max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h2 className="sheet-header__title font-hand text-2xl text-stone-800">{isEditing ? '일정 수정' : '빠른 추가'}</h2>
          <div className="sheet-header__actions">
            <button type="button" onClick={onClose} className="sheet-icon-button" aria-label="닫기">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} autoComplete="off" className="mt-2 flex flex-col">
          <input
            autoFocus
            type="text"
            name="task-title"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            className="input-field"
            placeholder="일정 이름"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <div className="mt-3 flex flex-col gap-3">
            <label className="time-label">
              <div className="mb-1">시작</div>
              <input type="time" className="time-field" value={startTime} onChange={(event) => onStartTimeChange(event.target.value)} />
            </label>
            <label className="time-label">
              <div className="mb-1">종료</div>
              <input type="time" className="time-field" value={endTime} onChange={(event) => onEndTimeChange(event.target.value)} />
            </label>
          </div>
          <div className="mt-6">
            <QuadrantPicker tags={tags} onSelect={onSetTags} buttonType="button" />
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">
              취소
            </button>
            <button type="submit" disabled={!title.trim() || !startTime || !endTime} className="flex-1 btn-primary">
              {isEditing ? '업데이트' : '일정 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DayTaskEditorModal;
