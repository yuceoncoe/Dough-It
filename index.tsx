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
type VisualMode = 'paper' | 'halo' | 'pulse';

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
  visualMode: 'circle-day:visual-mode',
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

const cycleVisualMode = (mode: VisualMode): VisualMode => {
  if (mode === 'paper') {
    return 'halo';
  }
  if (mode === 'halo') {
    return 'pulse';
  }
  return 'paper';
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
      <div className="modal-shell max-w-md rotate-1" onClick={(event) => event.stopPropagation()}>
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

const AmbientVisuals = ({ mode, now }: { mode: VisualMode; now: Date }) => {
  const minuteAngle = minutesToAngle(now.getHours() * 60 + now.getMinutes());
  const trailLayers = [88, 62, 40, 22];

  return (
    <>
      <rect x="0" y="0" width="600" height="600" fill="#f4f4f4" />
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 34} fill="#ffffff" opacity="0.98" />
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 20} fill="none" stroke="#d90429" strokeWidth="1.2" opacity="0.28" />
      {trailLayers.map((spread, index) => {
        const start = minuteAngle - 8 - index * 2.5;
        const end = minuteAngle + 8 + index * 2.5;
        const opacity = 0.22 - index * 0.04;
        return (
          <path
            key={spread}
            d={describeArc(CENTER, CENTER, RADIUS + 8 + index * 8, start, end)}
            fill="#d90429"
            opacity={opacity}
            filter={`url(#handBlur${index + 1})`}
          />
        );
      })}
      {(mode === 'halo' || mode === 'pulse') && (
        <circle cx={polarToCartesian(CENTER, CENTER, RADIUS * 0.82, minuteAngle).x} cy={polarToCartesian(CENTER, CENTER, RADIUS * 0.82, minuteAngle).y} r={mode === 'pulse' ? 26 : 18} fill="#d90429" opacity={mode === 'pulse' ? 0.18 : 0.12} filter="url(#handBlur4)" />
      )}
    </>
  );
};

