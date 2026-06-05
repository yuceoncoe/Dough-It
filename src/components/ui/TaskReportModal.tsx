import React from 'react';
import { Task } from '../../types';
import { formatDateLabel, QuadrantBadge } from '../../utils/task';
import { getTaskReport, REPORT_QUADRANTS } from '../../utils/report';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';
import { getDailyTip } from '../../utils/tips';
import { Icon } from './Icon';


export const TaskReportModal = ({
  isOpen,
  date,
  tasks,
  tasksByDate,
  onClose,
  onTaskClick,
}: {
  isOpen: boolean;
  date: string;
  tasks: Task[];
  tasksByDate: Record<string, Task[]>;
  onClose: () => void;
  onTaskClick?: (task: Task) => void;
}) => {
  useBodyScrollLock(isOpen);

  const [dailyTip, setDailyTip] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setDailyTip(getDailyTip(date, getTaskReport(tasks).counts));
    }
  }, [isOpen, tasks, date]);

  if (!isOpen) {
    return null;
  }

  const report = getTaskReport(tasks);
  const averageLabel = report.averageRating === null ? '-' : report.averageRating.toFixed(1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell max-w-[28rem] max-h-[88dvh] overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Day Report</p>
          <h3 className="mt-1 font-hand text-2xl text-stone-900">{formatDateLabel(date)} 보고서</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {REPORT_QUADRANTS.map((quadrant) => {
            const hasTasks = report.totalCounts[quadrant.key] > 0;
            const cardClass = hasTasks ? quadrant.className : 'bg-stone-100 text-stone-400 ring-stone-200';
            return (
              <div key={quadrant.key} className={`rounded-xl p-3 text-left ring-1 ${cardClass}`}>
                <div className="text-[11px] font-semibold tracking-[-0.02em] opacity-80">{quadrant.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-[-0.05em]">{report.counts[quadrant.key]}</span>
                  <span className="text-sm font-semibold opacity-60">/ {report.totalCounts[quadrant.key]}</span>
                  <span className="ml-0.5 text-[10px] font-medium opacity-70">처리</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-stone-100 p-4">
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

        <div className="mt-4 rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100/50">
          <div className="flex items-center gap-1.5 text-sm font-bold text-blue-700">
            <Icon name="lightbulb" size={16} />
            오늘의 팁
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-blue-900/80 break-keep">
            {dailyTip}
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-stone-100 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-700">일정 모아보기</span>
            <span className="text-sm font-bold text-stone-900">{report.listTasks.length}개</span>
          </div>
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {report.listTasks.length ? report.listTasks.map((task) => (
              <div 
                key={task.id} 
                onClick={() => onTaskClick?.(task)}
                role={onTaskClick ? 'button' : undefined}
                className={`flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm ${onTaskClick ? 'cursor-pointer hover:bg-stone-50 active:bg-stone-100 transition-colors' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <QuadrantBadge task={task} />
                  <span className="truncate text-sm font-medium text-stone-700">{task.title}</span>
                </div>
                <span className={`flex shrink-0 items-center text-xs font-bold ${task.rating === 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                  {task.rating === 0 ? (
                    <>
                      <Icon name="close" size={13} className="mr-0.5 [font-variation-settings:'wght'_700]" />
                      0
                    </>
                  ) : task.rating !== undefined ? (
                    <>
                      <Icon name="star" size={15} className="mr-0.5 text-amber-400 [font-variation-settings:'FILL'_1]" />
                      {task.rating}
                    </>
                  ) : (
                    '평점 없음'
                  )}
                </span>
              </div>
            )) : (
              <div className="rounded-xl bg-white px-3 py-4 text-center text-sm text-stone-400 shadow-sm">
                일정이 없습니다.
              </div>
            )}
          </div>
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
          닫기
        </button>
      </div>
    </div>
  );
};

export default TaskReportModal;
