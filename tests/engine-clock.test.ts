import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';

function engineWithSignal(): GameEngine {
  const engine = new GameEngine({ mode: 'creative', seed: 77 });
  engine.spawnCreativeSignal('spark');
  return engine;
}

describe('fixed simulation clock', () => {
  it('produces the same movement for different render frame sizes', () => {
    const frequent = engineWithSignal();
    const sparse = engineWithSignal();

    for (let frame = 0; frame < 60; frame += 1) frequent.update(1 / 60);
    for (let frame = 0; frame < 20; frame += 1) sparse.update(1 / 20);

    expect(frequent.signals[0].distance).toBeCloseTo(sparse.signals[0].distance, 8);
    expect(frequent.signals[0].position.x).toBeCloseTo(sparse.signals[0].position.x, 8);
    expect(frequent.elapsed).toBeCloseTo(1, 8);
  });

  it('freezes simulation state while paused but keeps visual time', () => {
    const engine = engineWithSignal();
    engine.togglePause();
    engine.update(0.5);

    expect(engine.signals[0].distance).toBe(0);
    expect(engine.elapsed).toBe(0);
    expect(engine.visualElapsed).toBeCloseTo(0.1, 8);
  });
});