const CircleScheduler = ({
  tasks,
  visualMode,
  onAddTask,
  onInspectTask,
}: {
  tasks: Task[];
  visualMode: VisualMode;
  onAddTask: (title: string, tags: Tag[], startTime: string, duration: number) => void;
  onInspectTask: (task: Task) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [anchorAngle, setAnchorAngle] = useState<number | null>(null);
  const [hoverAngle, setHoverAngle] = useState<number | null>(null);
  const [pendingArc, setPendingArc] = useState<{ startAngle: number; endAngle: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const getPointerAngle = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) {
      return null;
    }
    const scale = Math.min(rect.width / 600, rect.height / 600);
    const offsetX = (rect.width - 600 * scale) / 2;
    const offsetY = (rect.height - 600 * scale) / 2;
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
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

  const activeTask = tasks.find((task) => isCurrentMinuteInsideTask(task, now.getHours() * 60 + now.getMinutes()));
  const activeColor = activeTask?.tags.includes('urgent') ? '#d90429' : '#111111';
  const minuteAngle = minutesToAngle(now.getHours() * 60 + now.getMinutes());

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-[#efefef]">
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

      <svg
        ref={svgRef}
        viewBox="0 0 600 600"
        className="h-full w-full max-h-[68vh] min-h-[340px] max-w-[680px] select-none md:max-h-none"
        style={{ touchAction: 'none' }}
        onMouseMove={(event) => {
          const angle = getPointerAngle(event.clientX, event.clientY);
          if (angle !== null) {
            setHoverAngle(angle);
          }
        }}
        onClick={handleRingClick}
      >
        <defs>
          <filter id="paperNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
          </filter>
          <filter id="handBlur1">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="handBlur2">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="handBlur3">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="handBlur4">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        <AmbientVisuals mode={visualMode} now={now} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#ffffff" stroke="#111111" strokeWidth="4" filter="url(#paperNoise)" />
        <circle cx={CENTER} cy={CENTER} r={RADIUS - 18} fill="none" stroke="#111111" strokeWidth="0.8" opacity="0.16" />

        {Array.from({ length: 24 }, (_, hour) => {
          const angle = hour * 15;
          const lineStart = polarToCartesian(CENTER, CENTER, RADIUS - 12, angle);
          const lineEnd = polarToCartesian(CENTER, CENTER, RADIUS + (hour % 6 === 0 ? 4 : 0), angle);
          const labelPoint = polarToCartesian(CENTER, CENTER, RADIUS + 28, angle);
          return (
            <g key={hour}>
              <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#111111" strokeWidth={hour % 6 === 0 ? 2.4 : 1.2} opacity={hour % 6 === 0 ? '0.85' : '0.42'} />
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" className="fill-black text-[11px] font-semibold md:text-sm" opacity={hour % 6 === 0 ? 0.85 : 0.55}>
                {hour}
              </text>
              {Array.from({ length: 3 }, (_, index) => {
                const subAngle = angle + (index + 1) * 3.75;
                const subStart = polarToCartesian(CENTER, CENTER, RADIUS - 6, subAngle);
                const subEnd = polarToCartesian(CENTER, CENTER, RADIUS, subAngle);
                return <line key={`${hour}-${index}`} x1={subStart.x} y1={subStart.y} x2={subEnd.x} y2={subEnd.y} stroke="#111111" strokeWidth="0.9" opacity="0.18" />;
              })}
            </g>
          );
        })}

        {tasks.filter((task) => task.startTime && task.duration).map((task) => {
          const startAngle = minutesToAngle(timeToMinutes(task.startTime ?? '00:00'));
          const endAngle = startAngle + minutesToAngle(task.duration ?? 0);
          const taskColor = getClockTaskColor(task);
          const labelAngle = startAngle + (endAngle - startAngle) / 2;
          const labelPoint = polarToCartesian(CENTER, CENTER, RADIUS * 0.7, labelAngle);
          return (
            <g key={task.id}>
              <path
                d={describeArc(CENTER, CENTER, RADIUS - 3, startAngle, endAngle)}
                fill={taskColor}
                stroke={task.tags.includes('urgent') ? '#d90429' : '#111111'}
                strokeWidth="1.4"
                opacity={task.completed ? 0.42 : 0.92}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onInspectTask(task);
                }}
              />
              {(task.duration ?? 0) >= 40 && (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-black text-[12px] md:text-xs"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transform: `rotate(${labelAngle + 90}deg)`,
                    opacity: task.completed ? 0.6 : 1,
                  }}
                >
                  {task.title.slice(0, 14)}
                </text>
              )}
            </g>
          );
        })}

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
          x2={polarToCartesian(CENTER, CENTER, RADIUS - 54, minuteAngle).x}
          y2={polarToCartesian(CENTER, CENTER, RADIUS - 54, minuteAngle).y}
          stroke="#111111"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.22"
          filter="url(#handBlur1)"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={polarToCartesian(CENTER, CENTER, RADIUS - 16, minuteAngle).x}
          y2={polarToCartesian(CENTER, CENTER, RADIUS - 16, minuteAngle).y}
          stroke="#d90429"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.96"
        />
        <circle cx={CENTER} cy={CENTER} r="6" fill="#111111" />
        <circle cx={CENTER} cy={CENTER} r="3" fill="#d90429" />

        <g>
          <circle cx={CENTER} cy={CENTER} r="104" fill="#ffffff" stroke={activeColor} strokeOpacity="0.22" strokeWidth="3" />
          <circle cx={CENTER} cy={CENTER} r="84" fill="rgba(255,255,255,0.95)" />
          {activeTask ? (
            <>
              <g transform={`translate(${CENTER - 15}, ${CENTER - 48})`}>
                {getTaskIcon(activeTask)}
              </g>
              <text x={CENTER} y={CENTER + 8} textAnchor="middle" className="fill-black text-[24px] font-medium">
                {activeTask.title.length > 16 ? `${activeTask.title.slice(0, 16)}...` : activeTask.title}
              </text>
              <text x={CENTER} y={CENTER + 34} textAnchor="middle" className="fill-[#d90429] text-[12px] tracking-[0.22em]">
                진행 중
              </text>
            </>
          ) : (
            <>
              <text x={CENTER} y={CENTER - 8} textAnchor="middle" className="fill-black text-[20px] tracking-[0.22em]" opacity="0.36">
                비어 있는 시간
              </text>
              <text x={CENTER} y={CENTER + 28} textAnchor="middle" className="fill-black text-[36px] font-semibold">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            </>
          )}
        </g>
      </svg>

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
  visualMode,
  onBack,
  onOpenSettings,
  onCycleVisualMode,
  onTasksChange,
}: {
  date: string;
  tasks: Task[];
  visualMode: VisualMode;
  onBack?: () => void;
  onOpenSettings: () => void;
  onCycleVisualMode: () => void;
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
          <button onClick={onCycleVisualMode} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50" title="비주얼 모드 변경">
            <Sparkles size={18} />
          </button>
          <button onClick={onOpenSettings} className="rounded-full border border-stone-300 bg-white p-3 text-stone-600 shadow-sm transition-colors hover:bg-stone-50">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden px-4 pb-4 md:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-h-[45vh] overflow-hidden rounded-[2rem] border border-white/75 bg-white/40 p-3 shadow-[0_20px_70px_rgba(130,108,77,0.12)] backdrop-blur">
          <CircleScheduler
            tasks={tasks}
            visualMode={visualMode}
            onAddTask={addTask}
            onInspectTask={(task) => setSheetTask(task)}
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
  const [visualMode, setVisualMode] = useState<VisualMode>(() => loadStoredJson(STORAGE_KEYS.visualMode, 'paper'));
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
    persistJson(STORAGE_KEYS.visualMode, visualMode);
  }, [visualMode]);

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
            visualMode={visualMode}
            onOpenSettings={() => setSettingsOpen(true)}
            onCycleVisualMode={() => setVisualMode((current) => cycleVisualMode(current))}
            onTasksChange={(nextTasks) => updateTasksForDate(todayStr, nextTasks)}
          />
        )}

        {activeTab === 'calendar' && selectedDate ? (
          <DayScheduleView
            date={selectedDate}
            tasks={tasksByDate[selectedDate] ?? []}
            visualMode={visualMode}
            onBack={() => setSelectedDate(null)}
            onOpenSettings={() => setSettingsOpen(true)}
            onCycleVisualMode={() => setVisualMode((current) => cycleVisualMode(current))}
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
