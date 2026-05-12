import { Task, Tag, RoutineState } from '../types';
import { timeToMinutes, minutesToTime, minutesToAngle, angleToMinutes } from './time';
import { polarToCartesian } from './geometry';
import { AlertCircle, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, Eye, EyeOff, Home, Lock, Moon, Paintbrush, Pencil, Plus, RefreshCw, Settings, Sparkles, Star, SunMedium, Trash2, X, Zap } from 'lucide-react';
import React from 'react';

export const CENTER = 300;
export const RADIUS = 248;

export const INITIAL_ROUTINES: RoutineState = {
  weekday: [
    { id: 'wd-1', title: '기상', tags: [], startTime: '07:00', duration: 30, completed: false, isRoutine: true },
    { id: 'wd-2', title: '집중 작업', tags: ['important'], startTime: '09:00', duration: 180, completed: false, isRoutine: true },
    { id: 'wd-3', title: '점심', tags: [], startTime: '13:00', duration: 60, completed: false, isRoutine: true },
    { id: 'wd-4', title: '정리 업무', tags: ['urgent'], startTime: '15:00', duration: 60, completed: false, isRoutine: true },
  ],
  weekend: [
    { id: 'we-1', title: '느린 아침', tags: [], startTime: '09:00', duration: 60, completed: false, isRoutine: true },
    { id: 'we-2', title: '창작 시간', tags: ['important'], startTime: '14:00', duration: 120, completed: false, isRoutine: true },
  ],
};

export const clampArcEnd = (startAngle: number, endAngle: number) => {
  let safeEnd = endAngle;
  if (safeEnd <= startAngle) {
    safeEnd += 360;
  }
  return safeEnd;
};

export const getAngularDistance = (fromAngle: number, toAngle: number) => Math.abs(((fromAngle - toAngle + 540) % 360) - 180);

export const getDirectionalTextVisuals = (angle: number, minuteAngle: number) => {
  const distance = getAngularDistance(angle, minuteAngle);
  const progress = distance / 180;
  return {
    blur: progress * 1.6,
    opacity: 0.88 - progress * 0.24,
  };
};

export const QuadrantBadge = ({ task }: { task: Task }) => {
  const isQ1 = task.tags.includes('urgent') && task.tags.includes('important');
  const isQ2 = !task.tags.includes('urgent') && task.tags.includes('important');
  const isQ3 = task.tags.includes('urgent') && !task.tags.includes('important');
  const isQ4 = !task.tags.includes('urgent') && !task.tags.includes('important');

  if (task.completed) {
    return (
      <div className="grid h-[14px] w-[14px] shrink-0 grid-cols-2 grid-rows-2 gap-[2px] opacity-60">
        <div className={`rounded-tl-[3px] ${isQ1 ? 'bg-stone-400' : 'bg-stone-200'}`} />
        <div className={`rounded-tr-[3px] ${isQ2 ? 'bg-stone-400' : 'bg-stone-200'}`} />
        <div className={`rounded-bl-[3px] ${isQ3 ? 'bg-stone-400' : 'bg-stone-200'}`} />
        <div className={`rounded-br-[3px] ${isQ4 ? 'bg-stone-400' : 'bg-stone-200'}`} />
      </div>
    );
  }

  return (
    <div className="grid h-[14px] w-[14px] shrink-0 grid-cols-2 grid-rows-2 gap-[2px]">
      <div className={`rounded-tl-[3px] ${isQ1 ? 'bg-rose-500' : 'bg-stone-200'}`} />
      <div className={`rounded-tr-[3px] ${isQ2 ? 'bg-sky-500' : 'bg-stone-200'}`} />
      <div className={`rounded-bl-[3px] ${isQ3 ? 'bg-yellow-400' : 'bg-stone-200'}`} />
      <div className={`rounded-br-[3px] ${isQ4 ? 'bg-emerald-400' : 'bg-stone-200'}`} />
    </div>
  );
};


