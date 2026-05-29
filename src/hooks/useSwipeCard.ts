import { useRef, useState, PointerEvent } from 'react';

export const useSwipeCard = () => {
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ id: string; x: number; y: number; isHorizontal: boolean | null } | null>(null);
  const swipeCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const setSwipeCardOffset = (taskId: string, offset: number, animated: boolean) => {
    const card = swipeCardRefs.current[taskId];
    if (card) {
      card.style.transition = animated ? 'transform 180ms ease' : 'none';
      card.style.transform = `translateX(${offset}px)`;
    }
  };

  const registerCardRef = (taskId: string) => (node: HTMLButtonElement | null) => {
    swipeCardRefs.current[taskId] = node;
  };

  const resetSwipe = (taskId: string) => {
    setSwipeCardOffset(taskId, 0, true);
    if (swipedTaskId === taskId) {
      setSwipedTaskId(null);
    }
  };

  const getPointerHandlers = (taskId: string) => {
    const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
      setSwipeCardOffset(taskId, swipedTaskId === taskId ? -80 : 0, false);
      swipeStartRef.current = { id: taskId, x: event.clientX, y: event.clientY, isHorizontal: null };
    };

    const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
      const start = swipeStartRef.current;
      if (!start || start.id !== taskId) {
        return;
      }
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (start.isHorizontal === null) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
          return;
        }
        start.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
      }
      if (!start.isHorizontal) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const baseOffset = swipedTaskId === taskId ? -80 : 0;
      const nextOffset = Math.max(-96, Math.min(0, baseOffset + deltaX));
      setSwipeCardOffset(taskId, nextOffset, false);
    };

    const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start || start.id !== taskId) {
        return;
      }
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (!start.isHorizontal && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const baseOffset = swipedTaskId === taskId ? -80 : 0;
      const currentOffset = Math.max(-96, Math.min(0, baseOffset + deltaX));
      const shouldOpen = currentOffset <= -42;
      setSwipedTaskId(shouldOpen ? taskId : null);
      setSwipeCardOffset(taskId, shouldOpen ? -80 : 0, true);
    };

    const handlePointerCancel = () => {
      swipeStartRef.current = null;
      setSwipeCardOffset(taskId, swipedTaskId === taskId ? -80 : 0, true);
    };

    return {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    };
  };

  const getCardStyle = (taskId: string) => {
    return {
      transform: `translateX(${swipedTaskId === taskId ? -80 : 0}px)`,
      touchAction: 'pan-y',
    } as const;
  };

  return {
    swipedTaskId,
    setSwipedTaskId,
    registerCardRef,
    getPointerHandlers,
    getCardStyle,
    resetSwipe,
  };
};
