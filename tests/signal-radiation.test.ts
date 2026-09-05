import { describe, expect, it } from 'vitest';
import { getSignalCapability, signalRegistry } from '@prism-bastion/game-core/signals';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import type { Signal } from '@prism-bastion/game-core/game/types';

function placeAtDistance(engine: GameEngine, signal: Signal, pathDistance: number): void {
  const at = engine.path.pointAtDistance(pathDistance);
  signal.distance = pathDistance;
  signal.progress = pathDistance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
  signal.speed = 0;
}

describe('suppression elite', () => {
  it('applies its configured suppression only inside the aura without stacking copies', () => {
    const aura = getSignalCapability(signalRegistry.require('radiant'), 'tower-suppression-aura');
    if (!aura) throw new Error('Expected tower-suppression-aura capability');
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 31 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected the starter tower');
    engine.spawnCreativeSignal('radiant');
    const first = engine.signals[0];
    if (!first) throw new Error('Expected a suppression elite');
    placeAtDistance(engine, first, 180);
    tower.position = { ...first.position };
    tower.cooldownLeft = 1;
    tower.energy = 0;

    engine.update(FIXED_SIMULATION_STEP);
    expect(tower.cooldownLeft).toBeCloseTo(1 - FIXED_SIMULATION_STEP / aura.cooldownMultiplier, 8);
    expect(tower.energy).toBeCloseTo(tower.energyRegen * FIXED_SIMULATION_STEP * aura.energyRegenMultiplier, 8);

    engine.spawnCreativeSignal('radiant');
    const second = engine.signals[1];
    if (!second) throw new Error('Expected a second suppression elite');
    placeAtDistance(engine, second, 180);
    tower.cooldownLeft = 1;
    tower.energy = 0;
    engine.update(FIXED_SIMULATION_STEP);
    expect(tower.cooldownLeft).toBeCloseTo(1 - FIXED_SIMULATION_STEP / aura.cooldownMultiplier, 8);
    expect(tower.energy).toBeCloseTo(tower.energyRegen * FIXED_SIMULATION_STEP * aura.energyRegenMultiplier, 8);

    tower.position = { x: first.position.x, y: first.position.y + aura.radius + 1 };
    tower.cooldownLeft = 1;
    tower.energy = 0;
    engine.update(FIXED_SIMULATION_STEP);
    expect(tower.cooldownLeft).toBeCloseTo(1 - FIXED_SIMULATION_STEP, 8);
    expect(tower.energy).toBeCloseTo(tower.energyRegen * FIXED_SIMULATION_STEP, 8);
  });
});
