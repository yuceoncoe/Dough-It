import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag } from '../../types';
import { minutesToAngle, angleToMinutes, minutesToTime } from '../../utils/time';
import { isCurrentMinuteInsideTask, getCenterTaskProgress, getClockTaskColor, getRequiredTrackLaneCount, assignTasksToTrackLanes, SVG_VIEWBOX_MIN, SVG_VIEWBOX_SIZE, CENTER, RADIUS, OUTER_BACKGROUND_RADIUS, TRACK_INNER_RADIUS, getTrackLaneCenterRadius, getDirectionalTextVisuals, OUTER_HOUR_LABELS, CURRENT_HAND_RADIUS, clampArcEnd, hexToRgba } from '../../utils/task';
import { polarToCartesian, describeArc } from '../../utils/geometry';
import TaskCreationModal from '../ui/TaskCreationModal';
import CanvasClockSurface from './CanvasClockSurface';

export const CircleScheduler = ({
  tasks,
  onAddTask,
  showCurrentTime = true,
  centerAction,
}: {
  tasks: Task[];
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
  const clampLabelCoordinate = (value: number, size: number) => (
    Math.max(SVG_VIEWBOX_MIN + size / 2 + 6, Math.min(SVG_VIEWBOX_MIN + SVG_VIEWBOX_SIZE - size / 2 - 6, value))
  );
  const getTaskLabelText = (title: string) => {
    const trimmed = title.trim();
    return trimmed.length > 8 ? `${trimmed.slice(0, 8)}...` : trimmed;
  };
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

  const renderClockSvgLayers = (interactive: boolean) => (
    <>
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
      <line
        x1={CENTER}
        y1={CENTER - (OUTER_BACKGROUND_RADIUS - 30)}
        x2={CENTER}
        y2={CENTER + (OUTER_BACKGROUND_RADIUS - 30)}
        stroke="rgba(20, 20, 20, 0.06)"
        strokeWidth="0.9"
      />
      <g className="pointer-events-none">
        {trackTasks.map(({ task, startAngle, endAngle, laneIndex }) => {
          const laneCenterRadius = getTrackLaneCenterRadius(laneIndex, laneCount);
          const safeEndAngle = clampArcEnd(startAngle, endAngle);
          const midAngle = startAngle + (safeEndAngle - startAngle) / 2;
          const labelPoint = polarToCartesian(CENTER, CENTER, laneCenterRadius, midAngle);
          const labelText = getTaskLabelText(task.title);
          const labelWidth = Math.min(132, Math.max(52, labelText.length * 18 + 24));
          const labelHeight = 30;
          const labelX = clampLabelCoordinate(labelPoint.x, labelWidth);
          const labelY = clampLabelCoordinate(labelPoint.y, labelHeight);
          const isCompleted = task.completed;
          const textColor = isCompleted ? 'rgba(120, 113, 108, 0.72)' : 'rgba(41, 37, 36, 0.88)';

          return (
            <g key={`${interactive ? 'main' : 'preview'}-${task.id}-label`} className="pointer-events-none">
              <rect
                x={labelX - labelWidth / 2}
                y={labelY - labelHeight / 2}
                width={labelWidth}
                height={labelHeight}
                rx="15"
                fill="rgba(255,255,255,0.82)"
                stroke="rgba(214,211,209,0.72)"
                strokeWidth="1"
              />
              <text
                x={labelX}
                y={labelY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[18px] font-semibold"
                fill={textColor}
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </g>
      <g className="pointer-events-none">
        {OUTER_HOUR_LABELS.map(({ value, angle, point }) => {
          const { blur, opacity } = showCurrentTime
            ? getDirectionalTextVisuals(angle, minuteAngle)
            : { blur: 0, opacity: 0.88 };

          return (
            <text
              key={`${interactive ? 'main' : 'preview'}-hour-label-${value}-${angle}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-black text-[16px] font-semibold"
              opacity={opacity}
              style={{ filter: `blur(${blur}px)` }}
            >
              {value}
            </text>
          );
        })}
      </g>

      {pendingArc !== null && (
        <>
          {hasPendingArcEnd && (
            <path
              d={describeArc(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle, pendingArc.endAngle)}
              fill="rgba(217, 4, 41, 0.12)"
              stroke="#d90429"
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
            stroke="#d90429"
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
              stroke="#d90429"
              strokeWidth="2"
              strokeDasharray="5 5"
              pointerEvents="none"
            />
          )}
          {(hasPendingArcEnd ? ['start', 'end'] as const : ['start'] as const).map((handle) => {
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
      )}

      {showCurrentTime ? (
        <line
          x1={CENTER}
          y1={CENTER}
          x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, minuteAngle).x}
          y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, minuteAngle).y}
          stroke="#d90429"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.96"
          pointerEvents="none"
        />
      ) : null}
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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-[#f6f6f8]">
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

      <div ref={squareRef} className="relative aspect-square w-full max-w-[760px]">
        <div className="relative h-full w-full">
        <CanvasClockSurface tasks={tasks} minuteAngle={canvasMinuteAngle} />

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
                <CanvasClockSurface tasks={tasks} minuteAngle={canvasMinuteAngle} />
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
              className="rounded-full border border-stone-300 bg-white/90 px-4 py-2 text-xs font-semibold text-stone-600 shadow-sm backdrop-blur"
            >
              취소
            </button>
            {hasPendingArcEnd ? (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-sm"
              >
                {activeArcHandle
                  ? `${activeArcHandle === 'start' ? '시작' : '종료'} ${minutesToTime(angleToMinutes(normalizeClockAngle(activeArcHandle === 'start' ? pendingArc.startAngle : pendingArc.endAngle)))}`
                  : `${pendingSelectionRange?.startTime} - ${pendingSelectionRange?.endTime} 추가`}
              </button>
            ) : (
              <div className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-stone-500 shadow-sm backdrop-blur">
                {activeArcHandle === 'start'
                  ? `시작 ${minutesToTime(angleToMinutes(normalizeClockAngle(pendingArc.startAngle)))}`
                  : '종료 시간을 터치하세요'}
              </div>
            )}
          </div>
        )}
        <div
          className="center-stack"
        >
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
              <div className={`center-progress-shell ${sliderTransitionDirection ? `is-transitioning ${sliderTransitionDirection}` : ''}`} aria-hidden="true">
                <svg className="center-progress-arc" viewBox="0 0 120 120">
                  <circle className="center-progress-arc__track" cx="60" cy="60" r="56" />
                  {displayTask && clampedActiveTaskProgress > 0 ? (
                    <path
                      className="center-progress-arc__value"
                      d={describeArc(60, 60, 56, 0, clampedActiveTaskProgress * 360)}
                      fill={hexToRgba(activeTaskColor, 0.28)}
                    />
                  ) : null}
                </svg>
                <div
                  className={`center-lens__title ${sliderTransitionDirection ? `is-transitioning ${sliderTransitionDirection}` : ''}`}
                  style={{ color: displayTask ? activeTaskColor : 'rgba(214, 211, 209, 0.92)' }}
                >
                  {displayTask ? displayTask.title : '비어 있음'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default CircleScheduler;
