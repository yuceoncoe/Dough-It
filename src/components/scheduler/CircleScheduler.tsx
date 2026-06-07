import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag } from '../../types';
import { minutesToAngle, angleToMinutes, minutesToTime } from '../../utils/time';
import { isCurrentMinuteInsideTask, getCenterTaskProgress, getClockTaskColor, getRequiredTrackLaneCount, assignTasksToTrackLanes, SVG_VIEWBOX_MIN, SVG_VIEWBOX_SIZE, CENTER, RADIUS, OUTER_BACKGROUND_RADIUS, TRACK_INNER_RADIUS, getTrackLaneCenterRadius, getDirectionalTextVisuals, OUTER_HOUR_LABELS, CURRENT_HAND_RADIUS, clampArcEnd, hexToRgba, getTrackLaneFillRadii, getBlurProgress } from '../../utils/task';
import { polarToCartesian, describeArc, describeOpenArc } from '../../utils/geometry';
import TaskCreationModal from '../ui/TaskCreationModal';
import CanvasClockSurface from './CanvasClockSurface';

const POMODORO_TICKS = Array.from({ length: 100 }, (_, i) => {
  const angle = i * 3.6;
  const isMajor = i % 10 === 0;
  const isFive = i % 5 === 0;
  const startRadius = isMajor ? TRACK_INNER_RADIUS - 18 : (isFive ? TRACK_INNER_RADIUS - 12 : TRACK_INNER_RADIUS - 8);
  const endRadius = TRACK_INNER_RADIUS;
  const start = polarToCartesian(CENTER, CENTER, startRadius, angle);
  const end = polarToCartesian(CENTER, CENTER, endRadius, angle);
  return {
    id: i,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    stroke: isMajor ? 'rgba(41, 37, 36, 0.28)' : 'rgba(41, 37, 36, 0.12)',
    strokeWidth: isMajor ? 1.6 : 0.8,
  };
});

const clampLabelCoordinate = (value: number, size: number) => (
  Math.max(SVG_VIEWBOX_MIN + size / 2 + 6, Math.min(SVG_VIEWBOX_MIN + SVG_VIEWBOX_SIZE - size / 2 - 6, value))
);

const getTaskLabelText = (title: string) => {
  const trimmed = title.trim();
  return trimmed.length > 8 ? `${trimmed.slice(0, 8)}...` : trimmed;
};

interface ClockHourLabelsProps {
  showCurrentTime: boolean;
  minuteAngle: number | null;
  interactive: boolean;
}

interface ClockTaskTracksProps {
  trackTasks: Array<{ task: Task; startAngle: number; endAngle: number; laneIndex: number }>;
  laneCount: number;
  interactive: boolean;
  getClockTaskColor: (task: Task) => string;
  minuteAngle: number | null;
  animationKey: string;
}

interface ClockPendingArcProps {
  pendingArc: { startAngle: number; endAngle: number } | null;
  hasPendingArcEnd: boolean;
  interactive: boolean;
  beginArcHandleDrag: (event: React.PointerEvent<SVGCircleElement>, handle: 'start' | 'end') => void;
}

interface ClockCurrentTimeHandProps {
  showCurrentTime: boolean;
  minuteAngle: number | null;
}

interface ClockCenterProgressProps {
  centerAction?: { label: string; onClick: () => void };
  displayTask: Task | null;
  clampedActiveTaskProgress: number;
  activeTaskColor: string;
}

