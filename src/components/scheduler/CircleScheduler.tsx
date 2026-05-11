import React, { useEffect, useRef, useState } from 'react';
import { Task, Tag } from '../../types';
import { minutesToAngle, angleToMinutes, minutesToTime } from '../../utils/time';
import { isCurrentMinuteInsideTask, getCenterTaskProgress, getClockTaskColor, getRequiredTrackLaneCount, assignTasksToTrackLanes, SVG_VIEWBOX_MIN, SVG_VIEWBOX_SIZE, CENTER, RADIUS, OUTER_BACKGROUND_RADIUS, getTrackLaneCenterRadius, getDirectionalTextVisuals, OUTER_HOUR_LABELS, CURRENT_HAND_RADIUS, clampArcEnd, hexToRgba } from '../../utils/task';
import { polarToCartesian, describeArc } from '../../utils/geometry';
import TaskCreationModal from '../ui/TaskCreationModal';
import CanvasClockSurface from './CanvasClockSurface';

export const CircleScheduler = ({
  tasks,
  onAddTask,
}: {
  tasks: Task[];
  onAddTask: (title: string, tags: Tag[], startTime: string, duration: number) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const sliderDragStartRef = useRef<number | null>(null);
  const sliderPointerIdRef = useRef<number | null>(null);
  const sliderDidSwipeRef = useRef(false);
  const transitionResetRef = useRef<number | null>(null);
  const arcDragHandleRef = useRef<'start' | 'end' | null>(null);
  const arcDragPointerIdRef = useRef<number | null>(null);
  const arcDragMovedRef = useRef(false);
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
    setAnchorAngle(null);
    setHoverAngle(null);
  };

  const handleRingClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (arcDragMovedRef.current) {
      arcDragMovedRef.current = false;
      return;
    }
    if (pendingArc !== null) {
      return;
    }
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

  const updatePendingArcHandle = (handle: 'start' | 'end', angle: number) => {
    setPendingArc((current) => {
      if (!current) {
        return current;
      }

      const minDurationAngle = 1.25;
      if (handle === 'start') {
        const nextStart = Math.max(
          current.endAngle - 360,
          Math.min(current.endAngle - minDurationAngle, normalizeAngleNearReference(angle, current.startAngle)),
        );
        return { startAngle: nextStart, endAngle: current.endAngle };
      }

      const nextEnd = Math.max(
        current.startAngle + minDurationAngle,
        Math.min(current.startAngle + 360, normalizeAngleNearReference(angle, current.endAngle)),
      );
      return { startAngle: current.startAngle, endAngle: nextEnd };
    });
  };

  const beginArcHandleDrag = (event: React.PointerEvent<SVGCircleElement>, handle: 'start' | 'end') => {
    event.preventDefault();
    event.stopPropagation();
    arcDragHandleRef.current = handle;
    arcDragPointerIdRef.current = event.pointerId;
    arcDragMovedRef.current = false;
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
    updatePendingArcHandle(handle, angle);
  };

  const endArcHandleDrag = () => {
    arcDragHandleRef.current = null;
    arcDragPointerIdRef.current = null;
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
  const laneCount = getRequiredTrackLaneCount(tasks);
  const trackTasks = assignTasksToTrackLanes(tasks, laneCount);
  const clampLabelCoordinate = (value: number, size: number) => (
    Math.max(SVG_VIEWBOX_MIN + size / 2 + 6, Math.min(SVG_VIEWBOX_MIN + SVG_VIEWBOX_SIZE - size / 2 - 6, value))
  );
  const getTaskLabelText = (title: string) => {
    const trimmed = title.trim();
    return trimmed.length > 8 ? `${trimmed.slice(0, 8)}...` : trimmed;
  };

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
        <div className="relative h-full w-full">
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
          onPointerMove={moveArcHandle}
          onPointerUp={endArcHandleDrag}
          onPointerCancel={endArcHandleDrag}
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
              <g key={`${task.id}-label`} className="pointer-events-none">
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
        <g>
          {OUTER_HOUR_LABELS.map(({ value, angle, point }) => (
            (() => {
              const { blur, opacity } = getDirectionalTextVisuals(angle, minuteAngle);

              return (
                <text
                  key={`hour-label-${value}-${angle}`}
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
            })()
          ))}
        </g>

        {anchorAngle !== null && (
          <>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, anchorAngle).x}
              y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, anchorAngle).y}
              stroke="#d90429"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <circle
              cx={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, anchorAngle).x}
              cy={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, anchorAngle).y}
              r="5"
              fill="#d90429"
            />
          </>
        )}

        {anchorAngle !== null && hoverAngle !== null && hoverAngle !== anchorAngle && (
          <path
            d={describeArc(CENTER, CENTER, CURRENT_HAND_RADIUS, anchorAngle, clampArcEnd(anchorAngle, hoverAngle))}
            fill="rgba(217, 4, 41, 0.12)"
            stroke="#d90429"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        )}

        {pendingArc !== null && (
          <>
            <path
              d={describeArc(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle, pendingArc.endAngle)}
              fill="rgba(217, 4, 41, 0.12)"
              stroke="#d90429"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <line
              x1={CENTER}
              y1={CENTER}
              x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle).x}
              y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.startAngle).y}
              stroke="#d90429"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <line
              x1={CENTER}
              y1={CENTER}
              x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.endAngle).x}
              y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, pendingArc.endAngle).y}
              stroke="#d90429"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            {(['start', 'end'] as const).map((handle) => {
              const angle = handle === 'start' ? pendingArc.startAngle : pendingArc.endAngle;
              const point = polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, angle);
              return (
                <circle
                  key={`pending-arc-${handle}`}
                  cx={point.x}
                  cy={point.y}
                  r="10"
                  fill="#d90429"
                  stroke="#ffffff"
                  strokeWidth="4"
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(event) => beginArcHandleDrag(event, handle)}
                />
              );
            })}
          </>
        )}

        <line
          x1={CENTER}
          y1={CENTER}
          x2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, minuteAngle).x}
          y2={polarToCartesian(CENTER, CENTER, CURRENT_HAND_RADIUS, minuteAngle).y}
          stroke="#d90429"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.96"
        />
        </svg>
        </div>
        {pendingArc !== null && !showCreateModal && (
          <div className="absolute inset-x-4 bottom-4 z-30 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPendingArc(null)}
              className="rounded-full border border-stone-300 bg-white/90 px-4 py-2 text-xs font-semibold text-stone-600 shadow-sm backdrop-blur"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-sm"
            >
              {minutesToTime(angleToMinutes(pendingArc.startAngle % 360))} - {minutesToTime(angleToMinutes(pendingArc.endAngle % 360))} 추가
            </button>
          </div>
        )}
        <div
          className="center-stack"
        >
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
              {displayTask ? displayTask.title : '비어 있음'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CircleScheduler;
