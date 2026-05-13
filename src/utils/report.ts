import { Task } from '../types';

export type ReportQuadrantKey = 'urgentImportant' | 'urgent' | 'important' | 'normal';

export const REPORT_QUADRANTS: Array<{
  key: ReportQuadrantKey;
  label: string;
  shortLabel: string;
  className: string;
}> = [
  { key: 'urgentImportant', label: '긴급+중요', shortLabel: '긴+중', className: 'bg-rose-100 text-rose-700 ring-rose-200' },
  { key: 'urgent', label: '긴급', shortLabel: '긴급', className: 'bg-yellow-100 text-yellow-700 ring-yellow-200' },
  { key: 'important', label: '중요', shortLabel: '중요', className: 'bg-sky-100 text-sky-700 ring-sky-200' },
  { key: 'normal', label: '일반', shortLabel: '일반', className: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
];

export const getTaskReportQuadrant = (task: Task): ReportQuadrantKey => {
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const isUrgent = tags.includes('urgent');
  const isImportant = tags.includes('important');

  if (isUrgent && isImportant) return 'urgentImportant';
  if (isUrgent) return 'urgent';
  if (isImportant) return 'important';
  return 'normal';
};

export const getTaskReport = (tasks: Task[]) => {
  const completedTasks = tasks.filter((task) => task.completed);
  const ratedTasks = completedTasks.filter((task) => task.rating !== undefined);
  const counts = REPORT_QUADRANTS.reduce<Record<ReportQuadrantKey, number>>((result, quadrant) => {
    result[quadrant.key] = 0;
    return result;
  }, {
    urgentImportant: 0,
    urgent: 0,
    important: 0,
    normal: 0,
  });

  completedTasks.forEach((task) => {
    counts[getTaskReportQuadrant(task)] += 1;
  });

  const averageRating = ratedTasks.length
    ? ratedTasks.reduce((sum, task) => sum + (task.rating ?? 0), 0) / ratedTasks.length
    : null;

  return {
    completedTasks,
    counts,
    completedCount: completedTasks.length,
    ratedCount: ratedTasks.length,
    averageRating,
  };
};
