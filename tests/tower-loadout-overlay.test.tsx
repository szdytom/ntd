// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../src/i18n';
import { WORLD } from '../src/game/config';
import { GameEngine } from '../src/game/engine';
import {
  TowerLoadoutOverlay,
  worldPointToBattlefieldOverlay,
} from '../src/ui/TowerLoadoutOverlay';

afterEach(() => cleanup());

describe('tower loadout overlay', () => {
  it('keeps installed modules in slot order and omits empty slots', () => {
    const engine = new GameEngine({ mode: 'coop', seed: 7 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a starting tower');
    tower.slots = ['frost', null, 'pulse', null];

    render(<TowerLoadoutOverlay engine={engine} towers={[tower]} />);

    const loadout = screen.getByRole('group', { name: 'Installed modules' });
    expect([...loadout.querySelectorAll('[data-module-id]')].map((element) => (
      [element.getAttribute('data-module-id'), element.getAttribute('data-slot-index')]
    ))).toEqual([['frost', '0'], ['pulse', '2']]);
    expect(screen.getByRole('img', { name: 'Condensing Lens' })).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Pulse Round' })).not.toBeNull();
  });

  it('matches the canvas world transform when the viewport is letterboxed', () => {
    expect(worldPointToBattlefieldOverlay(
      { width: WORLD.width, height: WORLD.height + 200 },
      { x: WORLD.width / 2, y: WORLD.height / 2 },
    )).toEqual({ x: WORLD.width / 2, y: WORLD.height / 2 + 100 });
  });
});
