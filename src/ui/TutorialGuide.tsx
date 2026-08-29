import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WORLD } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { GameViewSnapshot } from '../game/types';
import './TutorialGuide.css';

type TutorialAction = 'select-tower' | 'place-tower' | 'click-element';

interface TutorialDrag {
  sourceSelector: string;
  targetSelector: string;
  moduleId: string;
  targetSlot: number;
  sourceSlot?: number;
}

interface TutorialStep {
  id: string;
  selector?: string;
  action?: TutorialAction;
  drag?: TutorialDrag;
}

const STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
  },
  {
    id: 'tower',
    action: 'select-tower',
  },
  {
    id: 'frost-drag',
    drag: {
      sourceSelector: '[data-tutorial-module="frost"]',
      targetSelector: '[data-tutorial-slot="0"]',
      moduleId: 'frost',
      targetSlot: 0,
    },
  },
  {
    id: 'pulse-drag-first',
    drag: {
      sourceSelector: '[data-tutorial-module="pulse"]',
      targetSelector: '[data-tutorial-slot="1"]',
      moduleId: 'pulse',
      targetSlot: 1,
    },
  },
  {
    id: 'first-program',
    selector: '[data-tutorial-program]',
  },
  {
    id: 'close-first-workshop',
    selector: '[data-tutorial-workshop-close]',
    action: 'click-element',
  },
  {
    id: 'build-second-tower',
    action: 'place-tower',
  },
  {
    id: 'second-pulse-drag',
    drag: {
      sourceSelector: '[data-tutorial-module="pulse"]',
      targetSelector: '[data-tutorial-slot="0"]',
      moduleId: 'pulse',
      targetSlot: 0,
    },
  },
  {
    id: 'close-second-workshop',
    selector: '[data-tutorial-workshop-close]',
    action: 'click-element',
  },
  {
    id: 'launch-one',
    selector: '[data-tutorial-launch]',
    action: 'click-element',
  },
  {
    id: 'wait-first-wave',
  },
  {
    id: 'ensure-tower',
    action: 'select-tower',
  },
  {
    id: 'move-pulse',
    drag: {
      sourceSelector: '[data-tutorial-slot="1"]',
      targetSelector: '[data-tutorial-slot="2"]',
      moduleId: 'pulse',
      sourceSlot: 1,
      targetSlot: 2,
    },
  },
  {
    id: 'trigger-drag',
    drag: {
      sourceSelector: '[data-tutorial-module="impact-trigger"]',
      targetSelector: '[data-tutorial-slot="1"]',
      moduleId: 'impact-trigger',
      targetSlot: 1,
    },
  },
  {
    id: 'static-drag',
    drag: {
      sourceSelector: '[data-tutorial-module="proximity-mine"]',
      targetSelector: '[data-tutorial-slot="3"]',
      moduleId: 'proximity-mine',
      targetSlot: 3,
    },
  },
  {
    id: 'final-program',
    selector: '[data-tutorial-program]',
  },
  {
    id: 'close-final-workshop',
    selector: '[data-tutorial-workshop-close]',
    action: 'click-element',
  },
  {
    id: 'launch-two',
    selector: '[data-tutorial-launch]',
    action: 'click-element',
  },
] as const;

const WRONG_TOWER_STEP: TutorialStep = {
  id: 'ensure-wrong-tower',
  selector: '[data-tutorial-workshop-close]',
  action: 'click-element',
};

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PanelPosition {
  x: number;
  y: number;
}