export const DEFAULT_TRACK_LANE_COUNT = 3;
export const TRACK_INNER_RADIUS = 166;
export const TRACK_OUTER_RADIUS = RADIUS + 10;
export const TRACK_LANE_GAP = 10;
export const getTrackLaneWidth = (laneCount: number) => (
  (TRACK_OUTER_RADIUS - TRACK_INNER_RADIUS - TRACK_LANE_GAP * (laneCount - 1)) / laneCount
);
export const OUTER_BOUNDARY_RADIUS = RADIUS + 45;
export const OUTER_HOUR_LABEL_RADIUS = OUTER_BOUNDARY_RADIUS + 34;
export const OUTER_BACKGROUND_RADIUS = OUTER_BOUNDARY_RADIUS + 4;
export const CURRENT_HAND_RADIUS = OUTER_BOUNDARY_RADIUS - 8;
export const OUTER_RING_SEGMENTS = Array.from({ length: 144 }, (_, index) => {
  const angle = index * 2.5;
  const isCardinal = index % 6 === 0;
  const end = polarToCartesian(CENTER, CENTER, OUTER_BACKGROUND_RADIUS - 6, angle);
  const start = polarToCartesian(CENTER, CENTER, OUTER_BACKGROUND_RADIUS - (isCardinal ? 26 : 16), angle);
  return { angle, isCardinal, start, end };
});
export const OUTER_HOUR_LABELS = Array.from({ length: 24 }, (_, index) => {
  const value = String(index);
  const angle = index * 15;
  const point = polarToCartesian(CENTER, CENTER, OUTER_HOUR_LABEL_RADIUS, angle);
  return { value, angle, point };
});
export const SVG_VIEWBOX_PADDING = 72;
export const SVG_VIEWBOX_MIN = -SVG_VIEWBOX_PADDING;
export const SVG_VIEWBOX_SIZE = 600 + SVG_VIEWBOX_PADDING * 2;

export const isCurrentMinuteInsideTask = (task: Task, currentMinutes: number) => {
  if (!task.startTime || !task.duration) {
    return false;
  }
  const start = timeToMinutes(task.startTime);
  const end = (start + task.duration) % 1440;
  if (task.duration >= 1440) {
    return true;
  }
  if (end > start) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
};

export const getTaskProgress = (task: Task, currentMinutes: number) => {
  if (!task.startTime || !task.duration || task.duration <= 0) {
    return 0;
  }
  const start = timeToMinutes(task.startTime);
  const elapsed = ((currentMinutes - start) % 1440 + 1440) % 1440;
  return Math.max(0, Math.min(1, elapsed / task.duration));
};

export const getCenterTaskProgress = (task: Task | null, currentMinutes: number) => {
  if (!task) {
    return 0;
  }
  if (task.completed) {
    return 1;
  }
  if (!task.startTime || !task.duration || task.duration <= 0) {
    return 0;
  }
  if (!isCurrentMinuteInsideTask(task, currentMinutes)) {
    return 0;
  }
  return getTaskProgress(task, currentMinutes);
};

export const getTrackLaneRadii = (laneIndex: number, laneCount: number) => {
  const laneWidth = getTrackLaneWidth(laneCount);
  const outerRadius = TRACK_OUTER_RADIUS - laneIndex * (laneWidth + TRACK_LANE_GAP);
  const innerRadius = outerRadius - laneWidth;
  return { innerRadius, outerRadius };
};

export const getTrackLaneFillRadii = (laneIndex: number, laneCount: number) => {
  const outerRadius = laneIndex === 0 ? TRACK_OUTER_RADIUS : getTrackSeparatorRadius(laneIndex - 1, laneCount);
  const innerRadius = laneIndex === laneCount - 1 ? TRACK_INNER_RADIUS : getTrackSeparatorRadius(laneIndex, laneCount);
  return { innerRadius, outerRadius };
};

export const getTrackLaneCenterRadius = (laneIndex: number, laneCount: number) => {
  const { innerRadius, outerRadius } = getTrackLaneFillRadii(laneIndex, laneCount);
  return (innerRadius + outerRadius) / 2;
};

export const getTrackSeparatorRadius = (laneIndex: number, laneCount: number) => {
  const { innerRadius } = getTrackLaneRadii(laneIndex, laneCount);
  return innerRadius - TRACK_LANE_GAP / 2;
};

export const shouldReverseLabelPath = (angle: number) => angle > 90 && angle < 270;

