// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/i18n';
import { GameEngine } from '../src/game/engine';
import { Workshop } from '../src/ui/Workshop';

const touch = (identifier: number, clientX: number, clientY: number): Touch => ({
  identifier,
  clientX,
  clientY,
} as Touch);

const touchList = (...touches: Touch[]): TouchList => Object.assign(touches, {
  item: (index: number) => touches[index] ?? null,
}) as unknown as TouchList;

const mockElementFromPoint = (element: Element): void => {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => element),
  });
};

const renderWorkshop = () => {
  const engine = new GameEngine({ mode: 'creative', seed: 41 });
  engine.selectTower(engine.towers[0].id);
  const view = engine.getViewSnapshot();
  if (!view.selectedTower) throw new Error('Expected a selected tower');
  const rendered = render(<Workshop engine={engine} tower={view.selectedTower} view={view} />);
  return { engine, ...rendered };
};

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('workshop touch dragging', () => {
  it('installs a library module after a hold and drag to a slot', () => {
    const { container, engine } = renderWorkshop();
    const workshop = container.querySelector<HTMLElement>('.workshop');
    const card = container.querySelector<HTMLElement>('[data-touch-module="arcbolt"]');
    const destination = container.querySelector<HTMLElement>('.module-slot[data-slot="2"]');
    if (!workshop || !card || !destination) throw new Error('Expected touch drag elements');
    mockElementFromPoint(destination);

    fireEvent.touchStart(card, { touches: touchList(touch(7, 20, 220)) });
    vi.advanceTimersByTime(180);
    fireEvent.touchMove(workshop, { touches: touchList(touch(7, 20, 80)) });
    expect(destination.classList.contains('drag-over')).toBe(true);
    fireEvent.touchEnd(workshop, { changedTouches: touchList(touch(7, 20, 80)) });

    expect(engine.towers[0].slots[2]).toBe('arcbolt');
    expect(destination.classList.contains('drag-over')).toBe(false);
  });

  it('reorders installed modules by touch', () => {
    const { container, engine } = renderWorkshop();
    const workshop = container.querySelector<HTMLElement>('.workshop');
    const source = container.querySelector<HTMLElement>('[data-touch-slot="0"]');
    const destination = container.querySelector<HTMLElement>('.module-slot[data-slot="1"]');
    if (!workshop || !source || !destination) throw new Error('Expected touch drag elements');
    mockElementFromPoint(destination);

    fireEvent.touchStart(source, { touches: touchList(touch(9, 20, 30)) });
    vi.advanceTimersByTime(180);
    fireEvent.touchMove(workshop, { touches: touchList(touch(9, 120, 30)) });
    fireEvent.touchEnd(workshop, { changedTouches: touchList(touch(9, 120, 30)) });

    expect(engine.towers[0].slots.slice(0, 2)).toEqual(['pulse', 'frost']);
  });

  it('keeps a scroll gesture from becoming a drag before the hold delay', () => {
    const { container, engine } = renderWorkshop();
    const workshop = container.querySelector<HTMLElement>('.workshop');
    const card = container.querySelector<HTMLElement>('[data-touch-module="arcbolt"]');
    const destination = container.querySelector<HTMLElement>('.module-slot[data-slot="2"]');
    if (!workshop || !card || !destination) throw new Error('Expected touch drag elements');
    mockElementFromPoint(destination);

    fireEvent.touchStart(card, { touches: touchList(touch(11, 20, 220)) });
    fireEvent.touchMove(workshop, { touches: touchList(touch(11, 20, 180)) });
    vi.advanceTimersByTime(180);
    fireEvent.touchEnd(workshop, { changedTouches: touchList(touch(11, 20, 80)) });

    expect(engine.towers[0].slots[2]).toBeNull();
  });

  it('deduplicates quick-install events from one mobile double tap', () => {
    const { container, engine } = renderWorkshop();
    const card = container.querySelector<HTMLElement>('[data-touch-module="arcbolt"]');
    if (!card) throw new Error('Expected a module card');

    fireEvent.doubleClick(card, { timeStamp: 1_000 });
    fireEvent.doubleClick(card, { timeStamp: 1_100 });

    expect(engine.towers[0].slots.filter((moduleId) => moduleId === 'arcbolt')).toHaveLength(1);
  });
});
