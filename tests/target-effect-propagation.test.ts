import { describe, expect, it, vi } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Enemy, Projectile, ShotBlueprint } from '../src/game/types';

const placeEnemy = (engine: GameEngine, enemy: Enemy, pathDistance: number): void => {
  const at = engine.path.pointAtDistance(pathDistance);
  enemy.speed = 0;
  enemy.distance = pathDistance;
  enemy.progress = pathDistance / engine.path.length;
  enemy.position = at.position;
  enemy.angle = at.angle;
  enemy.hp = 10_000;
  enemy.maxHp = 10_000;
};

const prepareEngine = (enemyDistances: readonly number[]): { engine: GameEngine; enemies: Enemy[] } => {
  const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 73 });
  const tower = engine.towers[0];
  if (!tower) throw new Error('Expected a tower');
  tower.slots.fill(null);
  tower.energy = 0;
  tower.energyRegen = 0;
  for (const pathDistance of enemyDistances) {
    engine.spawnCreativeEnemy('block');
    const enemy = engine.enemies.at(-1);
    if (!enemy) throw new Error('Expected an enemy');
    placeEnemy(engine, enemy, pathDistance);
  }
  return { engine, enemies: engine.enemies };
};

const addProjectile = (
  engine: GameEngine,
  shot: ShotBlueprint,
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  targetId: number | null,
): Projectile => {
  const projectile: Projectile = {
    id: 60_000 + engine.projectiles.length,
    towerId: engine.towers[0]?.id ?? -1,
    position: { ...position },
    velocity: { ...velocity },
    targetId,
    damage: shot.damage,
    speed: shot.speed,
    radius: shot.size,
    color: shot.color,
    life: shot.static?.duration ?? shot.lifetime,
    pierce: shot.pierce,
    slow: shot.slow,
    splash: shot.splash,
    seeking: shot.seeking,
    modules: [...shot.modules],
    shot,
    trailTimer: 1,
    moduleState: {},
    behavior: shot.static ? 'static' : 'linear',
    age: 0,
    triggered: false,
    triggerCooldown: 0,
    triggerCount: 0,
    trail: [],
  };
  engine.projectiles.push(projectile);
  return projectile;
};

const fireAt = (engine: GameEngine, shot: ShotBlueprint, enemy: Enemy): Projectile => {
  const direction = { x: Math.cos(enemy.angle), y: Math.sin(enemy.angle) };
  const launchGap = enemy.radius + shot.size + 2;
  return addProjectile(
    engine,
    shot,
    {
      x: enemy.position.x - direction.x * launchGap,
      y: enemy.position.y - direction.y * launchGap,
    },
    { x: direction.x * shot.speed, y: direction.y * shot.speed },
    enemy.id,
  );
};

const deployAt = (engine: GameEngine, shot: ShotBlueprint, pathDistance: number): Projectile => addProjectile(
  engine,
  shot,
  engine.path.pointAtDistance(pathDistance).position,
  { x: 0, y: 0 },
  null,
);

const advanceUntil = (engine: GameEngine, condition: () => boolean, seconds = 1): void => {
  const steps = Math.ceil(seconds / FIXED_SIMULATION_STEP);
  for (let step = 0; step < steps && !condition(); step += 1) engine.update(FIXED_SIMULATION_STEP);
};

const advanceFor = (engine: GameEngine, seconds: number): void => {
  const steps = Math.ceil(seconds / FIXED_SIMULATION_STEP);
  for (let step = 0; step < steps; step += 1) engine.update(FIXED_SIMULATION_STEP);
};

const hasStatus = (enemy: Enemy, id: string): boolean => enemy.statuses.some((status) => status.id === id);
const isFrozen = (enemy: Enemy): boolean => enemy.slowFactor === 0.3 && enemy.slowTime > 0;