interface PanelDrag {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

const elementBox = (element: Element): TargetBox => {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

export function TutorialGuide({ engine, view }: { engine: GameEngine; view: GameViewSnapshot }) {
  const { t, i18n } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [target, setTarget] = useState<TargetBox | null>(null);
  const [secondaryTarget, setSecondaryTarget] = useState<TargetBox | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelDragRef = useRef<PanelDrag | null>(null);
  const rawStep = STEPS[stepIndex];
  const tutorialTowerId = engine.towers[0]?.id;
  const wrongTowerSelected = rawStep?.id === 'ensure-tower'
    && view.selectedTower !== null
    && view.selectedTower.id !== tutorialTowerId;
  const step = wrongTowerSelected ? WRONG_TOWER_STEP : rawStep;
  const stepKey = (field: 'eyebrow' | 'title' | 'body' | 'instruction' | 'continue'): string => `tutorial.steps.${step?.id}.${field}`;
  const stepText = (field: 'eyebrow' | 'title' | 'body' | 'instruction' | 'continue'): string => t(stepKey(field));
  const hasStepText = (field: 'instruction' | 'continue'): boolean => i18n.exists(stepKey(field));

  useEffect(() => {
    if (rawStep?.id === 'wait-first-wave' && view.game.wave >= 1 && view.game.status === 'planning') {
      setStepIndex((index) => index + 1);
      return;
    }
    if (rawStep?.id === 'ensure-tower' && view.selectedTower?.id === tutorialTowerId) {
      setStepIndex((index) => index + 1);
      return;
    }
    if (rawStep?.drag && view.selectedTower?.slots[rawStep.drag.targetSlot] === rawStep.drag.moduleId) {
      const sourceCleared = rawStep.drag.sourceSlot === undefined
        || view.selectedTower.slots[rawStep.drag.sourceSlot] === null;
      if (sourceCleared) setStepIndex((index) => index + 1);
    }
  }, [rawStep, tutorialTowerId, view.game.status, view.game.wave, view.revision, view.selectedTower]);

  useLayoutEffect(() => {
    if (!step || dismissed || step.id === 'welcome' || step.id === 'wait-first-wave') {
      setTarget(null);
      setSecondaryTarget(null);
      return;
    }
    const updateTarget = (): void => {
      if (step.drag) {
        const source = document.querySelector(step.drag.sourceSelector);
        const destination = document.querySelector(step.drag.targetSelector);
        setTarget(source ? elementBox(source) : null);
        setSecondaryTarget(destination ? elementBox(destination) : null);
        return;
      }
      setSecondaryTarget(null);
      if (step.action === 'select-tower' || step.action === 'place-tower') {
        const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
        const worldTarget = step.action === 'select-tower'
          ? engine.towers[0]?.position
          : engine.level.towerPads[1];
        if (!canvas || !worldTarget) return setTarget(null);
        const bounds = canvas.getBoundingClientRect();
        const scale = Math.min(bounds.width / WORLD.width, bounds.height / WORLD.height);
        const offsetX = (bounds.width - WORLD.width * scale) / 2;
        const offsetY = (bounds.height - WORLD.height * scale) / 2;
        const size = Math.max(58, 76 * scale);
        setTarget({
          left: bounds.left + offsetX + worldTarget.x * scale - size / 2,
          top: bounds.top + offsetY + worldTarget.y * scale - size / 2,
          width: size,
          height: size,
        });
        return;
      }
      const element = step.selector ? document.querySelector(step.selector) : null;
      setTarget(element ? elementBox(element) : null);
    };
    updateTarget();
    const observer = new ResizeObserver(updateTarget);
    observer.observe(document.documentElement);
    const mutationObserver = new MutationObserver(updateTarget);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', updateTarget);
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateTarget);
    };
  }, [dismissed, engine, step, view.revision]);

  useEffect(() => primaryRef.current?.focus(), [stepIndex, target]);

  useEffect(() => {
    const keepPanelOnScreen = (): void => {
      const panel = panelRef.current;
      if (!panel) return;
      const bounds = panel.getBoundingClientRect();
      setPanelPosition((position) => position ? {
        x: Math.max(8, Math.min(window.innerWidth - bounds.width - 8, position.x)),
        y: Math.max(8, Math.min(window.innerHeight - bounds.height - 8, position.y)),
      } : null);
    };
    window.addEventListener('resize', keepPanelOnScreen);
    return () => window.removeEventListener('resize', keepPanelOnScreen);
  }, []);

