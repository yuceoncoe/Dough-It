import React from 'react';
import { Task } from '../../types';
import { formatDateLabel } from '../../utils/task';
import { getTaskReport, REPORT_QUADRANTS } from '../../utils/report';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';


export const TaskReportModal = ({
  isOpen,
  date,
  tasks,
  tasksByDate,
  onClose,
}: {
  isOpen: boolean;
  date: string;
  tasks: Task[];
  tasksByDate: Record<string, Task[]>;
  onClose: () => void;
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) {
    return null;
  }

  const report = getTaskReport(tasks);
  const averageLabel = report.averageRating === null ? '-' : report.averageRating.toFixed(1);


  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell max-w-[28rem] max-h-[88dvh] overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Day Report</p>
          <h3 className="mt-1 font-hand text-2xl text-stone-900">{formatDateLabel(date)} 보고서</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {REPORT_QUADRANTS.map((quadrant) => (
            <div key={quadrant.key} className={`rounded-2xl p-4 text-left ring-1 ${quadrant.className}`}>
              <div className="text-xs font-semibold tracking-[-0.02em] opacity-80">{quadrant.label}</div>
              <div className="mt-2 text-3xl font-bold tracking-[-0.05em]">{report.counts[quadrant.key]}</div>
              <div className="mt-1 text-xs font-medium opacity-70">처리</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-stone-100 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-stone-600">전체 총점 평균</div>
              <div className="mt-1 text-xs text-stone-400">평점을 남긴 완료 일정 기준</div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold tracking-[-0.05em] text-stone-900">{averageLabel}</span>
              <span className="ml-1 text-sm font-semibold text-stone-400">/ 5</span>
            </div>
          </div>
        </div>



        <div className="mt-4 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-700">처리한 일정</span>
            <span className="text-sm font-bold text-stone-900">{report.completedCount}개</span>
          </div>
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {report.completedTasks.length ? report.completedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-medium text-stone-700">{task.title}</span>
                <span className="shrink-0 text-xs font-bold text-amber-500">{task.rating !== undefined ? `⭐️ ${task.rating}` : '평점 없음'}</span>
              </div>
            )) : (
              <div className="rounded-xl bg-stone-50 px-3 py-4 text-center text-sm text-stone-400">
                아직 완료 처리된 일정이 없습니다.
              </div>
            )}
          </div>
        </div>

        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-stone-900 px-4 py-3 text-white">
          닫기
        </button>
      </div>
    </div>
  );
};

export default TaskReportModal;
