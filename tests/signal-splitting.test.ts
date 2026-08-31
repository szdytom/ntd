import { describe, expect, it } from 'vitest';
import { getSignalCapability, signalRegistry } from '../src/signals';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Projectile } from '../src/game/types';

function placeSignal(engine: GameEngine, signal: Signal, pathDistance: number): void {
  const at = engine.path.pointAtDistance(pathDistance);
  signal.distance = pathDistance;
  signal.progress = pathDistance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
}

function addLethalProjectile(engine: GameEngine, signal: Signal): void {
  const shot = engine.modules.compile(['pulse']).shots[0];
  if (!shot) throw new Error('Expected pulse to compile into a shot');
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  const launchGap = signal.radius + shot.size + 1;
  const projectile: Projectile = {
    id: 20_000 + engine.projectiles.length,
    towerId: engine.towers[0].id,
    position: {
      x: signal.position.x - direction.x * launchGap,
      y: signal.position.y - direction.y * launchGap,
    },
    velocity: { x: direction.x * shot.speed, y: direction.y * shot.speed },
    targetId: signal.id,
    damage: 100_000,
    speed: shot.speed,
    radius: shot.size,
    color: shot.color,
    life: shot.lifetime,
    pierce: 0,
    slow: 0,
    splash: 0,
    seeking: 0,
    modules: [...shot.modules],
    shot,
    trailTimer: 1,
    moduleState: {},
    behavior: 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
}

describe('splitting signals', () => {
  it('replaces a defeated fracture core with configured non-splitting copies', () => {
    const definition = signalRegistry.require('fracture');
    const split = getSignalCapability(definition, 'split-on-death');
    if (!split) throw new Error('Expected split-on-death capability');
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 29 });
    engine.spawnCreativeSignal('fracture');
    const parent = engine.signals[0];
    if (!parent) throw new Error('Expected a fracture core');
    placeSignal(engine, parent, 180);
    const parentRadius = parent.radius;
    const parentHp = parent.maxHp;
    const parentSpeed = parent.speed;
    engine.status = 'wave';
    addLethalProjectile(engine, parent);

    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.signals.filter((signal) => signal.type === 'fracture' && !signal.dead)).toHaveLength(0);
    expect(engine.signals).toContain(parent);
    expect(engine.getSplitRifts()).toHaveLength(1);
    expect(engine.status).toBe('wave');
    const splitDelaySteps = Math.ceil(split.delay / FIXED_SIMULATION_STEP);
    for (let step = 0; step < splitDelaySteps - 1; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(engine.signals.filter((signal) => signal.type === 'fracture' && !signal.dead)).toHaveLength(0);
    expect(engine.signals).toContain(parent);
    engine.update(FIXED_SIMULATION_STEP);

    const children = engine.signals.filter((signal) => signal.type === 'fracture');
    expect(children).toHaveLength(split.count);
    expect(engine.signals).not.toContain(parent);
    expect(engine.getSplitRifts()).toHaveLength(1);
    expect(children.every((signal) => signal.variantId === split.childVariantId)).toBe(true);
    expect(children.every((signal) => signal.routeId === parent.routeId)).toBe(true);
    expect(children.every((signal) => signal.radius < parentRadius)).toBe(true);
    expect(children.every((signal) => signal.maxHp === Math.round(parentHp * split.healthScale))).toBe(true);
    expect(children.map((signal) => signal.distance - parent.distance)).toEqual(
      Array.from({ length: split.count }, (_, index) => (index - (split.count - 1) / 2) * split.spacing),
    );
    expect(children.every((signal) => signal.speed === parentSpeed * split.speedScale)).toBe(true);
    expect(children.every((signal) => signal.reward === Math.round(definition.stats.reward * split.rewardScale))).toBe(true);
    expect(children.every((signal) => signal.coreDamage === Math.max(1, Math.round(definition.stats.coreDamage * split.coreDamageScale)))).toBe(true);
    expect(engine.status).toBe('wave');

    const [child, ...siblings] = children;
    if (!child) throw new Error('Expected a split child');
    siblings.forEach((signal) => { signal.dead = true; });
    placeSignal(engine, child, 240);
    addLethalProjectile(engine, child);
    engine.update(FIXED_SIMULATION_STEP);

    expect(engine.signals.filter((signal) => signal.type === 'fracture')).toHaveLength(0);
  });
});