  const clampPanelPosition = (x: number, y: number, width: number, height: number): PanelPosition => ({
    x: Math.max(8, Math.min(window.innerWidth - width - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - height - 8, y)),
  });
  const beginPanelDrag = (event: PointerEvent<HTMLButtonElement>): void => {
    const panel = panelRef.current;
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    panelDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
    setPanelPosition({ x: bounds.left, y: bounds.top });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const dragPanel = (event: PointerEvent<HTMLButtonElement>): void => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPanelPosition(clampPanelPosition(
      event.clientX - drag.offsetX,
      event.clientY - drag.offsetY,
      drag.width,
      drag.height,
    ));
  };
  const endPanelDrag = (event: PointerEvent<HTMLButtonElement>): void => {
    if (panelDragRef.current?.pointerId !== event.pointerId) return;
    panelDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const nudgePanel = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const directions: Readonly<Record<string, readonly [number, number]>> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    const distance = event.shiftKey ? 40 : 12;
    const current = panelPosition ?? { x: bounds.left, y: bounds.top };
    setPanelPosition(clampPanelPosition(
      current.x + direction[0] * distance,
      current.y + direction[1] * distance,
      bounds.width,
      bounds.height,
    ));
  };
  const dragHandle = <button
    className="tutorial-drag-handle"
    aria-label={t('tutorial.dragAria')}
    title={t('tutorial.dragTitle')}
    onPointerDown={beginPanelDrag}
    onPointerMove={dragPanel}
    onPointerUp={endPanelDrag}
    onPointerCancel={endPanelDrag}
    onKeyDown={nudgePanel}
  >⠿</button>;
  const panelStyle: CSSProperties | undefined = panelPosition
    ? { top: panelPosition.y, right: 'auto', bottom: 'auto', left: panelPosition.x, transform: 'none' }
    : undefined;

  if (!engine.tutorialEnabled || dismissed || !step) return null;
  if (step.id === 'wait-first-wave') {
    return <aside ref={panelRef} data-tutorial-panel className="tutorial-observer" style={panelStyle} aria-live="polite">
      {dragHandle}<span>{stepText('eyebrow')}</span><strong>{stepText('title')}</strong><small>{stepText('body')}</small>
    </aside>;
  }

  const advance = (): void => {
    if (step.id === 'welcome') setPanelPosition(null);
    setStepIndex((index) => index + 1);
  };
  const activateTarget = (): void => {
    if (step.action === 'select-tower') {
      const tower = engine.towers[0];
      if (tower) engine.selectTower(tower.id);
    } else if (step.action === 'place-tower') {
      engine.placeTower(1);
    } else if (step.selector) {
      document.querySelector<HTMLElement>(step.selector)?.click();
    }
    if (step.id === 'ensure-wrong-tower') return;
    advance();
  };
  const targetStyle = target ? {
    top: target.top - 7,
    left: target.left - 7,
    width: target.width + 14,
    height: target.height + 14,
  } : undefined;
  const secondaryTargetStyle = secondaryTarget ? {
    top: secondaryTarget.top - 7,
    left: secondaryTarget.left - 7,
    width: secondaryTarget.width + 14,
    height: secondaryTarget.height + 14,
  } : undefined;
  const instruction = hasStepText('instruction') ? stepText('instruction') : undefined;
  return <div className="tutorial-layer" role="region" aria-label={t('tutorial.aria')}>
    {target ? <>
      <div className={`tutorial-spotlight ${step.drag ? 'drag-source' : ''}`} data-label={step.drag ? t('tutorial.dragSource') : undefined} style={targetStyle} />
      {step.action ? <button
        ref={primaryRef}
        className="tutorial-hit-target"
        style={targetStyle}
        onClick={activateTarget}
        aria-label={instruction ?? stepText('title')}
      /> : null}
    </> : null}
    {secondaryTarget ? <div className="tutorial-spotlight drag-destination" data-label={t('tutorial.dragDestination')} style={secondaryTargetStyle} /> : null}
    <section
      ref={panelRef}
      data-tutorial-panel
      className={`tutorial-card ${step.id === 'welcome' ? 'tutorial-card-welcome' : ''}`}
      style={panelStyle}
    >
      <div className="tutorial-card-head"><span>{stepText('eyebrow')}</span>{dragHandle}<button className="tutorial-skip" onClick={() => setDismissed(true)}>{t('tutorial.skip')}</button></div>
      <h2>{stepText('title')}</h2>
      <p>{stepText('body')}</p>
      {instruction ? <div className="tutorial-instruction"><i />{instruction}</div> : null}
      {!step.action && !step.drag ? <button ref={primaryRef} className="tutorial-continue" onClick={advance}>{hasStepText('continue') ? stepText('continue') : t('common.continue')}</button> : null}
      <div className="tutorial-progress" aria-label={t('tutorial.progress', { current: stepIndex + 1, total: STEPS.length })}>
        {STEPS.map((item, index) => <i key={item.id} className={index <= stepIndex ? 'active' : ''} />)}
      </div>
    </section>
  </div>;
}