export const drawTextOnArc = (
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const fontSize = 11;
  ctx.font = `${fontSize}px Pretendard, ui-sans-serif, system-ui, sans-serif`;
  const glyphs = buildArcGlyphLayout(text, radius, startAngle, endAngle, (char) => ctx.measureText(char).width);

  glyphs.forEach(({ char, x, y, rotation }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
};

export const buildArcGlyphLayout = (
  text: string,
  radius: number,
  startAngle: number,
  endAngle: number,
  measureText: (char: string) => number,
) => {
  const content = text.trim().slice(0, 14);
  if (!content) {
    return [];
  }

  const safeEnd = clampArcEnd(startAngle, endAngle);
  const midAngle = startAngle + (safeEnd - startAngle) / 2;
  const reverse = shouldReverseLabelPath(midAngle % 360);
  const fromAngle = reverse ? safeEnd : startAngle;
  const toAngle = reverse ? startAngle : safeEnd;
  const direction = reverse ? -1 : 1;
  const span = Math.abs(toAngle - fromAngle);
  const spacing = 0.6;
  if (span <= 0) {
    return [];
  }

  let fittedChars = content.split('');
  let widths = fittedChars.map((char) => measureText(char) + spacing);
  let totalArcWidth = widths.reduce((sum, width) => sum + width, 0);
  let totalAngle = (totalArcWidth / radius) * (180 / Math.PI);

  while (fittedChars.length > 1 && totalAngle > span) {
    fittedChars = fittedChars.slice(0, -1);
    widths = fittedChars.map((char) => measureText(char) + spacing);
    totalArcWidth = widths.reduce((sum, width) => sum + width, 0);
    totalAngle = (totalArcWidth / radius) * (180 / Math.PI);
  }

  if (totalAngle > span) {
    return [];
  }

  let cursor = fromAngle + direction * ((span - totalAngle) / 2);

  return fittedChars.map((char, index) => {
    const charWidth = widths[index];
    const charAngle = cursor + direction * (((charWidth / 2) / radius) * (180 / Math.PI));
    const point = polarToCartesian(CENTER, CENTER, radius, charAngle);
    cursor += direction * ((charWidth / radius) * (180 / Math.PI));

    return {
      char,
      x: point.x,
      y: point.y,
      angle: ((charAngle % 360) + 360) % 360,
      rotation: charAngle + (reverse ? 180 : 0),
    };
  });
};

export const getTaskIntervals = (tasks: Task[]) => tasks
  .filter((task) => task.startTime && task.duration)
  .map((task) => {
    const startMinute = timeToMinutes(task.startTime ?? '00:00');
    const duration = task.duration ?? 0;
    const endMinute = startMinute + duration;
    return {
      task,
      startMinute,
      endMinute,
      startAngle: minutesToAngle(startMinute),
      endAngle: minutesToAngle(endMinute),
    };
  });

export const getTaskSegments = (task: Task) => {
  if (!task.startTime || !task.duration || task.duration <= 0) {
    return [];
  }

  const startMinute = timeToMinutes(task.startTime);
  const duration = task.duration;
  const endMinute = startMinute + duration;

  if (duration >= 1440) {
    return [{ startMinute: 0, endMinute: 1440 }];
  }

  if (endMinute <= 1440) {
    return [{ startMinute, endMinute }];
  }

  return [
    { startMinute, endMinute: 1440 },
    { startMinute: 0, endMinute: endMinute % 1440 },
  ];
};

export const segmentsOverlap = (
  left: { startMinute: number; endMinute: number },
  right: { startMinute: number; endMinute: number },
) => left.startMinute < right.endMinute && right.startMinute < left.endMinute;

export const getMaxOverlap = (tasks: Task[]) => {
  const events = tasks.flatMap((task) => (
    getTaskSegments(task).flatMap(({ startMinute, endMinute }) => ([
      { minute: startMinute, delta: 1 },
      { minute: endMinute, delta: -1 },
    ]))
  ));

  if (!events.length) {
    return 0;
  }

  events.sort((left, right) => (
    left.minute - right.minute || left.delta - right.delta
  ));

  let currentOverlap = 0;
  let maxOverlap = 0;

  events.forEach(({ delta }) => {
    currentOverlap += delta;
    maxOverlap = Math.max(maxOverlap, currentOverlap);
  });

  return maxOverlap;
};

export const getRequiredTrackLaneCount = (tasks: Task[]) => {
  return DEFAULT_TRACK_LANE_COUNT;
};

export const assignTasksToTrackLanes = (tasks: Task[], laneCount: number) => {
  const laneAssignments = Array.from({ length: laneCount }, () => [] as Array<{ startMinute: number; endMinute: number }>);

  return getTaskIntervals(tasks).map((entry) => {
    const entrySegments = getTaskSegments(entry.task);
    let laneIndex = laneAssignments.findIndex((laneSegments) => (
      entrySegments.every((entrySegment) => laneSegments.every((laneSegment) => !segmentsOverlap(entrySegment, laneSegment)))
    ));

    if (laneIndex === -1) {
      laneIndex = 0;
      let lightestLaneLoad = laneAssignments[0].length;
      for (let index = 1; index < laneAssignments.length; index += 1) {
        if (laneAssignments[index].length < lightestLaneLoad) {
          lightestLaneLoad = laneAssignments[index].length;
          laneIndex = index;
        }
      }
    }

    laneAssignments[laneIndex].push(...entrySegments);
    return { ...entry, laneIndex };
  });
};

export const getTaskColor = (tags: Tag[]) => {
  const urgent = tags.includes('urgent');
  const important = tags.includes('important');
  if (urgent && important) {
    return '#ff5f57';
  }
  if (urgent) {
    return '#facc15';
  }
  if (important) {
    return '#0a84ff';
  }
  return '#30d158';
};

export const getClockTaskColor = (task: Task) => {
  if (task.completed) {
    return '#d4d4d4';
  }
  return getTaskColor(task.tags);
};

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  if (safe.length !== 6) {
    return `rgba(255, 122, 145, ${alpha})`;
  }

  const red = parseInt(safe.slice(0, 2), 16);
  const green = parseInt(safe.slice(2, 4), 16);
  const blue = parseInt(safe.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const getTaskBorderClass = (tags: Tag[]) => {
  const urgent = tags.includes('urgent');
  const important = tags.includes('important');
  if (urgent && important) {
    return 'border-rose-500';
  }
  if (urgent) {
    return 'border-yellow-400';
  }
  if (important) {
    return 'border-sky-500';
  }
  return 'border-emerald-400';
};

export const getTaskToneLabel = (task: Task) => {
  if (task.completed) {
    return '완료';
  }
  if (task.tags.includes('urgent') && task.tags.includes('important')) {
    return '긴급 · 중요';
  }
  if (task.tags.includes('urgent')) {
    return '긴급';
  }
  if (task.tags.includes('important')) {
    return '중요';
  }
  return task.isRoutine ? '루틴' : '일반';
};

export const getTaskTonePillClass = (task: Task) => {
  if (task.completed) {
    return 'bg-stone-100 text-stone-500';
  }
  if (task.tags.includes('urgent') && task.tags.includes('important')) {
    return 'bg-rose-50 text-rose-600';
  }
  if (task.tags.includes('urgent')) {
    return 'bg-yellow-50 text-yellow-700';
  }
  if (task.tags.includes('important')) {
    return 'bg-sky-50 text-sky-600';
  }
  return task.isRoutine ? 'bg-stone-100 text-stone-600' : 'bg-emerald-50 text-emerald-600';
};

export const getTaskIcon = (task: Task) => {
  const title = task.title.toLowerCase();
  if (task.isRoutine) {
    return <RefreshCw size={30} className="text-stone-600" />;
  }
  if (task.tags.includes('urgent') && task.tags.includes('important')) {
    return <Sparkles size={30} className="text-orange-500" />;
  }
  if (task.tags.includes('urgent')) {
    return <AlertCircle size={30} className="text-yellow-500" />;
  }
  if (task.tags.includes('important')) {
    return <Star size={30} className="text-sky-500" />;
  }
  if (title.includes('sleep') || title.includes('rest')) {
    return <Moon size={30} className="text-indigo-400" />;
  }
  if (title.includes('studio') || title.includes('art')) {
    return <Paintbrush size={30} className="text-amber-600" />;
  }
  return <SunMedium size={30} className="text-yellow-500" />;
};

export const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getBlurProgress = (point: { x: number; y: number }, minuteAngle: number) => {
  const focusPoint = polarToCartesian(CENTER, CENTER, RADIUS - 18, minuteAngle);
  const axisPoint = polarToCartesian(CENTER, CENTER, RADIUS + 160, minuteAngle);
  const axisX = axisPoint.x - focusPoint.x;
  const axisY = axisPoint.y - focusPoint.y;
  const axisLength = Math.hypot(axisX, axisY) || 1;
  const normalizedX = axisX / axisLength;
  const normalizedY = axisY / axisLength;
  const projection = Math.max(0, (point.x - focusPoint.x) * normalizedX + (point.y - focusPoint.y) * normalizedY);
  const projected = Math.min(1, projection / 140);

  let pointAngle = Math.atan2(point.y - CENTER, point.x - CENTER) * (180 / Math.PI) + 90;
  if (pointAngle < 0) {
    pointAngle += 360;
  }
  const angleDelta = Math.abs(((pointAngle - minuteAngle + 540) % 360) - 180);
  const directional = Math.min(1, angleDelta / 180);
  const easedDirectional = directional * directional;

  return Math.min(1, easedDirectional * 0.72 + projected * 0.28);
};

export const renderClockScene = (ctx: CanvasRenderingContext2D, tasks: Task[], minuteAngle: number) => {
  const laneCount = getRequiredTrackLaneCount(tasks);
  const trackTasks = assignTasksToTrackLanes(tasks, laneCount);

  ctx.clearRect(SVG_VIEWBOX_MIN, SVG_VIEWBOX_MIN, SVG_VIEWBOX_SIZE, SVG_VIEWBOX_SIZE);

  ctx.fillStyle = '#f6f6f8';
  ctx.fillRect(SVG_VIEWBOX_MIN, SVG_VIEWBOX_MIN, SVG_VIEWBOX_SIZE, SVG_VIEWBOX_SIZE);

  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, OUTER_BACKGROUND_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  OUTER_RING_SEGMENTS.forEach(({ start, end, isCardinal }) => {
    const progress = getBlurProgress(end, minuteAngle);

    ctx.save();
    ctx.filter = `blur(${0.4 + progress * 1.6}px)`;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = isCardinal ? 1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  });

  Array.from({ length: laneCount - 1 }, (_, laneIndex) => laneIndex).forEach((laneIndex) => {
    const separatorRadius = getTrackSeparatorRadius(laneIndex, laneCount);
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.06)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, separatorRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  trackTasks.forEach(({ task, startAngle, endAngle, laneIndex }) => {
      const laneCenterRadius = getTrackLaneCenterRadius(laneIndex, laneCount);
      const { innerRadius, outerRadius } = getTrackLaneFillRadii(laneIndex, laneCount);
      const laneStrokeWidth = outerRadius - innerRadius;
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      const labelPoint = polarToCartesian(CENTER, CENTER, laneCenterRadius, midAngle);
      const progress = getBlurProgress(labelPoint, minuteAngle);

      ctx.save();
      ctx.filter = `blur(${0.8 + progress * 5.2}px)`;
      ctx.globalAlpha = task.completed ? 0.42 : 0.92;
      ctx.strokeStyle = getClockTaskColor(task);
      ctx.lineWidth = laneStrokeWidth;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(
        CENTER,
        CENTER,
        laneCenterRadius,
        (startAngle - 90) * Math.PI / 180,
        (endAngle - 90) * Math.PI / 180,
        false,
      );
      ctx.stroke();
      ctx.restore();
    });
};

export function generateRoutinesForDate(dateStr: string, routines: RoutineState) {
  const date = new Date(`${dateStr}T00:00:00`);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const base = isWeekend ? routines.weekend : routines.weekday;
  return base.map((task) => ({
    ...task,
    id: `routine-${dateStr}-${task.id}`,
    completed: false,
    isRoutine: true,
  }));
}

export const seedTasksForToday = (todayStr: string, routines: RoutineState): Record<string, Task[]> => ({
  [todayStr]: [
    { id: 'seed-1', title: '아침 산책', tags: [], startTime: '06:30', duration: 30, completed: false, isRoutine: false },
    { id: 'seed-2', title: '우선순위 블록', tags: ['important'], startTime: '16:00', duration: 90, completed: false, isRoutine: false },
    ...generateRoutinesForDate(todayStr, routines),
  ],
});

export const addOrReplaceDateTasks = (tasksByDate: Record<string, Task[]>, date: string, routines: RoutineState) => {
  const existingTasks = tasksByDate[date] ?? [];
  const existingRoutineById = new Map(existingTasks.filter((task) => task.isRoutine).map((task) => [task.id, task]));
  const manualTasks = existingTasks.filter((task) => !task.isRoutine);
  const routineTasks = generateRoutinesForDate(date, routines).map((task) => {
    const existing = existingRoutineById.get(task.id);
    return existing ? { ...task, completed: existing.completed, rating: existing.rating } : task;
  });

  return { ...tasksByDate, [date]: [...manualTasks, ...routineTasks] };
};

export const getRoutineBucketForDate = (dateStr: string): keyof RoutineState => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : 'weekday';
};

export const getRoutineBaseId = (taskId: string, dateStr: string) => {
  const prefix = `routine-${dateStr}-`;
  return taskId.startsWith(prefix) ? taskId.slice(prefix.length) : null;
};

export const formatDateLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export const getToneSelectionKey = (tags: Tag[]) => {
  const hasUrgent = tags.includes('urgent');
  const hasImportant = tags.includes('important');
  if (hasUrgent && hasImportant) {
    return 'urgent-important';
  }
  if (hasUrgent) {
    return 'urgent';
  }
  if (hasImportant) {
    return 'important';
  }
  return 'normal';
};

export const getToneTags = (tone: 'urgent-important' | 'urgent' | 'important' | 'normal'): Tag[] => {
  switch (tone) {
    case 'urgent-important':
      return ['urgent', 'important'];
    case 'urgent':
      return ['urgent'];
    case 'important':
      return ['important'];
    default:
      return [];
  }
};
