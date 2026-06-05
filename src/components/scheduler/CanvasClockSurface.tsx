import React, { useEffect, useRef, useState } from 'react';
import { Task } from '../../types';
import { renderClockScene, SVG_VIEWBOX_MIN, SVG_VIEWBOX_SIZE } from '../../utils/task';

export const CanvasClockSurface = ({
  tasks,
  minuteAngle,
  layer = 'all',
}: {
  tasks: Task[];
  minuteAngle: number | null;
  layer?: 'background' | 'tasks' | 'all';
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
      renderClockScene(offscreenCtx, tasks, minuteAngle, layer);

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

export default CanvasClockSurface;
