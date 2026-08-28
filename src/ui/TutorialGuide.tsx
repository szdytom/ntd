import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  eyebrow: string;
  title: string;
  body: string;
  instruction?: string;
  selector?: string;
  action?: TutorialAction;
  drag?: TutorialDrag;
  continueLabel?: string;
}

const STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    eyebrow: '基础校准 · 1/2',
    title: '欢迎来到启航折线',
    body: '这是一场两波的操作教学。你的模块和炮塔槽位已经固定，我们会一起完成第一套施法序列。',
    continueLabel: '开始校准',
  },
  {
    id: 'tower',
    eyebrow: '选择炮塔',
    title: '先打开折射塔',
    body: '炮塔是模块的运行节点。被选中后，弧光工作台会显示它的槽位、能量和攻击方式。',
    instruction: '点击高亮的炮塔',
    action: 'select-tower',
  },
  {
    id: 'frost-drag',
    eyebrow: '模块 1 · 修正',
    title: '把冷凝拖到槽位 1',
    body: '修正模块本身不会发射，而是修改右侧遇到的下一枚弹射物。拖动模块可以直接表达你要把它装到哪个槽位。',
    instruction: '从黄色来源框拖到黄色目标框',
    drag: {
      sourceSelector: '[data-tutorial-module="frost"]',
      targetSelector: '[data-tutorial-slot="0"]',
      moduleId: 'frost',
      targetSlot: 0,
    },
  },
  {
    id: 'pulse-drag-first',
    eyebrow: '模块 2 · 弹射物',
    title: '把脉冲拖到槽位 2',
    body: '弹射物是炮塔真正发射的攻击载体。槽位从左向右执行，现在程序会自然读成“冷凝 → 脉冲”。',
    instruction: '拖动脉冲模块到槽位 2',
    drag: {
      sourceSelector: '[data-tutorial-module="pulse"]',
      targetSelector: '[data-tutorial-slot="1"]',
      moduleId: 'pulse',
      targetSlot: 1,
    },
  },
  {
    id: 'first-program',
    eyebrow: '读取编译结果',
    title: '第一套程序已经有效',
    body: '程序摘要会显示每轮能耗和弹体数量。现在冷凝修正被右侧脉冲弹消耗，每次射击都会发出一枚减速脉冲。',
    selector: '[data-tutorial-program]',
    continueLabel: '明白了',
  },
  {
    id: 'close-first-workshop',
    eyebrow: '查看战场',
    title: '关闭 ARC 工作台',
    body: '配置已经保存。战斗时关闭工作台可以完整查看路径、敌人和弹射物效果。需要调整时，再点击炮塔即可重新打开。',
    instruction: '点击工作台右上角的关闭按钮',
    selector: '[data-tutorial-workshop-close]',
    action: 'click-element',
  },
  {
    id: 'build-second-tower',
    eyebrow: '扩大火力覆盖',
    title: '建造第二座炮塔',
    body: '一座炮塔无法稳定拦住整波火花。启航折线在路径另一侧预留了第二个节点，用它形成交叉火力。',
    instruction: '点击高亮的空节点建造炮塔',
    action: 'place-tower',
  },
  {
    id: 'second-pulse-drag',
    eyebrow: '配置第二座炮塔',
    title: '给新炮塔安装脉冲',
    body: '库存中还有一枚脉冲弹。把它拖入新炮塔的槽位 1，让两座炮塔都具备基础攻击能力。',
    instruction: '拖动脉冲模块到槽位 1',
    drag: {
      sourceSelector: '[data-tutorial-module="pulse"]',
      targetSelector: '[data-tutorial-slot="0"]',
      moduleId: 'pulse',
      targetSlot: 0,
    },
  },
  {
    id: 'close-second-workshop',
    eyebrow: '查看交叉火力',
    title: '关闭第二座塔的工作台',
    body: '两座炮塔都已能够攻击。关闭工作台后启动第一波，观察它们分别覆盖路径的两段。',
    instruction: '点击工作台右上角的关闭按钮',
    selector: '[data-tutorial-workshop-close]',
    action: 'click-element',
  },
  {
    id: 'launch-one',
    eyebrow: '实战校验',
    title: '启动第一波信号',
    body: '火花速度快但生命很低。观察减速脉冲如何为炮塔争取更多攻击时间。',
    instruction: '点击“启动信号”',
    selector: '[data-tutorial-launch]',
    action: 'click-element',
  },
  {
    id: 'wait-first-wave',
    eyebrow: '波次 1 · 运行中',
    title: '观察模块组合的效果',
    body: '击退这一波后，教学会自动继续。',
  },
  {
    id: 'ensure-tower',
    eyebrow: '再次配置',
    title: '重新打开教程炮塔',
    body: '第二波要继续扩展刚才的程序。请重新点击第一座炮塔，打开它的 ARC 工作台。',
    instruction: '点击高亮的初始炮塔',
    action: 'select-tower',
  },
  {
    id: 'move-pulse',
    eyebrow: '为触发器腾出位置',
    title: '把脉冲从槽位 2 移到槽位 3',
    body: '第二波要把触发器插在修正与载体之间。直接拖动已安装的脉冲到空槽位 3，槽位 2 就会空出来。',
    instruction: '把槽位 2 的脉冲拖到槽位 3',
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
    eyebrow: '基础校准 · 2/2',
    title: '把命中触发拖到槽位 2',
    body: '触发器会包裹右侧的下一枚弹射物。载体满足条件时，才会释放再右侧的载荷。',
    instruction: '拖动命中触发到空出的槽位 2',
    drag: {
      sourceSelector: '[data-tutorial-module="impact-trigger"]',
      targetSelector: '[data-tutorial-slot="1"]',
      moduleId: 'impact-trigger',
      targetSlot: 1,
    },
  },
  {
    id: 'static-drag',
    eyebrow: '模块 3 · 静态弹射物',
    title: '把感应雷拖到槽位 4',
    body: '静态弹射物不会作为普通子弹飞行。它必须由触发器部署到战场，并在原地等待敌人接近。',
    instruction: '拖动感应雷到槽位 4，补全触发载荷',
    drag: {
      sourceSelector: '[data-tutorial-module="proximity-mine"]',
      targetSelector: '[data-tutorial-slot="3"]',
      moduleId: 'proximity-mine',
      targetSlot: 3,
    },
  },
  {
    id: 'final-program',
    eyebrow: '完整触发链',
    title: '读懂载荷关系',
    body: '最终顺序是“修正 → 触发器 → 载体弹射物 → 静态载荷”。工作台下方的 PAYLOAD 链会把这种嵌套关系画出来。',
    selector: '[data-tutorial-program]',
    continueLabel: '准备迎敌',
  },
  {
    id: 'close-final-workshop',
    eyebrow: '查看最终防御',
    title: '关闭 ARC 工作台',
    body: '完整触发链已经保存。关闭工作台，腾出战场视野来观察脉冲命中、感应雷部署和敌群触发的全过程。',
    instruction: '点击工作台右上角的关闭按钮',
    selector: '[data-tutorial-workshop-close]',
    action: 'click-element',
  },
  {
    id: 'launch-two',
    eyebrow: '教程最终波',
    title: '启动第二波信号',
    body: '这次会混入风筝。让减速脉冲命中敌群，并观察部署在路径上的感应雷。完成后你就掌握了基础编排。',
    instruction: '点击“启动信号”完成教程',
    selector: '[data-tutorial-launch]',
    action: 'click-element',
  },
] as const;