const ClockTaskTracks = ({
  trackTasks,
  laneCount,
  interactive,
  getClockTaskColor,
  minuteAngle,
  animationKey,
  renderPart = 'both',
}: ClockTaskTracksProps & { renderPart?: 'arcs' | 'labels' | 'both' }) => {
  const sortedTaskIds = [...trackTasks]
    .sort((a, b) => {
      const aAngle = ((a.startAngle % 360) + 360) % 360;
      const bAngle = ((b.startAngle % 360) + 360) % 360;
      if (Math.abs(aAngle - bAngle) < 0.1) {
        return a.laneIndex - b.laneIndex;
      }
      return aAngle - bAngle;
    })
    .map(t => t.task.id);

  return (
    <g key={`${animationKey}-${renderPart}`} className="pointer-events-none">
      {trackTasks.map(({ task, startAngle, endAngle, laneIndex }) => {
        const laneCenterRadius = getTrackLaneCenterRadius(laneIndex, laneCount);
        const { innerRadius, outerRadius } = getTrackLaneFillRadii(laneIndex, laneCount);
        const laneStrokeWidth = outerRadius - innerRadius;

        const safeEndAngle = clampArcEnd(startAngle, endAngle);
        const midAngle = startAngle + (safeEndAngle - startAngle) / 2;
        const labelPoint = polarToCartesian(CENTER, CENTER, laneCenterRadius, midAngle);
        const labelText = getTaskLabelText(task.title);
        const labelWidth = Math.min(132, Math.max(52, labelText.length * 18 + 24));
        const labelHeight = 30;
        const labelX = clampLabelCoordinate(labelPoint.x, labelWidth);
        const labelY = clampLabelCoordinate(labelPoint.y, labelHeight);
        const isDimmed = task.completed || task.rating === 0;
        const textColor = isDimmed ? 'rgba(120, 113, 108, 0.72)' : 'rgba(41, 37, 36, 0.88)';
        const strokeColor = getClockTaskColor(task);
        
        const progress = minuteAngle === null ? 0 : getBlurProgress(labelPoint, minuteAngle);
        const blurAmount = minuteAngle === null ? 0 : (0.8 + progress * 5.2);
        const alpha = isDimmed ? 0.42 : 0.92;

        const innerOffset = (innerRadius / outerRadius) * 100;
        const animationIndex = sortedTaskIds.indexOf(task.id);
        const interval = trackTasks.length > 0 ? Math.min(80, 400 / trackTasks.length) : 80;
        const delay = animationIndex * interval;
        const arcLength = laneCenterRadius * (safeEndAngle - startAngle) * (Math.PI / 180);

        return (
          <g 
            key={`${interactive ? 'main' : 'preview'}-${task.id}`} 
            className="animate-clock-spin-in-item origin-center pointer-events-none" 
            style={{ 
              animationDelay: `${delay}ms`, 
              transformOrigin: `${CENTER}px ${CENTER}px`,
            }}
          >
            {(renderPart === 'arcs' || renderPart === 'both') && (
              <>
                <defs>
                  <radialGradient 
                    id={`grad-${interactive ? 'main' : 'preview'}-${task.id}`}
                    gradientUnits="userSpaceOnUse"
                    cx={CENTER}
                    cy={CENTER}
                    r={outerRadius}
                  >
                     <stop offset={`${innerOffset}%`} stopColor={hexToRgba(strokeColor, 0.15)} />
                     <stop offset="100%" stopColor={hexToRgba(strokeColor, 0.8)} />
                  </radialGradient>
                </defs>
                <g style={{ filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none', opacity: alpha }}>
                  <path
                    d={describeOpenArc(CENTER, CENTER, laneCenterRadius, startAngle, safeEndAngle)}
                    fill="none"
                    stroke={`url(#grad-${interactive ? 'main' : 'preview'}-${task.id})`}
                    strokeWidth={laneStrokeWidth}
                    strokeLinecap="butt"
                    className="animate-draw-arc"
                    style={{
                      strokeDasharray: arcLength,
                      '--arc-length': `${arcLength}px`,
                      animationDelay: `${delay}ms`,
                    } as React.CSSProperties}
                  />
                </g>
              </>
            )}
            {(renderPart === 'labels' || renderPart === 'both') && (
              <g>
                <rect
                  x={labelX - labelWidth / 2}
                  y={labelY - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx="15"
                  fill="rgba(255,255,255,0.82)"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />
                <text
                  x={labelX}
                  y={labelY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[22px] font-semibold"
                  fill={textColor}
                >
                  {labelText}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

const ClockHourLabels = ({
  showCurrentTime,
  minuteAngle,
  interactive,
}: ClockHourLabelsProps) => {
  return (
    <g className="pointer-events-none">
      {OUTER_HOUR_LABELS.map(({ value, angle, point }) => {
        const { blur, opacity } = showCurrentTime && minuteAngle !== null
          ? getDirectionalTextVisuals(angle, minuteAngle)
          : { blur: 0, opacity: 0.88 };

        return (
          <text
            key={`${interactive ? 'main' : 'preview'}-hour-label-${value}-${angle}`}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-black text-[18px] font-semibold"
            opacity={opacity}
            style={{ filter: `blur(${blur}px)` }}
          >
            {value}
          </text>
        );
      })}
    </g>
  );
};

const ClockPendingArc = ({
  pendingArc,
  hasPendingArcEnd,
  interactive,
  beginArcHandleDrag,
}: ClockPendingArcProps) => {
  if (pendingArc === null) return null;

  return (
    <>
      {hasPendingArcEnd && (
        <path
          d={describeArc(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle, pendingArc.endAngle)}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="5 5"
          pointerEvents="none"
        />
      )}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle).x}
        y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle).y}
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="5 5"
        pointerEvents="none"
      />
      {hasPendingArcEnd && (
        <line
          x1={CENTER}
          y1={CENTER}
          x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.endAngle).x}
          y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.endAngle).y}
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="5 5"
          pointerEvents="none"
        />
      )}
      {(hasPendingArcEnd ? (['start', 'end'] as const) : (['start'] as const)).map((handle) => {
        const angle = handle === 'start' ? pendingArc.startAngle : pendingArc.endAngle;
        const point = polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, angle);
        return interactive ? (
          <circle
            key={`${interactive ? 'main' : 'preview'}-pending-arc-${handle}`}
            cx={point.x}
            cy={point.y}
            r={18}
            fill="transparent"
            stroke="none"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => beginArcHandleDrag(event, handle)}
            pointerEvents="all"
          />
        ) : null;
      })}
    </>
  );
};

const ClockCurrentTimeHand = ({
  showCurrentTime,
  minuteAngle,
}: ClockCurrentTimeHandProps) => {
  if (!showCurrentTime || minuteAngle === null) return null;

  const startPoint = polarToCartesian(CENTER, CENTER, TRACK_INNER_RADIUS, minuteAngle);
  const endPoint = polarToCartesian(CENTER, CENTER, OUTER_BACKGROUND_RADIUS, minuteAngle);

  return (
    <g>
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
        pointerEvents="none"
      />
    </g>
  );
};

const ClockCenterProgress = ({
  centerAction,
  displayTask,
  clampedActiveTaskProgress,
  activeTaskColor,
}: ClockCenterProgressProps) => {
  return (
    <g className="center-progress-surface pointer-events-none">
      <circle className="center-progress-surface__track" cx={CENTER} cy={CENTER} r={TRACK_INNER_RADIUS} filter="url(#center-lens-shadow)" />
      {displayTask && clampedActiveTaskProgress > 0 ? (
        <g>
          <defs>
            <clipPath id="pomodoro-progress-clip">
              <path d={describeArc(CENTER, CENTER, TRACK_INNER_RADIUS, 0, clampedActiveTaskProgress * 360)} />
            </clipPath>
          </defs>
          <foreignObject
            x={CENTER - TRACK_INNER_RADIUS}
            y={CENTER - TRACK_INNER_RADIUS}
            width={TRACK_INNER_RADIUS * 2}
            height={TRACK_INNER_RADIUS * 2}
            clipPath="url(#pomodoro-progress-clip)"
            className="pointer-events-none"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: `conic-gradient(${hexToRgba(activeTaskColor, 0.5)} 0deg, ${hexToRgba(activeTaskColor, 1.0)} ${clampedActiveTaskProgress * 360}deg, transparent ${clampedActiveTaskProgress * 360}deg)`,
              }}
            />
          </foreignObject>
        </g>
      ) : null}
      {POMODORO_TICKS.map((tick) => (
        <line
          key={tick.id}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={tick.stroke}
          strokeWidth={tick.strokeWidth}
        />
      ))}
    </g>
  );
};

