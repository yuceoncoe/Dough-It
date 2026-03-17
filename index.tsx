import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Home,
  Lock,
  Moon,
  Paintbrush,
  Pencil,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  SunMedium,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

type Tag = 'urgent' | 'important';
interface Task {
  id: string;
  title: string;
  tags: Tag[];
  startTime: string | null;
  duration: number | null;
  completed: boolean;
  isRoutine?: boolean;
}

interface RoutineState {
  weekday: Task[];
  weekend: Task[];
}

const CENTER = 300;
const RADIUS = 248;
const STORAGE_KEYS = {
  routines: 'circle-day:routines',
  tasksByDate: 'circle-day:tasks-by-date',
};

const INITIAL_ROUTINES: RoutineState = {
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

const loadStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const persistJson = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the app usable even if storage is unavailable.
  }
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  let start = startAngle % 360;
  let end = endAngle % 360;

  if (end <= start) {
    end += 360;
  }
  if (end - start >= 360) {
    end = start + 359.99;
  }

  const startPoint = polarToCartesian(x, y, radius, end);
  const endPoint = polarToCartesian(x, y, radius, start);
  const largeArcFlag = end - start <= 180 ? '0' : '1';

  return [
    'M', startPoint.x, startPoint.y,
    'A', radius, radius, 0, largeArcFlag, 0, endPoint.x, endPoint.y,
    'L', x, y,
    'L', startPoint.x, startPoint.y,
  ].join(' ');
};

const describeOpenArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  let start = startAngle % 360;
  let end = endAngle % 360;

  if (end <= start) {
    end += 360;
  }
  if (end - start >= 360) {
    end = start + 359.99;
  }

  const startPoint = polarToCartesian(x, y, radius, end);
  const endPoint = polarToCartesian(x, y, radius, start);
  const largeArcFlag = end - start <= 180 ? '0' : '1';

  return [
    'M', startPoint.x, startPoint.y,
    'A', radius, radius, 0, largeArcFlag, 0, endPoint.x, endPoint.y,
  ].join(' ');
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  let safeMinutes = Math.floor(minutes % 1440);
  if (safeMinutes < 0) {
    safeMinutes += 1440;
  }
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const minutesToAngle = (minutes: number) => (minutes / 1440) * 360;
const angleToMinutes = (angle: number) => Math.round((angle / 360) * 1440);

const clampArcEnd = (startAngle: number, endAngle: number) => {
  let safeEnd = endAngle;
  if (safeEnd <= startAngle) {
    safeEnd += 360;
  }
  return safeEnd;
};

const getAngularDistance = (fromAngle: number, toAngle: number) => Math.abs(((fromAngle - toAngle + 540) % 360) - 180);

const TRACK_LANE_COUNT = 4;
const TRACK_INNER_RADIUS = 118;
const TRACK_OUTER_RADIUS = RADIUS + 10;
const TRACK_LANE_GAP = 10;
const TRACK_LANE_WIDTH = (TRACK_OUTER_RADIUS - TRACK_INNER_RADIUS - TRACK_LANE_GAP * (TRACK_LANE_COUNT - 1)) / TRACK_LANE_COUNT;
const OUTER_BOUNDARY_RADIUS = RADIUS + 45;
const OUTER_HOUR_LABEL_RADIUS = OUTER_BOUNDARY_RADIUS + 34;
const OUTER_BACKGROUND_RADIUS = OUTER_BOUNDARY_RADIUS + 4;
const OUTER_RING_SEGMENTS = Array.from({ length: 144 }, (_, index) => {
  const angle = index * 2.5;
  const isCardinal = index % 6 === 0;
  const end = polarToCartesian(CENTER, CENTER, OUTER_BACKGROUND_RADIUS - 6, angle);
  const start = polarToCartesian(CENTER, CENTER, OUTER_BACKGROUND_RADIUS - (isCardinal ? 26 : 16), angle);
  return { angle, isCardinal, start, end };
});
const OUTER_HOUR_LABELS = Array.from({ length: 24 }, (_, index) => {
  const value = String(index);
  const angle = index * 15;
  const point = polarToCartesian(CENTER, CENTER, OUTER_HOUR_LABEL_RADIUS, angle);
  return { value, angle, point };
});
const SVG_VIEWBOX_PADDING = 72;
const SVG_VIEWBOX_MIN = -SVG_VIEWBOX_PADDING;
const SVG_VIEWBOX_SIZE = 600 + SVG_VIEWBOX_PADDING * 2;