const WRONG_TOWER_STEP: TutorialStep = {
  id: 'ensure-wrong-tower',
  eyebrow: '节点校验',
  title: '当前不是教程炮塔',
  body: '第二阶段必须继续编辑第一波使用的初始炮塔。先关闭当前工作台，我们随后会标出正确节点。',
  instruction: '先关闭当前 ARC 工作台',
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
    aria-label="拖动教程提示框"
    title="拖动提示框 · 方向键微调"
    onPointerDown={beginPanelDrag}
    onPointerMove={dragPanel}
    onPointerUp={endPanelDrag}
    onPointerCancel={endPanelDrag}
    onKeyDown={nudgePanel}
  >⠿</button>;
  const panelStyle: CSSProperties | undefined = panelPosition
    ? { top: panelPosition.y, left: panelPosition.x, bottom: 'auto' }
    : undefined;

  if (!engine.tutorialEnabled || dismissed || !step) return null;
  if (step.id === 'wait-first-wave') {
    return <aside ref={panelRef} data-tutorial-panel className="tutorial-observer" style={panelStyle} aria-live="polite">
      {dragHandle}<span>{step.eyebrow}</span><strong>{step.title}</strong><small>{step.body}</small>
    </aside>;
  }

  const advance = (): void => setStepIndex((index) => index + 1);
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
  return <div className="tutorial-layer" role="region" aria-label="启航折线教程">
    {target ? <>
      <div className={`tutorial-spotlight ${step.drag ? 'drag-source' : ''}`} style={targetStyle} />
      {step.action ? <button
        ref={primaryRef}
        className="tutorial-hit-target"
        style={targetStyle}
        onClick={activateTarget}
        aria-label={step.instruction ?? step.title}
      /> : null}
    </> : null}
    {secondaryTarget ? <div className="tutorial-spotlight drag-destination" style={secondaryTargetStyle} /> : null}
    <section ref={panelRef} data-tutorial-panel className="tutorial-card" style={panelStyle}>
      <div className="tutorial-card-head"><span>{step.eyebrow}</span>{dragHandle}<button className="tutorial-skip" onClick={() => setDismissed(true)}>跳过教程</button></div>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      {step.instruction ? <div className="tutorial-instruction"><i />{step.instruction}</div> : null}
      {!step.action && !step.drag ? <button ref={primaryRef} className="tutorial-continue" onClick={advance}>{step.continueLabel ?? '继续'}</button> : null}
      <div className="tutorial-progress" aria-label={`教程进度 ${stepIndex + 1}/${STEPS.length}`}>
        {STEPS.map((item, index) => <i key={item.id} className={index <= stepIndex ? 'active' : ''} />)}
      </div>
    </section>
  </div>;
}
