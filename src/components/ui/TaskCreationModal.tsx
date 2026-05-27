import React, { useEffect, useRef, useState } from 'react';
import { Tag } from '../../types';
import { getToneTags, getToneSelectionKey } from '../../utils/task';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

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
              <X size={18} />
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
          spellCheck={false}
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-xl text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-500"
          placeholder="일정 이름"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && title.trim()) {
              onSave(title.trim(), tags);
            }
          }}
        />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setTags(getToneTags('urgent-important'))}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${getToneSelectionKey(tags) === 'urgent-important' ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white/70 text-stone-600 hover:bg-white'}`}
          >
            <div className="font-medium">긴급+중요</div>
          </button>
          <button
            onClick={() => setTags(getToneTags('urgent'))}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${getToneSelectionKey(tags) === 'urgent' ? 'border-yellow-400 bg-yellow-100 text-yellow-900' : 'border-stone-300 bg-white/70 text-stone-600 hover:bg-white'}`}
          >
            <div className="font-medium">긴급</div>
          </button>
          <button
            onClick={() => setTags(getToneTags('important'))}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${getToneSelectionKey(tags) === 'important' ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white/70 text-stone-600 hover:bg-white'}`}
          >
            <div className="font-medium">중요</div>
          </button>
          <button
            onClick={() => setTags(getToneTags('normal'))}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${getToneSelectionKey(tags) === 'normal' ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : 'border-stone-300 bg-white/70 text-stone-600 hover:bg-white'}`}
          >
            <div className="font-medium">일반</div>
          </button>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-700 transition-colors hover:bg-stone-50">
            취소
          </button>
          <button
            onClick={() => title.trim() && onSave(title.trim(), tags)}
            disabled={!title.trim()}
            className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCreationModal;