const isCurrentMinuteInsideTask = (task: Task, currentMinutes: number) => {
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

const getTaskProgress = (task: Task, currentMinutes: number) => {
  if (!task.startTime || !task.duration || task.duration <= 0) {
    return 0;
  }
  const start = timeToMinutes(task.startTime);
  const elapsed = ((currentMinutes - start) % 1440 + 1440) % 1440;
  return Math.max(0, Math.min(1, elapsed / task.duration));
};

const getCenterTaskProgress = (task: Task | null, currentMinutes: number) => {
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

const getTrackLaneRadii = (laneIndex: number) => {
  const outerRadius = TRACK_OUTER_RADIUS - laneIndex * (TRACK_LANE_WIDTH + TRACK_LANE_GAP);
  const innerRadius = outerRadius - TRACK_LANE_WIDTH;
  return { innerRadius, outerRadius };
};

const getTrackLaneFillRadii = (laneIndex: number) => {
  const outerRadius = laneIndex === 0 ? TRACK_OUTER_RADIUS : getTrackSeparatorRadius(laneIndex - 1);
  const innerRadius = laneIndex === TRACK_LANE_COUNT - 1 ? TRACK_INNER_RADIUS : getTrackSeparatorRadius(laneIndex);
  return { innerRadius, outerRadius };
};

const getTrackLaneCenterRadius = (laneIndex: number) => {
  const { innerRadius, outerRadius } = getTrackLaneFillRadii(laneIndex);
  return (innerRadius + outerRadius) / 2;
};

const getTrackSeparatorRadius = (laneIndex: number) => {
  const { innerRadius } = getTrackLaneRadii(laneIndex);
  return innerRadius - TRACK_LANE_GAP / 2;
};

const shouldReverseLabelPath = (angle: number) => angle > 90 && angle < 270;

const drawTextOnArc = (
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

const buildArcGlyphLayout = (
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
      rotation: charAngle + (reverse ? 180 : 0),
    };
  });
};

const getTaskIntervals = (tasks: Task[]) => tasks
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
  })
  .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);

const assignTasksToTrackLanes = (tasks: Task[]) => {
  const laneEndMinutes = Array.from({ length: TRACK_LANE_COUNT }, () => -1);

  return getTaskIntervals(tasks).map((entry) => {
    let laneIndex = laneEndMinutes.findIndex((laneEndMinute) => laneEndMinute <= entry.startMinute);
    if (laneIndex === -1) {
      laneIndex = 0;
      let earliestEndMinute = laneEndMinutes[0];
      for (let index = 1; index < laneEndMinutes.length; index += 1) {
        if (laneEndMinutes[index] < earliestEndMinute) {
          earliestEndMinute = laneEndMinutes[index];
          laneIndex = index;
        }
      }
    }

    laneEndMinutes[laneIndex] = entry.endMinute;
    return { ...entry, laneIndex };
  });
};

const getTaskColor = (tags: Tag[]) => {
  const urgent = tags.includes('urgent');
  const important = tags.includes('important');
  if (urgent && important) {
    return '#ff8f6b';
  }
  if (urgent) {
    return '#f97373';
  }
  if (important) {
    return '#5ea8ff';
  }
  return '#d8d6cf';
};

const getClockTaskColor = (task: Task) => {
  if (task.completed) {
    return '#d4d4d4';
  }
  if (task.tags.includes('urgent')) {
    return '#d90429';
  }
  if (task.tags.includes('important')) {
    return '#9a9a9a';
  }
  return '#ececec';
};

