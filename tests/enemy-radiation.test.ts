import { describe, expect, it } from 'vitest';
import { ENEMIES, LEVELS } from '../src/game/config';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Enemy } from '../src/game/types';

function placeAtDistance(engine: GameEngine, enemy: Enemy, pathDistance: number): void {
  const at = engine.path.pointAtDistance(pathDistance);
  enemy.distance = pathDistance;
  enemy.progress = pathDistance / engine.path.length;
  enemy.position = at.position;
  enemy.angle = at.angle;
  enemy.speed = 0;
}

describe('suppression elite', () => {
  it('halves cooldown recovery and energy regeneration only inside its radius without stacking copies', () => {
    expect(ENEMIES.radiant.aura.radius).toBe(290);
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 31 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected the starter tower');
    engine.spawnCreativeEnemy('radiant');
    const first = engine.enemies[0];
    if (!first) throw new Error('Expected a suppression elite');
    placeAtDistance(engine, first, 180);
    tower.position = { ...first.position };
    tower.cooldownLeft = 1;
    tower.energy = 0;

    engine.update(FIXED_SIMULATION_STEP);
    expect(tower.cooldownLeft).toBeCloseTo(1 - FIXED_SIMULATION_STEP / 2, 8);
    expect(tower.energy).toBeCloseTo(tower.energyRegen * FIXED_SIMULATION_STEP / 2, 8);

    engine.spawnCreativeEnemy('radiant');
    const second = engine.enemies[1];
    if (!second) throw new Error('Expected a second suppression elite');
    placeAtDistance(engine, second, 180);
    tower.cooldownLeft = 1;
    tower.energy = 0;
    engine.update(FIXED_SIMULATION_STEP);
    expect(tower.cooldownLeft).toBeCloseTo(1 - FIXED_SIMULATION_STEP / 2, 8);
    expect(tower.energy).toBeCloseTo(tower.energyRegen * FIXED_SIMULATION_STEP / 2, 8);

    tower.position = { x: first.position.x, y: first.position.y + ENEMIES.radiant.aura.radius + 1 };
    tower.cooldownLeft = 1;
    tower.energy = 0;
    engine.update(FIXED_SIMULATION_STEP);
    expect(tower.cooldownLeft).toBeCloseTo(1 - FIXED_SIMULATION_STEP, 8);
    expect(tower.energy).toBeCloseTo(tower.energyRegen * FIXED_SIMULATION_STEP, 8);
  });

  it('introduces the mechanic elites separately before pairing them in Verdant Fold', () => {
    const tutorial = LEVELS.find((level) => level.id === 'starter-elbow');
    const whitePrism = LEVELS.find((level) => level.id === 'white-prism');
    const roseCircuit = LEVELS.find((level) => level.id === 'rose-circuit');
    const verdantFold = LEVELS.find((level) => level.id === 'verdant-fold');
    expect(tutorial?.waves.flat().some((entry) => entry.type === 'fracture')).toBe(false);
    expect(tutorial?.waves.flat().some((entry) => entry.type === 'radiant')).toBe(false);
    expect(whitePrism?.waves.at(-1)?.some((entry) => entry.type === 'fracture')).toBe(true);
    expect(whitePrism?.waves.at(-1)?.some((entry) => entry.type === 'radiant')).toBe(false);
    expect(roseCircuit?.waves.at(-1)?.some((entry) => entry.type === 'radiant')).toBe(true);
    expect(roseCircuit?.waves.at(-1)?.some((entry) => entry.type === 'fracture')).toBe(false);
    expect(verdantFold?.waves.at(-1)?.some((entry) => entry.type === 'fracture')).toBe(true);
    expect(verdantFold?.waves.at(-1)?.some((entry) => entry.type === 'radiant')).toBe(true);
  });
});
