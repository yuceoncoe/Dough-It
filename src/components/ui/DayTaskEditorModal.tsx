import React, { useEffect, useRef, useState } from 'react';
import { Tag } from '../../types';
import { getToneTags, getToneSelectionKey } from '../../utils/task';
import { Icon } from '../../components/ui/Icon';
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
        <p className="mb-4 mt-3 text-sm leading-relaxed text-stone-500">제목, 시간, 태그를 입력해서 하루 일정에 바로 반영합니다.</p>

        <form onSubmit={onSubmit} autoComplete="off" className="flex flex-col">
          <input
            autoFocus
            type="text"
            name="task-title"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            className="w-full rounded-2xl bg-white px-5 py-4 text-lg font-medium text-stone-800 placeholder:text-stone-300 outline-none border border-stone-200 focus:border-stone-400 transition-all"
            placeholder="일정 이름"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <div className="mt-3 flex flex-col gap-3">
            <label className="block rounded-xl bg-white px-4 py-2.5 text-sm text-stone-600 border border-stone-200 focus-within:border-stone-400 transition-all">
              <div className="mb-1">시작</div>
              <input type="time" className="time-field" value={startTime} onChange={(event) => onStartTimeChange(event.target.value)} />
            </label>
            <label className="block rounded-xl bg-white px-4 py-2.5 text-sm text-stone-600 border border-stone-200 focus-within:border-stone-400 transition-all">
              <div className="mb-1">종료</div>
              <input type="time" className="time-field" value={endTime} onChange={(event) => onEndTimeChange(event.target.value)} />
            </label>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200">
            <button type="button" onClick={() => onSetTags(getToneTags('urgent-important'))} className={`px-4 py-2.5 text-center text-sm font-medium transition-colors ${getToneSelectionKey(tags) === 'urgent-important' ? 'bg-rose-100 text-rose-900' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              긴급+중요
            </button>
            <button type="button" onClick={() => onSetTags(getToneTags('urgent'))} className={`px-4 py-2.5 text-center text-sm font-medium transition-colors ${getToneSelectionKey(tags) === 'urgent' ? 'bg-yellow-100 text-yellow-900' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              긴급
            </button>
            <button type="button" onClick={() => onSetTags(getToneTags('important'))} className={`px-4 py-2.5 text-center text-sm font-medium transition-colors ${getToneSelectionKey(tags) === 'important' ? 'bg-sky-100 text-sky-900' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              중요
            </button>
            <button type="button" onClick={() => onSetTags(getToneTags('normal'))} className={`px-4 py-2.5 text-center text-sm font-medium transition-colors ${getToneSelectionKey(tags) === 'normal' ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              일반
            </button>
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
              취소
            </button>
            <button type="submit" disabled={!title.trim() || !startTime || !endTime} className="flex-1 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isEditing ? '업데이트' : '일정 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DayTaskEditorModal;