const hexToRgba = (hex: string, alpha: number) => {
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

const getTaskBorderClass = (tags: Tag[]) => {
  const urgent = tags.includes('urgent');
  const important = tags.includes('important');
  if (urgent && important) {
    return 'border-orange-400';
  }
  if (urgent) {
    return 'border-rose-400';
  }
  if (important) {
    return 'border-sky-400';
  }
  return 'border-stone-300';
};

const getTaskIcon = (task: Task) => {
  const title = task.title.toLowerCase();
  if (task.isRoutine) {
    return <RefreshCw size={30} className="text-stone-600" />;
  }
  if (task.tags.includes('urgent') && task.tags.includes('important')) {
    return <Sparkles size={30} className="text-orange-500" />;
  }
  if (task.tags.includes('urgent')) {
    return <AlertCircle size={30} className="text-rose-500" />;
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

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getBlurProgress = (point: { x: number; y: number }, minuteAngle: number) => {
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

const renderClockScene = (ctx: CanvasRenderingContext2D, tasks: Task[], minuteAngle: number) => {
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

  Array.from({ length: TRACK_LANE_COUNT - 1 }, (_, laneIndex) => laneIndex).forEach((laneIndex) => {
    const separatorRadius = getTrackSeparatorRadius(laneIndex);
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.06)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, separatorRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  assignTasksToTrackLanes(tasks).forEach(({ task, startAngle, endAngle, laneIndex }) => {
      const laneCenterRadius = getTrackLaneCenterRadius(laneIndex);
      const { innerRadius, outerRadius } = getTrackLaneFillRadii(laneIndex);
      const laneStrokeWidth = outerRadius - innerRadius;
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      const labelPoint = polarToCartesian(CENTER, CENTER, laneCenterRadius, midAngle);
      const progress = getBlurProgress(labelPoint, minuteAngle);

      ctx.save();
      ctx.filter = `blur(${1.8 + progress * 11}px)`;
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

const CanvasClockSurface = ({
  tasks,
  minuteAngle,
}: {
  tasks: Task[];
  minuteAngle: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const scale = (rect.width / SVG_VIEWBOX_SIZE) * ratio;
      const offset = -SVG_VIEWBOX_MIN * scale;
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offscreenCtx = offscreen.getContext('2d');
      if (!offscreenCtx) {
        return;
      }

      offscreenCtx.setTransform(scale, 0, 0, scale, offset, offset);
      renderClockScene(offscreenCtx, tasks, minuteAngle);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0);

    };

    draw();

    const resizeObserver = new ResizeObserver(() => draw());
    resizeObserver.observe(canvas);
    window.addEventListener('resize', draw);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [tasks, minuteAngle]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
};

function generateRoutinesForDate(dateStr: string, routines: RoutineState) {
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

const seedTasksForToday = (todayStr: string, routines: RoutineState) => ({
  [todayStr]: [
    { id: 'seed-1', title: '아침 산책', tags: [], startTime: '06:30', duration: 30, completed: false, isRoutine: false },
    { id: 'seed-2', title: '우선순위 블록', tags: ['important'], startTime: '16:00', duration: 90, completed: false, isRoutine: false },
    ...generateRoutinesForDate(todayStr, routines),
  ],
});

const addOrReplaceDateTasks = (tasksByDate: Record<string, Task[]>, date: string, routines: RoutineState) => {
  if (tasksByDate[date]?.length) {
    return tasksByDate;
  }
  return { ...tasksByDate, [date]: generateRoutinesForDate(date, routines) };
};

const formatDateLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const TaskCreationModal = ({
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

  const toggleTag = (tag: Tag) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell max-w-md" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-stone-500 transition-colors hover:text-rose-500">
          <X size={20} />
        </button>
        <div className="mb-2 flex items-center gap-2 text-sm text-stone-500">
          <Clock size={14} />
          <span>{initialTimeRange.start} - {initialTimeRange.end}</span>
        </div>
        <h2 className="font-hand text-3xl text-stone-800">일정 추가</h2>
        <p className="mb-6 mt-2 text-sm text-stone-500">이 시간 블록에 맞는 아이젠하워 태그를 선택하세요.</p>
        <input
          autoFocus
          className="w-full border-b-2 border-stone-300 bg-transparent py-3 text-2xl text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-700"
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
            onClick={() => toggleTag('urgent')}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${tags.includes('urgent') ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white/70 text-stone-600 hover:bg-white'}`}
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle size={16} />
              긴급
            </div>
            <div className="mt-1 text-xs opacity-80">빠르게 처리해야 해요</div>
          </button>
          <button
            onClick={() => toggleTag('important')}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${tags.includes('important') ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white/70 text-stone-600 hover:bg-white'}`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Star size={16} />
              중요
            </div>
            <div className="mt-1 text-xs opacity-80">가치가 큰 시간이에요</div>
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

const TaskActionSheet = ({
  task,
  onClose,
  onToggleComplete,
  onEdit,
  onUnschedule,
  onDelete,
}: {
  task: Task | null;
  onClose: () => void;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onUnschedule: (task: Task) => void;
  onDelete: (task: Task) => void;
}) => {
  if (!task) {
    return null;
  }

  return (
    <div className="modal-backdrop items-end md:items-center" onClick={onClose}>
      <div className="action-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-stone-300 md:hidden" />
        <div className="mb-1 flex items-center gap-2 text-sm text-stone-500">
          {getTaskIcon(task)}
          <span>{task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '아직 배치되지 않음'}</span>
        </div>
        <h3 className="font-hand text-3xl text-stone-800">{task.title}</h3>
        <p className="mt-1 text-sm text-stone-500">{task.isRoutine ? '루틴 블록' : '이 시간 블록에 적용할 작업을 선택하세요'}</p>
        <div className="mt-5 space-y-3">
          <button onClick={() => onToggleComplete(task)} className="sheet-button">
            <Check size={18} />
            {task.completed ? '진행 중으로 되돌리기' : '완료로 표시'}
          </button>
          {!task.isRoutine && (
            <button onClick={() => onEdit(task)} className="sheet-button">
              <Pencil size={18} />
              일정 수정
            </button>
          )}
          {!task.isRoutine && task.startTime && (
            <button onClick={() => onUnschedule(task)} className="sheet-button">
              <Clock size={18} />
              원형 시계에서 빼기
            </button>
          )}
          {!task.isRoutine && (
            <button onClick={() => onDelete(task)} className="sheet-button text-rose-700">
              <Trash2 size={18} />
              일정 삭제
            </button>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-700">
          닫기
        </button>
      </div>
    </div>
  );
};

const RoutineSettingsModal = ({
  isOpen,
  routines,
  onClose,
  onSaveRoutines,
}: {
  isOpen: boolean;
  routines: RoutineState;
  onClose: () => void;
  onSaveRoutines: (routines: RoutineState) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend'>('weekday');
  const [draft, setDraft] = useState<RoutineState>(routines);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraft(routines);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
    setActiveTab('weekday');
  }, [isOpen, routines]);

  if (!isOpen) {
    return null;
  }

  const toggleTag = (tag: Tag) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const handleAdd = () => {
    if (!title.trim() || !startTime || !endTime) {
      return;
    }
    const start = timeToMinutes(startTime);
    let duration = timeToMinutes(endTime) - start;
    if (duration <= 0) {
      duration += 1440;
    }
    const nextTask: Task = {
      id: `routine-editor-${Date.now()}`,
      title: title.trim(),
      tags,
      startTime,
      duration,
      completed: false,
      isRoutine: true,
    };
    const nextTasks = [...draft[activeTab], nextTask].sort((left, right) => timeToMinutes(left.startTime ?? '00:00') - timeToMinutes(right.startTime ?? '00:00'));
    setDraft({ ...draft, [activeTab]: nextTasks });
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
  };

  const handleDelete = (id: string) => {
    setDraft((current) => ({ ...current, [activeTab]: current[activeTab].filter((task) => task.id !== id) }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell h-[92vh] max-w-4xl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-hand text-3xl text-stone-800">루틴 보관함</h2>
              <p className="text-sm text-stone-500">평일과 주말의 기본 루틴을 오프라인으로 저장합니다.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-rose-500">
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
            <button
              onClick={() => setActiveTab('weekday')}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${activeTab === 'weekday' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              평일
            </button>
            <button
              onClick={() => setActiveTab('weekend')}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${activeTab === 'weekend' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              주말
            </button>
          </div>
        </div>
        <div className="grid h-[calc(92vh-170px)] grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-y-auto border-b border-stone-200 p-5 md:border-b-0 md:border-r">
            <div className="space-y-3">
              {draft[activeTab].map((task) => (
                <div key={task.id} className={`rounded-3xl border border-l-4 bg-white/85 p-4 shadow-sm ${getTaskBorderClass(task.tags)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-hand text-2xl text-stone-800">{task.title}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                        <Clock size={12} />
                        {task.startTime} - {minutesToTime(timeToMinutes(task.startTime ?? '00:00') + (task.duration ?? 0))}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(task.id)} className="rounded-full p-2 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto bg-stone-50/80 p-5">
            <h3 className="font-hand text-2xl text-stone-700">루틴 블록 추가</h3>
            <div className="mt-4 space-y-4">
              <input
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-500"
                placeholder="일정 이름"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
                  <div className="mb-1">시작</div>
                  <input type="time" className="w-full bg-transparent outline-none" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </label>
                <label className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
                  <div className="mb-1">종료</div>
                  <input type="time" className="w-full bg-transparent outline-none" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => toggleTag('urgent')} className={`rounded-2xl border px-4 py-3 text-left ${tags.includes('urgent') ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                  긴급
                </button>
                <button onClick={() => toggleTag('important')} className={`rounded-2xl border px-4 py-3 text-left ${tags.includes('important') ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                  중요
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!title.trim() || !startTime || !endTime}
                className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                블록 추가
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-200 px-5 py-4">
          <button onClick={onClose} className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-700">
            취소
          </button>
          <button
            onClick={() => {
              onSaveRoutines(draft);
              onClose();
            }}
            className="rounded-2xl bg-amber-400 px-4 py-3 text-stone-900"
          >
            루틴 저장
          </button>
        </div>
      </div>
    </div>
  );
};

const CircleScheduler = ({
  tasks,
  onAddTask,
}: {
  tasks: Task[];
  onAddTask: (title: string, tags: Tag[], startTime: string, duration: number) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const sliderDragStartRef = useRef<number | null>(null);
  const transitionResetRef = useRef<number | null>(null);
  const [anchorAngle, setAnchorAngle] = useState<number | null>(null);
  const [hoverAngle, setHoverAngle] = useState<number | null>(null);
  const [pendingArc, setPendingArc] = useState<{ startAngle: number; endAngle: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [overlapIndex, setOverlapIndex] = useState(0);
  const [sliderTransitionDirection, setSliderTransitionDirection] = useState<'from-left' | 'from-right' | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (transitionResetRef.current !== null) {
      window.clearTimeout(transitionResetRef.current);
    }
  }, []);

  const getPointerAngle = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) {
      return null;
    }
    const scale = Math.min(rect.width / SVG_VIEWBOX_SIZE, rect.height / SVG_VIEWBOX_SIZE);
    const offsetX = (rect.width - SVG_VIEWBOX_SIZE * scale) / 2;
    const offsetY = (rect.height - SVG_VIEWBOX_SIZE * scale) / 2;
    const x = SVG_VIEWBOX_MIN + (clientX - rect.left - offsetX) / scale;
    const y = SVG_VIEWBOX_MIN + (clientY - rect.top - offsetY) / scale;
    const dx = x - CENTER;
    const dy = y - CENTER;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 118 || distance > RADIUS + 24) {
      return null;
    }
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) {
      angle += 360;
    }
    return Math.round(angle / 1.25) * 1.25;
  };

  const commitSelection = (endAngle: number) => {
    if (anchorAngle === null) {
      return;
    }
    if (Math.abs(endAngle - anchorAngle) < 1) {
      setAnchorAngle(null);
      setHoverAngle(null);
      return;
    }
    const safeEnd = clampArcEnd(anchorAngle, endAngle);
    setPendingArc({ startAngle: anchorAngle, endAngle: safeEnd });
    setShowCreateModal(true);
    setAnchorAngle(null);
    setHoverAngle(null);
  };

  const handleRingClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const angle = getPointerAngle(event.clientX, event.clientY);
    if (angle === null) {
      return;
    }
    if (anchorAngle === null) {
      setAnchorAngle(angle);
      setHoverAngle(angle);
      return;
    }
    commitSelection(angle);
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minuteAngle = minutesToAngle(currentMinutes);
  const overlappingActiveTasks = tasks.filter((task) => isCurrentMinuteInsideTask(task, currentMinutes));
  const activeTask = overlappingActiveTasks[0] ?? null;
  const hasOverlapSlider = overlappingActiveTasks.length > 1;
  const safeOverlapIndex = hasOverlapSlider ? overlapIndex % overlappingActiveTasks.length : 0;
  const displayTask = hasOverlapSlider ? overlappingActiveTasks[safeOverlapIndex] : activeTask;
  const activeTaskProgress = getCenterTaskProgress(displayTask, currentMinutes);
  const activeTaskColor = displayTask ? getClockTaskColor(displayTask) : '#ff7a91';
  const trackTasks = assignTasksToTrackLanes(tasks);

  useEffect(() => {
    if (!overlappingActiveTasks.length) {
      setOverlapIndex(0);
      return;
    }
    setOverlapIndex((current) => current % overlappingActiveTasks.length);
  }, [overlappingActiveTasks.length]);

  const moveOverlapSlider = (direction: 1 | -1) => {
    if (overlappingActiveTasks.length <= 1) {
      return;
    }
    setSliderTransitionDirection(direction === 1 ? 'from-left' : 'from-right');
    if (transitionResetRef.current !== null) {
      window.clearTimeout(transitionResetRef.current);
    }
    transitionResetRef.current = window.setTimeout(() => {
      setSliderTransitionDirection(null);
      transitionResetRef.current = null;
    }, 260);
    setOverlapIndex((current) => {
      const next = current + direction;
      const count = overlappingActiveTasks.length;
      return (next + count) % count;
    });
  };
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-[#f6f6f8]">
      <TaskCreationModal
        isOpen={showCreateModal}
        initialTimeRange={{
          start: pendingArc ? minutesToTime(angleToMinutes(pendingArc.startAngle % 360)) : '',
          end: pendingArc ? minutesToTime(angleToMinutes(pendingArc.endAngle % 360)) : '',
        }}
        onClose={() => {
          setShowCreateModal(false);
          setPendingArc(null);
        }}
        onSave={(title, tags) => {
          if (!pendingArc) {
            return;
          }
          const startTime = minutesToTime(angleToMinutes(pendingArc.startAngle % 360));
          const duration = Math.round(((pendingArc.endAngle - pendingArc.startAngle) / 360) * 1440);
          onAddTask(title, tags, startTime, duration);
          setShowCreateModal(false);
          setPendingArc(null);
        }}
      />

      <div className="relative aspect-square w-full max-w-[680px]">
        <CanvasClockSurface tasks={tasks} minuteAngle={minuteAngle} />

        <svg
          ref={svgRef}
          viewBox={`${SVG_VIEWBOX_MIN} ${SVG_VIEWBOX_MIN} ${SVG_VIEWBOX_SIZE} ${SVG_VIEWBOX_SIZE}`}
          className="absolute inset-0 h-full w-full select-none"
          style={{ touchAction: 'none' }}
          onMouseMove={(event) => {
            const angle = getPointerAngle(event.clientX, event.clientY);
            if (angle !== null) {
              setHoverAngle(angle);
            }
          }}
          onClick={handleRingClick}
        >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="transparent" />
        <line
          x1={CENTER}
          y1={CENTER - (OUTER_BACKGROUND_RADIUS - 30)}
          x2={CENTER}
          y2={CENTER + (OUTER_BACKGROUND_RADIUS - 30)}
          stroke="rgba(20, 20, 20, 0.06)"
          strokeWidth="0.9"
        />
        <g>
          {trackTasks.map(({ task, startAngle, endAngle, laneIndex }) => {
            const laneCenterRadius = getTrackLaneCenterRadius(laneIndex);
            const glyphs = buildArcGlyphLayout(task.title, laneCenterRadius, startAngle, endAngle, (char) => {
              const approxWidths: Record<string, number> = {
                ' ': 4,
              };
              return approxWidths[char] ?? (/[\u3131-\u318E\uAC00-\uD7A3]/.test(char) ? 11 : 7);
            });

            return glyphs.map(({ char, x, y, rotation }, glyphIndex) => (
              <text
                key={`${task.id}-label-${glyphIndex}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-black text-[11px] font-medium"
                style={{
                  opacity: task.completed ? 0.58 : 0.94,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                {char}
              </text>
            ));
          })}
        </g>
        <g>
          {OUTER_HOUR_LABELS.map(({ value, angle, point }) => (
            (() => {
              const distance = getAngularDistance(angle, minuteAngle);
              const progress = distance / 180;
              const blur = progress * 3.2;
              const opacity = 0.82 - progress * 0.34;

              return (
                <text
                  key={`hour-label-${value}-${angle}`}
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-black text-[11px] font-medium"
                  opacity={opacity}
                  style={{ filter: `blur(${blur}px)` }}
                >
                  {value}
                </text>
              );
            })()
          ))}
        </g>

        {anchorAngle !== null && (
          <>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={polarToCartesian(CENTER, CENTER, RADIUS, anchorAngle).x}
              y2={polarToCartesian(CENTER, CENTER, RADIUS, anchorAngle).y}
              stroke="#d90429"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <circle cx={polarToCartesian(CENTER, CENTER, RADIUS, anchorAngle).x} cy={polarToCartesian(CENTER, CENTER, RADIUS, anchorAngle).y} r="5" fill="#d90429" />
          </>
        )}

        {anchorAngle !== null && hoverAngle !== null && hoverAngle !== anchorAngle && (
          <path
            d={describeArc(CENTER, CENTER, RADIUS, anchorAngle, clampArcEnd(anchorAngle, hoverAngle))}
            fill="rgba(217, 4, 41, 0.12)"
            stroke="#d90429"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        )}

        <line
          x1={CENTER}
          y1={CENTER}
          x2={polarToCartesian(CENTER, CENTER, OUTER_BOUNDARY_RADIUS - 8, minuteAngle).x}
          y2={polarToCartesian(CENTER, CENTER, OUTER_BOUNDARY_RADIUS - 8, minuteAngle).y}
          stroke="#d90429"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.96"
        />
        </svg>
        <div
          className="center-stack"
        >
          {hasOverlapSlider && (
            <div
              className="center-carousel"
              onPointerDown={(event) => {
                sliderDragStartRef.current = event.clientX;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => {
                if (sliderDragStartRef.current === null) {
                  return;
                }
                const delta = event.clientX - sliderDragStartRef.current;
                sliderDragStartRef.current = null;
                if (Math.abs(delta) < 28) {
                  return;
                }
                moveOverlapSlider(delta < 0 ? 1 : -1);
              }}
              onPointerCancel={() => {
                sliderDragStartRef.current = null;
              }}
              onPointerLeave={() => {
                sliderDragStartRef.current = null;
              }}
            >
              <div className="center-carousel__pager" aria-hidden="true">
                {overlappingActiveTasks.map((task, index) => (
                  <span key={task.id} className={`center-carousel__dot ${index === safeOverlapIndex ? 'is-active' : ''}`} />
                ))}
              </div>
            </div>
          )}
          <div className={`center-progress-shell ${sliderTransitionDirection ? `is-transitioning ${sliderTransitionDirection}` : ''}`} aria-hidden="true">
            <div
              className="center-progress-fill"
              style={{
                transform: `scaleY(${activeTaskProgress})`,
                background: `linear-gradient(180deg, ${hexToRgba(activeTaskColor, 0.84)} 0%, ${hexToRgba(activeTaskColor, 0.18)} 100%)`,
              }}
            />
          </div>
          <div className="center-lens" aria-hidden="true">
            <div
              className={`center-lens__title ${sliderTransitionDirection ? `is-transitioning ${sliderTransitionDirection}` : ''}`}
              style={{ color: displayTask ? activeTaskColor : 'rgba(214, 211, 209, 0.92)' }}
            >
              {displayTask ? (displayTask.title.length > 12 ? `${displayTask.title.slice(0, 12)}…` : displayTask.title) : '비어 있음'}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-center text-xs text-stone-500 shadow-sm backdrop-blur">
        {anchorAngle === null ? '원형을 눌러 시작 시간을 정하고, 다시 눌러 시간 구간을 완성하세요.' : '원형을 한 번 더 눌러 이 일정 구간을 확정하세요.'}
      </div>
    </div>
  );
};

const CalendarView = ({
  tasksByDate,
  onOpenSettings,
  onSelectDate,
}: {
  tasksByDate: Record<string, Task[]>;
  onOpenSettings: () => void;
  onSelectDate: (date: string) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const buildDateKey = (day: number) => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <section className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#fbf7f0_0%,#f0ebe1_100%)] p-4 md:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-hand text-4xl text-stone-800 md:text-5xl">달력 보기</h1>
          <p className="text-sm text-stone-500">날짜를 누르면 그날의 24시간 원형 시계로 이동합니다.</p>
        </div>
        <button onClick={onOpenSettings} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
          <Settings size={22} />
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-[1.8rem] border border-white/70 bg-white/65 px-3 py-2 shadow-sm backdrop-blur">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center text-lg font-medium text-stone-800 md:text-2xl">
          {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.2em] text-stone-500 md:text-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="mt-3 grid flex-1 grid-cols-7 gap-2 overflow-y-auto pb-safe">
        {Array.from({ length: firstDay }, (_, index) => <div key={`empty-${index}`} />)}
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const dateKey = buildDateKey(day);
          const dayTasks = tasksByDate[dateKey] ?? [];
          const nonRoutine = dayTasks.filter((task) => !task.isRoutine);
          const now = new Date();
          const isToday = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth() && now.getDate() === day;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-[92px] rounded-[1.6rem] border p-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white ${isToday ? 'border-amber-400 bg-amber-50' : 'border-white/70 bg-white/65'}`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-base font-semibold md:text-lg ${isToday ? 'text-amber-700' : 'text-stone-800'}`}>{day}</span>
                {isToday && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] tracking-[0.18em] text-amber-800">오늘</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nonRoutine.slice(0, 6).map((task) => (
                  <span key={task.id} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.completed ? '#d6d3d1' : getTaskColor(task.tags) }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const DayScheduleView = ({
  date,
  tasks,
  onBack,
  onOpenSettings,
  onTasksChange,
}: {
  date: string;
  tasks: Task[];
  onBack?: () => void;
  onOpenSettings: () => void;
  onTasksChange: (tasks: Task[]) => void;
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [showRoutines, setShowRoutines] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);

  const sortedTasks = tasks
    .filter((task) => showRoutines || !task.isRoutine)
    .sort((left, right) => {
      if (!!left.startTime !== !!right.startTime) {
        return left.startTime ? -1 : 1;
      }
      if (!left.startTime || !right.startTime) {
        return 0;
      }
      return timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    });

  const resetForm = () => {
    setTitle('');
    setStartTime('');
    setEndTime('');
    setTags([]);
    setEditingId(null);
  };

  const toggleTag = (tag: Tag) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const addTask = (nextTitle: string, nextTags: Tag[], nextStartTime: string, duration: number) => {
    onTasksChange([...tasks, {
      id: `task-${Date.now()}`,
      title: nextTitle,
      tags: nextTags,
      startTime: nextStartTime,
      duration,
      completed: false,
      isRoutine: false,
    }]);
  };

  const updateTask = (updatedTask: Task) => {
    onTasksChange(tasks.map((task) => task.id === updatedTask.id ? updatedTask : task));
  };

  const deleteTask = (id: string) => {
    onTasksChange(tasks.filter((task) => task.id !== id));
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setTags(task.tags);
    setStartTime(task.startTime ?? '');
    setEndTime(task.startTime && task.duration ? minutesToTime(timeToMinutes(task.startTime) + task.duration) : '');
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      return;
    }
    const start = timeToMinutes(startTime);
    let duration = timeToMinutes(endTime) - start;
    if (duration <= 0) {
      duration += 1440;
    }

    if (editingId) {
      const current = tasks.find((task) => task.id === editingId);
      if (current) {
        updateTask({
          ...current,
          title: title.trim(),
          tags,
          startTime,
          duration,
        });
      }
    } else {
      addTask(title.trim(), tags, startTime, duration);
    }
    resetForm();
  };

  return (
    <section className="flex h-full flex-col bg-[linear-gradient(180deg,#fbf8f1_0%,#efe7db_100%)]">
      <TaskActionSheet
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onToggleComplete={(task) => {
          updateTask({ ...task, completed: !task.completed });
          setSheetTask(null);
        }}
        onEdit={(task) => {
          startEditing(task);
          setSheetTask(null);
        }}
        onUnschedule={(task) => {
          updateTask({ ...task, startTime: null, duration: null });
          setSheetTask(null);
        }}
        onDelete={(task) => {
          deleteTask(task.id);
          setSheetTask(null);
        }}
      />

      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 md:px-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full border border-stone-300 bg-white p-2 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="font-hand text-3xl text-stone-800 md:text-4xl">{formatDateLabel(date)}</h1>
            <p className="text-sm text-stone-500">기기 안에서 오프라인으로 동작하는 오늘의 원형 일정입니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenSettings} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden px-4 pb-4 md:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-h-[45vh] overflow-hidden rounded-[2rem] border border-white/75 bg-white/40 p-3 shadow-[0_20px_70px_rgba(130,108,77,0.12)] backdrop-blur">
          <CircleScheduler
            tasks={tasks}
            onAddTask={addTask}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-hand text-3xl text-stone-800">{editingId ? '일정 수정' : '빠른 추가'}</h2>
              {editingId && <button onClick={resetForm} className="text-sm text-rose-600">취소</button>}
            </div>
            <form onSubmit={submitForm} className="space-y-3">
              <input
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-stone-500"
                placeholder="일정 이름"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
                  <div className="mb-1">시작</div>
                  <input type="time" className="w-full bg-transparent outline-none" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </label>
                <label className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
                  <div className="mb-1">종료</div>
                  <input type="time" className="w-full bg-transparent outline-none" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => toggleTag('urgent')} className={`rounded-2xl border px-4 py-3 text-left ${tags.includes('urgent') ? 'border-rose-400 bg-rose-100 text-rose-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    긴급
                  </div>
                </button>
                <button type="button" onClick={() => toggleTag('important')} className={`rounded-2xl border px-4 py-3 text-left ${tags.includes('important') ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-stone-300 bg-white text-stone-600'}`}>
                  <div className="flex items-center gap-2">
                    <Star size={16} />
                    중요
                  </div>
                </button>
              </div>
              <button type="submit" disabled={!title.trim() || !startTime || !endTime} className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50">
                {editingId ? '일정 업데이트' : '하루 일정에 추가'}
              </button>
            </form>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-hand text-3xl text-stone-800">일정 목록</h2>
                <p className="text-sm text-stone-500">카드를 누르면 모바일에 맞는 작업 메뉴가 열립니다.</p>
              </div>
              <button onClick={() => setShowRoutines((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 shadow-sm">
                {showRoutines ? <Eye size={16} /> : <EyeOff size={16} />}
                {showRoutines ? '전체 보기' : '루틴 숨기기'}
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pb-safe pr-1">
              {sortedTasks.length === 0 && (
                <div className="rounded-[1.6rem] border border-dashed border-stone-300 px-4 py-6 text-center text-stone-500">
                  아직 이 날짜에 등록된 일정이 없습니다.
                </div>
              )}
              {sortedTasks.map((task) => (
                <button key={task.id} onClick={() => setSheetTask(task)} className={`w-full rounded-[1.6rem] border border-l-4 bg-white/90 p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 ${getTaskBorderClass(task.tags)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {task.isRoutine ? <Lock size={14} className="shrink-0 text-stone-400" /> : <Zap size={14} className="shrink-0 text-amber-500" />}
                        <span className={`font-hand text-2xl ${task.completed ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{task.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                        <Clock size={12} />
                        {task.startTime ? `${task.startTime} - ${minutesToTime(timeToMinutes(task.startTime) + (task.duration ?? 0))}` : '시간 미지정'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.tags.includes('urgent') && <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />}
                      {task.tags.includes('important') && <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const App = () => {
  const todayStr = getTodayString();
  const [routines, setRoutines] = useState<RoutineState>(() => loadStoredJson(STORAGE_KEYS.routines, INITIAL_ROUTINES));
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>(() => {
    const storedRoutines = loadStoredJson(STORAGE_KEYS.routines, INITIAL_ROUTINES);
    return loadStoredJson(STORAGE_KEYS.tasksByDate, seedTasksForToday(todayStr, storedRoutines));
  });
  const [activeTab, setActiveTab] = useState<'home' | 'calendar'>('home');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    persistJson(STORAGE_KEYS.routines, routines);
  }, [routines]);

  useEffect(() => {
    persistJson(STORAGE_KEYS.tasksByDate, tasksByDate);
  }, [tasksByDate]);

  useEffect(() => {
    setTasksByDate((current) => addOrReplaceDateTasks(current, todayStr, routines));
  }, [todayStr, routines]);

  const updateTasksForDate = (date: string, nextTasks: Task[]) => {
    setTasksByDate((current) => ({ ...current, [date]: nextTasks }));
  };

  const openDate = (date: string) => {
    setTasksByDate((current) => addOrReplaceDateTasks(current, date, routines));
    setSelectedDate(date);
    setActiveTab('calendar');
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900">
      <RoutineSettingsModal
        isOpen={settingsOpen}
        routines={routines}
        onClose={() => setSettingsOpen(false)}
        onSaveRoutines={setRoutines}
      />

      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' && (
          <DayScheduleView
            date={todayStr}
            tasks={tasksByDate[todayStr] ?? []}
            onOpenSettings={() => setSettingsOpen(true)}
            onTasksChange={(nextTasks) => updateTasksForDate(todayStr, nextTasks)}
          />
        )}

        {activeTab === 'calendar' && selectedDate ? (
          <DayScheduleView
            date={selectedDate}
            tasks={tasksByDate[selectedDate] ?? []}
            onBack={() => setSelectedDate(null)}
            onOpenSettings={() => setSettingsOpen(true)}
            onTasksChange={(nextTasks) => updateTasksForDate(selectedDate, nextTasks)}
          />
        ) : null}

        {activeTab === 'calendar' && !selectedDate ? (
          <CalendarView
            tasksByDate={tasksByDate}
            onOpenSettings={() => setSettingsOpen(true)}
            onSelectDate={openDate}
          />
        ) : null}
      </main>

      <nav className="flex h-18 items-center justify-around border-t border-stone-200 bg-white/90 px-2 pb-safe shadow-[0_-12px_25px_rgba(85,72,56,0.08)] backdrop-blur">
        <button
          onClick={() => {
            setActiveTab('home');
            setSelectedDate(null);
          }}
          className={`flex w-full flex-col items-center gap-1 py-3 ${activeTab === 'home' ? 'text-amber-600' : 'text-stone-400'}`}
        >
          <Home size={22} />
          <span className="text-xs tracking-[0.2em]">오늘</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('calendar');
            if (selectedDate) {
              setSelectedDate(null);
            }
          }}
          className={`flex w-full flex-col items-center gap-1 py-3 ${activeTab === 'calendar' ? 'text-amber-600' : 'text-stone-400'}`}
        >
          <CalendarIcon size={22} />
          <span className="text-xs tracking-[0.2em]">달력</span>
        </button>
      </nav>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