export const CircleScheduler = ({
  tasks,
  tasksByDate,
  date,
  onAddTask,
  showCurrentTime = true,
  centerAction,
}: {
  tasks: Task[];
  tasksByDate: Record<string, Task[]>;
  date: string;
  onAddTask: (title: string, tags: Tag[], startTime: string, duration: number) => boolean | void;
  showCurrentTime?: boolean;
  centerAction?: {
    label: string;
    onClick: () => void;
  };
}) => {
  const squareRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sliderDragStartRef = useRef<number | null>(null);
  const sliderPointerIdRef = useRef<number | null>(null);
  const sliderDidSwipeRef = useRef(false);
  const transitionResetRef = useRef<number | null>(null);
  const arcDragHandleRef = useRef<'start' | 'end' | null>(null);
  const arcDragPointerIdRef = useRef<number | null>(null);
  const arcDragMovedRef = useRef(false);
  const dragPreviewFrameRef = useRef<number | null>(null);
  const dragPreviewPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastHapticAngleRef = useRef<number | null>(null);
  const [pendingArc, setPendingArc] = useState<{ startAngle: number; endAngle: number } | null>(null);
  const [hasPendingArcEnd, setHasPendingArcEnd] = useState(false);
  const [activeArcHandle, setActiveArcHandle] = useState<'start' | 'end' | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [overlapIndex, setOverlapIndex] = useState(0);
  const [sliderTransitionDirection, setSliderTransitionDirection] = useState<'from-left' | 'from-right' | null>(null);
  const [dragPreviewPoint, setDragPreviewPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setPendingArc(null);
    setHasPendingArcEnd(false);
    setActiveArcHandle(null);
    setShowCreateModal(false);
  }, [date]);

  useEffect(() => () => {
    if (transitionResetRef.current !== null) {
      window.clearTimeout(transitionResetRef.current);
    }
    if (dragPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(dragPreviewFrameRef.current);
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
    if (distance < 1) {
      return null;
    }
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) {
      angle += 360;
    }
    return Math.round(angle / 1.25) * 1.25;
  };

  const normalizeAngleNearReference = (angle: number, reference: number) => {
    let normalized = angle;
    while (normalized - reference > 180) {
      normalized -= 360;
    }
    while (reference - normalized > 180) {
      normalized += 360;
    }
    return normalized;
  };

  const updateDragPreviewPoint = (clientX: number, clientY: number) => {
    const rect = squareRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    dragPreviewPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    if (dragPreviewFrameRef.current !== null) {
      return;
    }
    dragPreviewFrameRef.current = window.requestAnimationFrame(() => {
      dragPreviewFrameRef.current = null;
      setDragPreviewPoint(dragPreviewPointRef.current);
    });
  };

  const updatePendingArcHandle = (handle: 'start' | 'end', angle: number) => {
    setPendingArc((current) => {
      if (!current) {
        return current;
      }

      const minDurationAngle = 1.25;
      if (handle === 'start') {
        const nextStart = normalizeAngleNearReference(angle, current.startAngle);
        if (hasPendingArcEnd && nextStart >= current.endAngle - minDurationAngle) {
          arcDragHandleRef.current = 'end';
          setActiveArcHandle('end');
          return { startAngle: current.endAngle, endAngle: nextStart + minDurationAngle };
        }
        return { startAngle: nextStart, endAngle: current.endAngle };
      }

      const nextEnd = normalizeAngleNearReference(angle, current.endAngle);
      if (nextEnd <= current.startAngle + minDurationAngle) {
        arcDragHandleRef.current = 'start';
        setActiveArcHandle('start');
        return { startAngle: nextEnd - minDurationAngle, endAngle: current.startAngle };
      }
      return { startAngle: current.startAngle, endAngle: nextEnd };
    });
  };

  const getNearestArcHandle = (angle: number, arc: { startAngle: number; endAngle: number }) => {
    if (!hasPendingArcEnd) {
      return 'start';
    }
    const startDelta = Math.abs(normalizeAngleNearReference(angle, arc.startAngle) - arc.startAngle);
    const endDelta = Math.abs(normalizeAngleNearReference(angle, arc.endAngle) - arc.endAngle);
    return startDelta <= endDelta ? 'start' : 'end';
  };

  const beginArcHandleDrag = (event: React.PointerEvent<SVGCircleElement>, handle: 'start' | 'end') => {
    event.preventDefault();
    event.stopPropagation();
    arcDragHandleRef.current = handle;
    arcDragPointerIdRef.current = event.pointerId;
    arcDragMovedRef.current = false;
    setActiveArcHandle(handle);
    updateDragPreviewPoint(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const beginRingSelection = (event: React.PointerEvent<SVGCircleElement>) => {
    const angle = getPointerAngle(event.clientX, event.clientY);
    if (angle === null) {
      return;
    }

    event.preventDefault();
    arcDragPointerIdRef.current = event.pointerId;
    arcDragMovedRef.current = false;
    updateDragPreviewPoint(event.clientX, event.clientY);

    if (pendingArc === null) {
      arcDragHandleRef.current = 'start';
      setActiveArcHandle('start');
      setHasPendingArcEnd(false);
      setPendingArc({ startAngle: angle, endAngle: angle + 1.25 });
    } else if (!hasPendingArcEnd) {
      arcDragHandleRef.current = 'end';
      setActiveArcHandle('end');
      setHasPendingArcEnd(true);
      setPendingArc((current) => current ? { ...current, endAngle: clampArcEnd(current.startAngle, angle) } : current);
    } else {
      const nearestHandle = getNearestArcHandle(angle, pendingArc);
      arcDragHandleRef.current = nearestHandle;
      setActiveArcHandle(nearestHandle);
      updatePendingArcHandle(nearestHandle, angle);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveArcHandle = (event: React.PointerEvent<SVGSVGElement>) => {
    const handle = arcDragHandleRef.current;
    if (!handle || arcDragPointerIdRef.current !== event.pointerId) {
      return;
    }
    const angle = getPointerAngle(event.clientX, event.clientY);
    if (angle === null) {
      return;
    }
    
    if (lastHapticAngleRef.current !== angle) {
      lastHapticAngleRef.current = angle;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(2);
      }
    }
    
    arcDragMovedRef.current = true;
    updateDragPreviewPoint(event.clientX, event.clientY);
    updatePendingArcHandle(handle, angle);
  };

  const endArcHandleDrag = () => {
    arcDragHandleRef.current = null;
    arcDragPointerIdRef.current = null;
    arcDragMovedRef.current = false;
    dragPreviewPointRef.current = null;
    if (dragPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(dragPreviewFrameRef.current);
      dragPreviewFrameRef.current = null;
    }
    setActiveArcHandle(null);
    setDragPreviewPoint(null);
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes() + Math.floor(now.getSeconds() / 10) / 6;
  const minuteAngle = minutesToAngle(currentMinutes);
  const canvasMinuteAngle = showCurrentTime ? minuteAngle : null;
  const overlappingActiveTasks = showCurrentTime ? tasks.filter((task) => isCurrentMinuteInsideTask(task, currentMinutes)) : [];
  const activeTask = overlappingActiveTasks[0] ?? null;
  const hasOverlapSlider = overlappingActiveTasks.length > 1;
  const safeOverlapIndex = hasOverlapSlider ? overlapIndex % overlappingActiveTasks.length : 0;
  const displayTask = hasOverlapSlider ? overlappingActiveTasks[safeOverlapIndex] : activeTask;
  const activeTaskProgress = showCurrentTime ? getCenterTaskProgress(displayTask, currentMinutes) : 0;
  const clampedActiveTaskProgress = Math.max(0, Math.min(1, activeTaskProgress));
  const activeTaskColor = displayTask ? getClockTaskColor(displayTask) : '#ff7a91';

  const laneCount = getRequiredTrackLaneCount(tasks);
  const trackTasks = assignTasksToTrackLanes(tasks, laneCount);
  const interactionRingRadius = (TRACK_INNER_RADIUS + OUTER_BACKGROUND_RADIUS) / 2;
  const interactionRingWidth = OUTER_BACKGROUND_RADIUS - TRACK_INNER_RADIUS + 28;

  const dragPreviewSize = 176;
  const dragPreviewZoom = 1.9;
  const dragPreviewHalf = dragPreviewSize / 2;
  const schedulerSceneSize = squareRef.current?.getBoundingClientRect().width ?? 0;
  const normalizeClockAngle = (angle: number) => ((angle % 360) + 360) % 360;
  const getPendingSelectionRange = (arc: { startAngle: number; endAngle: number }) => {
    const startMinutes = angleToMinutes(normalizeClockAngle(arc.startAngle));
    const endMinutes = angleToMinutes(normalizeClockAngle(arc.endAngle));
    const duration = (endMinutes - startMinutes + 1440) % 1440 || 5;

    return {
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(startMinutes + duration),
      duration,
    };
  };
  const pendingSelectionRange = pendingArc ? getPendingSelectionRange(pendingArc) : null;
  const animationKey = `${date}-${tasks.map(t => t.id).join('-')}`;

  const renderClockSvgLayers = (interactive: boolean) => (
    <>
      <defs>
        <filter id="center-lens-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="12" stdDeviation="24" floodColor="#000000" floodOpacity="0.12" />
        </filter>
      </defs>
      {interactive ? (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={interactionRingRadius}
          fill="none"
          stroke="transparent"
          strokeWidth={interactionRingWidth}
          style={{ pointerEvents: 'stroke' }}
          onPointerDown={beginRingSelection}
        />
      ) : null}

      <g>
        <ClockTaskTracks
          trackTasks={trackTasks}
          laneCount={laneCount}
          interactive={interactive}
          getClockTaskColor={getClockTaskColor}
          minuteAngle={canvasMinuteAngle}
          animationKey={animationKey}
          renderPart="arcs"
        />
      </g>

      <ClockHourLabels
        showCurrentTime={showCurrentTime}
        minuteAngle={canvasMinuteAngle}
        interactive={interactive}
      />

      <ClockPendingArc
        pendingArc={pendingArc}
        hasPendingArcEnd={hasPendingArcEnd}
        interactive={interactive}
        beginArcHandleDrag={beginArcHandleDrag}
      />

      <ClockCurrentTimeHand
        showCurrentTime={showCurrentTime}
        minuteAngle={canvasMinuteAngle}
      />

      <ClockCenterProgress
        centerAction={centerAction}
        displayTask={displayTask}
        clampedActiveTaskProgress={clampedActiveTaskProgress}
        activeTaskColor={activeTaskColor}
      />

      <g>
        <ClockTaskTracks
          trackTasks={trackTasks}
          laneCount={laneCount}
          interactive={interactive}
          getClockTaskColor={getClockTaskColor}
          minuteAngle={canvasMinuteAngle}
          animationKey={animationKey}
          renderPart="labels"
        />
      </g>
    </>
  );

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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-[#f0f0f4]">
      <TaskCreationModal
        isOpen={showCreateModal}
        initialTimeRange={{
          start: pendingSelectionRange?.startTime ?? '',
          end: pendingSelectionRange?.endTime ?? '',
        }}
        onClose={() => {
          setShowCreateModal(false);
          setPendingArc(null);
          setHasPendingArcEnd(false);
          setActiveArcHandle(null);
        }}
        onSave={(title, tags) => {
          if (!pendingArc) {
            return;
          }
          const { startTime, duration } = getPendingSelectionRange(pendingArc);
          const success = onAddTask(title, tags, startTime, duration);
          if (success === false) {
            return;
          }
          setShowCreateModal(false);
          setPendingArc(null);
          setHasPendingArcEnd(false);
          setActiveArcHandle(null);
        }}
      />

      <div ref={squareRef} className="relative aspect-square w-full max-w-[850px]">
        <div className="relative h-full w-full">
          <CanvasClockSurface tasks={tasks} minuteAngle={canvasMinuteAngle} layer="background" />

          <svg
            ref={svgRef}
            viewBox={`${SVG_VIEWBOX_MIN} ${SVG_VIEWBOX_MIN} ${SVG_VIEWBOX_SIZE} ${SVG_VIEWBOX_SIZE}`}
            className="absolute inset-0 h-full w-full select-none"
            style={{ touchAction: 'none' }}
            onPointerMove={moveArcHandle}
            onPointerUp={endArcHandleDrag}
            onPointerCancel={endArcHandleDrag}
          >
            {renderClockSvgLayers(true)}
          </svg>
        </div>
        {dragPreviewPoint && schedulerSceneSize > 0 ? (
          <div
            className="drag-preview-lens"
            style={{
              width: `${dragPreviewSize}px`,
              height: `${dragPreviewSize}px`,
              left: `clamp(${dragPreviewHalf}px, ${dragPreviewPoint.x}px, calc(100% - ${dragPreviewHalf}px))`,
              top: `clamp(${dragPreviewHalf}px, calc(${dragPreviewPoint.y}px - 118px), calc(100% - ${dragPreviewHalf}px))`,
            }}
            aria-hidden="true"
          >
            <div
              className="drag-preview-lens__scene"
              style={{
                width: `${schedulerSceneSize}px`,
                height: `${schedulerSceneSize}px`,
                transform: `translate(${dragPreviewHalf - dragPreviewPoint.x * dragPreviewZoom}px, ${dragPreviewHalf - dragPreviewPoint.y * dragPreviewZoom}px) scale(${dragPreviewZoom})`,
              }}
            >
              <div className="relative h-full w-full">
                <CanvasClockSurface tasks={tasks} minuteAngle={canvasMinuteAngle} layer="background" />
                <svg
                  viewBox={`${SVG_VIEWBOX_MIN} ${SVG_VIEWBOX_MIN} ${SVG_VIEWBOX_SIZE} ${SVG_VIEWBOX_SIZE}`}
                  className="absolute inset-0 h-full w-full select-none pointer-events-none"
                >
                  {renderClockSvgLayers(false)}
                </svg>
              </div>
            </div>
          </div>
        ) : null}
        {pendingArc !== null && !showCreateModal && (
          <div className="absolute inset-x-4 bottom-4 z-30 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPendingArc(null);
                setHasPendingArcEnd(false);
                setActiveArcHandle(null);
              }}
              className="flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-white/90 px-4 text-xs font-semibold text-stone-600 shadow-sm backdrop-blur"
            >
              취소
            </button>
            {hasPendingArcEnd ? (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-stone-900 px-5 text-xs font-semibold text-white shadow-sm"
              >
                {activeArcHandle
                  ? `${activeArcHandle === 'start' ? '시작' : '종료'} ${minutesToTime(angleToMinutes(normalizeClockAngle(activeArcHandle === 'start' ? pendingArc.startAngle : pendingArc.endAngle)))}`
                  : `${pendingSelectionRange?.startTime} - ${pendingSelectionRange?.endTime} 추가`}
              </button>
            ) : (
              <div className="flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-white/90 px-4 text-xs font-semibold text-stone-500 shadow-sm backdrop-blur">
                {activeArcHandle === 'start'
                  ? `시작 ${minutesToTime(angleToMinutes(normalizeClockAngle(pendingArc.startAngle)))}`
                  : '종료 시간을 터치하세요'}
              </div>
            )}
          </div>
        )}
        <div className="center-stack">
          {centerAction ? (
            <button type="button" className="center-lens center-lens--button" onClick={centerAction.onClick}>
              <span className="center-lens__title center-lens__title--button">
                {centerAction.label}
              </span>
            </button>
          ) : (
            <>
              {hasOverlapSlider && (
                <div
                  className="center-carousel"
                  onPointerDown={(event) => {
                    sliderDragStartRef.current = event.clientX;
                    sliderPointerIdRef.current = event.pointerId;
                    sliderDidSwipeRef.current = false;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (sliderDragStartRef.current === null || sliderDidSwipeRef.current) {
                      return;
                    }
                    if (sliderPointerIdRef.current !== event.pointerId) {
                      return;
                    }
                    const delta = event.clientX - sliderDragStartRef.current;
                    if (Math.abs(delta) < 24) {
                      return;
                    }
                    sliderDidSwipeRef.current = true;
                    sliderDragStartRef.current = null;
                    moveOverlapSlider(delta < 0 ? 1 : -1);
                  }}
                  onPointerUp={(event) => {
                    if (sliderDragStartRef.current === null) {
                      sliderPointerIdRef.current = null;
                      return;
                    }
                    const delta = event.clientX - sliderDragStartRef.current;
                    sliderDragStartRef.current = null;
                    sliderPointerIdRef.current = null;
                    if (sliderDidSwipeRef.current) {
                      sliderDidSwipeRef.current = false;
                      return;
                    }
                    if (Math.abs(delta) < 28) {
                      return;
                    }
                    moveOverlapSlider(delta < 0 ? 1 : -1);
                  }}
                  onPointerCancel={() => {
                    sliderDragStartRef.current = null;
                    sliderPointerIdRef.current = null;
                    sliderDidSwipeRef.current = false;
                  }}
                  onPointerLeave={() => {
                    if (sliderDidSwipeRef.current) {
                      sliderDragStartRef.current = null;
                      sliderPointerIdRef.current = null;
                      sliderDidSwipeRef.current = false;
                    }
                  }}
                >
                  <div className="center-carousel__pager" aria-hidden="true">
                    {overlappingActiveTasks.map((task, index) => (
                      <span key={task.id} className={`center-carousel__dot ${index === safeOverlapIndex ? 'is-active' : ''}`} />
                    ))}
                  </div>
                </div>
              )}
              <div className={`center-progress-shell ${sliderTransitionDirection ? `is-transitioning ${sliderTransitionDirection}` : ''} flex flex-col items-center justify-center`} aria-hidden="true">
                {displayTask ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div
                      className="pointer-events-none block w-fit max-w-[120px] truncate whitespace-nowrap rounded-full bg-white/80 px-[0.82rem] pb-[0.46rem] pt-[0.5rem] text-center text-[14px] font-bold leading-none shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_6px_14px_rgba(0,0,0,0.08)]"
                      style={{ color: activeTaskColor }}
                    >
                      {displayTask.title}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-stone-400/80 text-[13px] font-medium tracking-tight">
                      지금은 일정이 없어요
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircleScheduler;
