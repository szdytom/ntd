import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';

describe('engine command and view boundary', () => {
  it('publishes an immutable selected-tower snapshot', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 5 });
    const towerId = engine.towers[0].id;
    engine.selectTower(towerId);
    const first = engine.getViewSnapshot();

    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.selectedTower)).toBe(true);
    expect(Object.isFrozen(first.selectedTower?.slots)).toBe(true);

    engine.setTargeting('hp-highest');
    const second = engine.getViewSnapshot();
    expect(second).not.toBe(first);
    expect(second.selectedTower?.targeting).toBe('hp-highest');
  });

  it('rejects invalid slot commands and unknown modules', () => {
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    engine.selectTower(engine.towers[0].id);
    const before = [...engine.towers[0].slots];

    engine.swapModules(-1, 99);
    engine.installModule(0, 'not-registered');

    expect(engine.towers[0].slots).toEqual(before);
  });

  it('enforces the single-boss invariant in setup and live spawning', () => {
    const engine = new GameEngine({
      mode: 'creative',
      seed: 5,
      creative: { wave: { crown: 40 } },
    });

    expect(engine.getCreativeSetup().wave.crown).toBe(1);
    engine.spawnCreativeEnemy('crown');
    engine.spawnCreativeEnemy('crown');
    expect(engine.enemies.filter((enemy) => enemy.type === 'crown')).toHaveLength(1);
  });
});
