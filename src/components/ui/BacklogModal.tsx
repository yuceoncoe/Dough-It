import React, { useState } from 'react';
import { BacklogTask } from '../../types';
import { Icon } from './Icon';

interface BacklogModalProps {
  isOpen: boolean;
  backlogTasks: BacklogTask[];
  onClose: () => void;
  onAddTask: (title: string) => void;
  onRemoveTask: (id: string) => void;
  onAddToSchedule: (task: BacklogTask) => void;
}

export const BacklogModal: React.FC<BacklogModalProps> = ({
  isOpen,
  backlogTasks,
  onClose,
  onAddTask,
  onRemoveTask,
  onAddToSchedule,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (title) {
      onAddTask(title);
      setNewTaskTitle('');
    }
  };

  return (
    <div className="modal-backdrop z-50 flex-col justify-end sm:justify-center p-0 sm:px-5 sm:py-4">
      <div className="flex h-[80vh] w-full flex-col rounded-t-3xl bg-[#f8f9fa] shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-3xl animate-slide-up sm:animate-jelly overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2">
            <Icon name="inbox" size={24} className="text-stone-700" />
            <h2 className="text-[1.15rem] font-bold tracking-[-0.03em] text-stone-900">할일 보관함</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="닫기"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="나중에 할 일 제목을 입력하세요"
              className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-[15px] outline-none transition-colors focus:bg-stone-200"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-800 text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              aria-label="추가"
            >
              <Icon name="add" size={20} />
            </button>
          </div>
        </form>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          {(backlogTasks || []).length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-stone-400 mt-10">
              <Icon name="inbox" size={48} className="mb-3 opacity-20" />
              <p className="text-sm">보관함이 비어있습니다.</p>
              <p className="mt-1 text-xs text-stone-300">생각나는 할 일을 메모해두세요.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(backlogTasks || []).map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center justify-between gap-3 rounded-xl bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex-1 truncate text-[15px] font-medium text-stone-800">
                    {task.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAddToSchedule(task)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50 active:bg-blue-100"
                      aria-label="일정에 추가"
                      title="일정에 추가"
                    >
                      <Icon name="event_available" size={20} />
                    </button>
                    <button
                      onClick={() => onRemoveTask(task.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 active:bg-rose-100"
                      aria-label="삭제"
                      title="삭제"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default BacklogModal;