describe('target effect propagation', () => {
  it('applies Frost and Corrosive Spore to direct and splash targets', () => {
    const { engine, enemies } = prepareEngine([200, 242]);
    const [direct, splash] = enemies;
    if (!direct || !splash) throw new Error('Expected two enemies');
    const shot = engine.modules.compile(['frost', 'toxin', 'nova']).shots[0];
    if (!shot) throw new Error('Expected a nova shot');
    fireAt(engine, shot, direct);

    advanceUntil(engine, () => isFrozen(splash));

    expect(isFrozen(direct)).toBe(true);
    expect(isFrozen(splash)).toBe(true);
    expect(hasStatus(direct, 'toxin')).toBe(true);
    expect(hasStatus(splash, 'toxin')).toBe(true);
  });

  it('applies Frost and Corrosive Spore to every Arcbolt chain target', () => {
    const { engine, enemies } = prepareEngine([200, 252, 304]);
    const [direct, firstChain, secondChain] = enemies;
    if (!direct || !firstChain || !secondChain) throw new Error('Expected three enemies');
    const shot = engine.modules.compile(['frost', 'toxin', 'arcbolt']).shots[0];
    if (!shot) throw new Error('Expected an Arcbolt shot');
    fireAt(engine, shot, direct);

    advanceUntil(engine, () => isFrozen(secondChain));

    for (const enemy of enemies) {
      expect(isFrozen(enemy)).toBe(true);
      expect(hasStatus(enemy, 'toxin')).toBe(true);
    }
  });

  it.each([
    ['proximity-mine', 0.6],
    ['toxic-cloud', 0.1],
    ['singularity', 0.5],
  ] as const)('applies Frost to every enemy in %s range', (staticModule, waitSeconds) => {
    const { engine, enemies } = prepareEngine([200, 244]);
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'frost', staticModule]).shots[0];
    const payload = carrier?.payload[0];
    if (!payload?.static) throw new Error(`Expected a ${staticModule} payload`);
    deployAt(engine, payload, 220);

    advanceUntil(engine, () => enemies.every(isFrozen), waitSeconds);

    expect(enemies.every(isFrozen)).toBe(true);
  });

  it('applies Frost to both enemies attacked by Tesla Sentry', () => {
    const { engine, enemies } = prepareEngine([200, 248]);
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'frost', 'tesla-node']).shots[0];
    const payload = carrier?.payload[0];
    if (!payload?.static) throw new Error('Expected a Tesla Sentry payload');
    deployAt(engine, payload, 220);

    advanceUntil(engine, () => enemies.every(isFrozen), 0.5);

    expect(enemies.every(isFrozen)).toBe(true);
  });

  it('refreshes Frost and Corrosive Spore without replaying their entry particles', () => {
    const frostSetup = prepareEngine([220]);
    const frostCarrier = frostSetup.engine.modules.compile([
      'impact-trigger', 'pulse', 'frost', 'toxic-cloud',
    ]).shots[0];
    const frostPayload = frostCarrier?.payload[0];
    const frostEnemy = frostSetup.enemies[0];
    if (!frostPayload?.static || !frostEnemy) throw new Error('Expected a Frost cloud and enemy');
    const frostEffects = vi.spyOn(frostSetup.engine.effects, 'spawnMany');
    const frostProjectile = deployAt(frostSetup.engine, frostPayload, 220);

    advanceFor(frostSetup.engine, 1.1);

    expect(frostProjectile.triggerCount).toBeGreaterThanOrEqual(3);
    expect(frostEnemy.slowTime).toBeGreaterThan(1.4);
    expect(frostEffects.mock.calls.filter(([ids]) => ids.includes('module:frost:hit-ring'))).toHaveLength(1);

    const toxinSetup = prepareEngine([220]);
    const toxinCarrier = toxinSetup.engine.modules.compile([
      'impact-trigger', 'pulse', 'toxin', 'tesla-node',
    ]).shots[0];
    const toxinPayload = toxinCarrier?.payload[0];
    const toxinEnemy = toxinSetup.enemies[0];
    if (!toxinPayload?.static || !toxinEnemy) throw new Error('Expected a Corrosive Tesla and enemy');
    const toxinEffects = vi.spyOn(toxinSetup.engine.effects, 'spawnMany');
    const toxinProjectile = deployAt(toxinSetup.engine, toxinPayload, 220);

    advanceFor(toxinSetup.engine, 1.2);

    expect(toxinProjectile.triggerCount).toBeGreaterThanOrEqual(2);
    expect(toxinEnemy.statuses.find((status) => status.id === 'toxin')?.remaining).toBeGreaterThan(2.5);
    expect(toxinEffects.mock.calls.filter(([ids]) => ids.includes('module:toxin:infect'))).toHaveLength(1);
  });
});
