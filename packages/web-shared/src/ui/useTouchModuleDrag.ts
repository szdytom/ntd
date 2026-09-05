import { useEffect, type RefObject } from 'react';
import type { ModuleId } from '@prism-bastion/game-core/game/types';

const HOLD_TO_DRAG_MS = 180;
const MOVE_TOLERANCE_PX = 8;

type DragSource =
  | { type: 'module'; moduleId: ModuleId }
  | { type: 'slot'; slot: number };

interface TouchGesture {
  touchId: number;
  startX: number;
  startY: number;
  source: DragSource;
  sourceElement: HTMLElement;
  targetElement: HTMLElement | null;
  active: boolean;
  holdTimer: number;
}

const sourceFrom = (target: EventTarget | null): { source: DragSource; element: HTMLElement } | null => {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>('[data-touch-module], [data-touch-slot]');
  if (!element) return null;
  const moduleId = element.dataset.touchModule;
  if (moduleId) return { source: { type: 'module', moduleId }, element };
  const slot = Number(element.dataset.touchSlot);
  return Number.isInteger(slot) ? { source: { type: 'slot', slot }, element } : null;
};

const findTouch = (touches: TouchList, touchId: number): Touch | null => {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches[index];
    if (touch?.identifier === touchId) return touch;
  }
  return null;
};

export function useTouchModuleDrag(
  rootRef: RefObject<HTMLElement | null>,
  installModule: (slot: number, moduleId: ModuleId) => void,
  swapModules: (source: number, destination: number) => void,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let gesture: TouchGesture | null = null;

    const clearTarget = (): void => {
      gesture?.targetElement?.classList.remove('drag-over');
      if (gesture) gesture.targetElement = null;
    };
    const reset = (): void => {
      if (!gesture) return;
      window.clearTimeout(gesture.holdTimer);
      clearTarget();
      gesture.sourceElement.classList.remove('touch-dragging');
      gesture = null;
    };
    const targetAt = (clientX: number, clientY: number): HTMLElement | null => {
      const hit = document.elementFromPoint(clientX, clientY);
      const target = hit?.closest<HTMLElement>('.module-slot[data-slot]') ?? null;
      return target && root.contains(target) ? target : null;
    };
    const updateTarget = (clientX: number, clientY: number): void => {
      if (!gesture) return;
      const target = targetAt(clientX, clientY);
      if (target === gesture.targetElement) return;
      clearTarget();
      gesture.targetElement = target;
      target?.classList.add('drag-over');
    };

    const touchStart = (event: TouchEvent): void => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      const found = sourceFrom(event.target);
      const touch = event.touches[0];
      if (!found || !touch || !root.contains(found.element)) return;
      reset();
      const nextGesture: TouchGesture = {
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        source: found.source,
        sourceElement: found.element,
        targetElement: null,
        active: false,
        holdTimer: 0,
      };
      nextGesture.holdTimer = window.setTimeout(() => {
        if (gesture !== nextGesture) return;
        nextGesture.active = true;
        nextGesture.sourceElement.classList.add('touch-dragging');
      }, HOLD_TO_DRAG_MS);
      gesture = nextGesture;
    };

    const touchMove = (event: TouchEvent): void => {
      if (!gesture) return;
      const touch = findTouch(event.touches, gesture.touchId);
      if (!touch) return;
      if (!gesture.active) {
        const distance = Math.hypot(touch.clientX - gesture.startX, touch.clientY - gesture.startY);
        if (distance > MOVE_TOLERANCE_PX) reset();
        return;
      }
      event.preventDefault();
      updateTarget(touch.clientX, touch.clientY);
    };

    const touchEnd = (event: TouchEvent): void => {
      if (!gesture) return;
      const touch = findTouch(event.changedTouches, gesture.touchId);
      if (!touch) return;
      if (!gesture.active) {
        reset();
        return;
      }
      event.preventDefault();
      const target = targetAt(touch.clientX, touch.clientY);
      const destination = Number(target?.dataset.slot);
      if (Number.isInteger(destination)) {
        if (gesture.source.type === 'module') installModule(destination, gesture.source.moduleId);
        else swapModules(gesture.source.slot, destination);
      }
      reset();
    };

    const contextMenu = (event: MouseEvent): void => {
      if (gesture?.active && sourceFrom(event.target)) event.preventDefault();
    };
    const nativeDragStart = (event: DragEvent): void => {
      if (gesture && sourceFrom(event.target)?.element === gesture.sourceElement) reset();
    };

    root.addEventListener('touchstart', touchStart, { passive: true });
    root.addEventListener('touchmove', touchMove, { passive: false });
    root.addEventListener('touchend', touchEnd, { passive: false });
    root.addEventListener('touchcancel', reset);
    root.addEventListener('contextmenu', contextMenu);
    root.addEventListener('dragstart', nativeDragStart, true);
    return () => {
      reset();
      root.removeEventListener('touchstart', touchStart);
      root.removeEventListener('touchmove', touchMove);
      root.removeEventListener('touchend', touchEnd);
      root.removeEventListener('touchcancel', reset);
      root.removeEventListener('contextmenu', contextMenu);
      root.removeEventListener('dragstart', nativeDragStart, true);
    };
  }, [installModule, rootRef, swapModules]);
}
