import React, { useEffect, useRef, useState } from 'react';
import { Tag } from '../../types';
import { getToneTags, getToneSelectionKey } from '../../utils/task';
import { X } from 'lucide-react';
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
              <X size={18} />
            </button>
          </div>
        </div>
        <p className="mb-4 mt-3 text-sm leading-relaxed text-stone-500">제목, 시간, 태그를 입력해서 하루 일정에 바로 반영합니다.</p>

        <form onSubmit={onSubmit} autoComplete="off" className="space-y-3">
          <input
            autoFocus
            type="text"
            name="task-title"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full rounded-[12px] border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-500"
            placeholder="일정 이름"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <div className="space-y-3">
            <label className="block rounded-[12px] border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-600">
              <div className="mb-1">시작</div>
              <input type="time" className="time-field" value={startTime} onChange={(event) => onStartTimeChange(event.target.value)} />
            </label>
            <label className="block rounded-[12px] border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-600">
              <div className="mb-1">종료</div>
              <input type="time" className="time-field" value={endTime} onChange={(event) => onEndTimeChange(event.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onSetTags(getToneTags('urgent-important'))} className={`rounded-[12px] border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'urgent-important' ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white text-stone-600'}`}>
              영양제 (긴급+중요)
            </button>
            <button type="button" onClick={() => onSetTags(getToneTags('urgent'))} className={`rounded-[12px] border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'urgent' ? 'border-yellow-400 bg-yellow-100 text-yellow-900' : 'border-stone-300 bg-white text-stone-600'}`}>
              가지치기 (긴급)
            </button>
            <button type="button" onClick={() => onSetTags(getToneTags('important'))} className={`rounded-[12px] border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'important' ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white text-stone-600'}`}>
              물뿌리기 (중요)
            </button>
            <button type="button" onClick={() => onSetTags(getToneTags('normal'))} className={`rounded-[12px] border px-4 py-2.5 text-left text-sm ${getToneSelectionKey(tags) === 'normal' ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : 'border-stone-300 bg-white text-stone-600'}`}>
              땅고르기 (일반)
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="rounded-[12px] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50">
              취소
            </button>
            <button type="submit" disabled={!title.trim() || !startTime || !endTime} className="rounded-[12px] bg-stone-900 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isEditing ? '업데이트' : '일정 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DayTaskEditorModal;
