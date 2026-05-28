import React, { useEffect, useRef, useState } from 'react';
import { Tag } from '../../types';
import { getToneTags, getToneSelectionKey } from '../../utils/task';
import { Icon } from '../../components/ui/Icon';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';
import { QuadrantPicker } from './QuadrantPicker';

export const TaskCreationModal = ({
  isOpen,
  initialTimeRange,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialTimeRange: { start: string; end: string };
  onClose: () => void;
  onSave: (title: string, tags: Tag[]) => void;
}) => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle('');
    setTags([]);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="action-sheet relative max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h2 className="sheet-header__title font-hand text-2xl text-stone-800">일정 추가</h2>
          <div className="sheet-header__actions">
            <button type="button" onClick={onClose} className="sheet-icon-button" aria-label="닫기">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-base font-semibold tracking-[-0.03em] text-stone-500">
          <span>{initialTimeRange.start} - {initialTimeRange.end}</span>
        </div>
        <p className="mb-6 mt-3 text-sm text-stone-500">이 시간 블록에 맞는 아이젠하워 태그를 선택하세요.</p>
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
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && title.trim()) {
              onSave(title.trim(), tags);
            }
          }}
        />
        <div className="mt-6">
          <QuadrantPicker tags={tags} onSelect={(t) => setTags(t)} />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">
            취소
          </button>
          <button
            onClick={() => title.trim() && onSave(title.trim(), tags)}
            disabled={!title.trim()}
            className="flex-1 btn-primary"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCreationModal;
