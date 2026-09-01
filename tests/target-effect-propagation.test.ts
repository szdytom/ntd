import { describe, expect, it, vi } from 'vitest';
import { FIXED_SIMULATION_STEP, GameEngine } from '../src/game/engine';
import type { Signal, Projectile, ShotBlueprint } from '../src/game/types';

const placeSignal = (engine: GameEngine, signal: Signal, pathDistance: number): void => {
  const at = engine.path.pointAtDistance(pathDistance);
  signal.speed = 0;
  signal.distance = pathDistance;
  signal.progress = pathDistance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
  signal.hp = 10_000;
  signal.maxHp = 10_000;
};

const prepareEngine = (signalDistances: readonly number[]): { engine: GameEngine; signals: Signal[] } => {
  const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 73 });
  const tower = engine.towers[0];
  if (!tower) throw new Error('Expected a tower');
  tower.slots.fill(null);
  tower.energy = 0;
  tower.energyRegen = 0;
  for (const pathDistance of signalDistances) {
    engine.spawnCreativeSignal('block');
    const signal = engine.signals.at(-1);
    if (!signal) throw new Error('Expected a signal');
    placeSignal(engine, signal, pathDistance);
  }
  return { engine, signals: engine.signals };
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

const fireAt = (engine: GameEngine, shot: ShotBlueprint, signal: Signal): Projectile => {
  const direction = { x: Math.cos(signal.angle), y: Math.sin(signal.angle) };
  const launchGap = signal.radius + shot.size + 2;
  return addProjectile(
    engine,
    shot,
    {
      x: signal.position.x - direction.x * launchGap,
      y: signal.position.y - direction.y * launchGap,
    },
    { x: direction.x * shot.speed, y: direction.y * shot.speed },
    signal.id,
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

const hasStatus = (signal: Signal, id: string): boolean => signal.statuses.some((status) => status.id === id);
const isSlowed = (signal: Signal): boolean => signal.slowFactor < 1 && signal.slowTime > 0;

describe('target effect propagation', () => {
  it('applies Frost and Corrosive Spore to direct and splash targets', () => {
    const { engine, signals } = prepareEngine([200, 200]);
    const [direct, splash] = signals;
    if (!direct || !splash) throw new Error('Expected two signals');
    const shot = engine.modules.compile(['frost', 'toxin', 'nova']).shots[0];
    if (!shot) throw new Error('Expected a nova shot');
    const impactPosition = { ...direct.position };
    const effects = vi.spyOn(engine.effects, 'spawnMany');
    fireAt(engine, shot, direct);

    advanceUntil(engine, () => isSlowed(splash));

    expect(isSlowed(direct)).toBe(true);
    expect(isSlowed(splash)).toBe(true);
    expect(hasStatus(direct, 'toxin')).toBe(true);
    expect(hasStatus(splash, 'toxin')).toBe(true);
    for (const effectId of ['module:frost:hit-ring', 'module:toxin:infect']) {
      const releases = effects.mock.calls.filter(([ids]) => ids.includes(effectId));
      expect(releases).toHaveLength(1);
      expect(releases[0]?.[1].position).toEqual(impactPosition);
    }
  });

  it('releases every burning modifier once at the splash center', () => {
    const { engine, signals } = prepareEngine([200, 200]);
    const [direct, splash] = signals;
    if (!direct || !splash) throw new Error('Expected two signals');
    const shot = engine.modules.compile([
      'ember-coating', 'searing-sigil', 'starfire-matrix', 'nova',
    ]).shots[0];
    if (!shot) throw new Error('Expected a burning nova shot');
    const impactPosition = { ...direct.position };
    const effects = vi.spyOn(engine.effects, 'spawnMany');
    fireAt(engine, shot, direct);

    advanceUntil(engine, () => hasStatus(splash, 'starfire-matrix'));

    for (const signal of signals) {
      expect(hasStatus(signal, 'ember-coating')).toBe(true);
      expect(hasStatus(signal, 'searing-sigil')).toBe(true);
      expect(hasStatus(signal, 'starfire-matrix')).toBe(true);
    }
    for (const effectId of [
      'module:ember-coating:ignite',
      'module:searing-sigil:brand',
      'module:starfire-matrix:implant',
    ]) {
      const releases = effects.mock.calls.filter(([ids]) => ids.includes(effectId));
      expect(releases).toHaveLength(1);
      expect(releases[0]?.[1].position).toEqual(impactPosition);
    }
  });

  it('applies Frost and Corrosive Spore to every Arcbolt chain target', () => {
    const { engine, signals } = prepareEngine([200, 240, 280]);
    const [direct, firstChain, secondChain] = signals;
    if (!direct || !firstChain || !secondChain) throw new Error('Expected three signals');
    const shot = engine.modules.compile(['frost', 'toxin', 'arcbolt']).shots[0];
    if (!shot) throw new Error('Expected an Arcbolt shot');
    const effects = vi.spyOn(engine.effects, 'spawnMany');
    fireAt(engine, shot, direct);

    advanceUntil(engine, () => isSlowed(secondChain));

    for (const signal of signals) {
      expect(isSlowed(signal)).toBe(true);
      expect(hasStatus(signal, 'toxin')).toBe(true);
    }
    for (const effectId of ['module:frost:hit-ring', 'module:toxin:infect']) {
      const releases = effects.mock.calls.filter(([ids]) => ids.includes(effectId));
      expect(releases).toHaveLength(3);
      for (const signal of signals) {
        expect(releases.some(([, options]) => (
          options.position.x === signal.position.x && options.position.y === signal.position.y
        ))).toBe(true);
      }
    }
  });

  it('stops Arcbolt from chaining after Focus Core consumes its chain capacity', () => {
    const { engine, signals } = prepareEngine([200, 240]);
    const [direct, nearby] = signals;
    if (!direct || !nearby) throw new Error('Expected two signals');
    const shot = engine.modules.compile(['focus-core', 'arcbolt']).shots[0];
    if (!shot) throw new Error('Expected a focused Arcbolt shot');
    fireAt(engine, shot, direct);

    advanceUntil(engine, () => direct.hp < direct.maxHp);

    expect(direct.hp).toBeLessThan(direct.maxHp);
    expect(nearby.hp).toBe(nearby.maxHp);
  });

  it.each([
    ['proximity-mine', 0.6],
    ['toxic-cloud', 0.1],
    ['singularity', 0.5],
  ] as const)('applies Frost to every signal in %s range', (staticModule, waitSeconds) => {
    const { engine, signals } = prepareEngine([220, 220]);
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'frost', staticModule]).shots[0];
    const payload = carrier?.payload[0];
    if (!payload?.static) throw new Error(`Expected a ${staticModule} payload`);
    deployAt(engine, payload, 220);

    advanceUntil(engine, () => signals.every(isSlowed), waitSeconds);

    expect(signals.every(isSlowed)).toBe(true);
  });

  it('applies Frost to both signals attacked by Tesla Sentry', () => {
    const { engine, signals } = prepareEngine([220, 220]);
    const carrier = engine.modules.compile(['impact-trigger', 'pulse', 'frost', 'tesla-node']).shots[0];
    const payload = carrier?.payload[0];
    if (!payload?.static) throw new Error('Expected a Tesla Sentry payload');
    deployAt(engine, payload, 220);

    advanceUntil(engine, () => signals.every(isSlowed), 0.5);

    expect(signals.every(isSlowed)).toBe(true);
  });

  it('plays static modifier releases once at each newly affected target', () => {
    const frostSetup = prepareEngine([210, 250]);
    const frostCarrier = frostSetup.engine.modules.compile([
      'impact-trigger', 'pulse', 'frost', 'toxic-cloud',
    ]).shots[0];
    const frostPayload = frostCarrier?.payload[0];
    if (!frostPayload?.static) throw new Error('Expected a Frost cloud and signals');
    const frostEffects = vi.spyOn(frostSetup.engine.effects, 'spawnMany');
    const frostProjectile = deployAt(frostSetup.engine, frostPayload, 230);

    advanceFor(frostSetup.engine, 1.1);

    expect(frostProjectile.triggerCount).toBeGreaterThanOrEqual(3);
    expect(frostSetup.signals.every(isSlowed)).toBe(true);
    const frostReleases = frostEffects.mock.calls.filter(([ids]) => ids.includes('module:frost:hit-ring'));
    expect(frostReleases).toHaveLength(2);
    for (const signal of frostSetup.signals) {
      expect(frostReleases.some(([, options]) => (
        options.position.x === signal.position.x && options.position.y === signal.position.y
      ))).toBe(true);
    }

    const toxinSetup = prepareEngine([220]);
    const toxinCarrier = toxinSetup.engine.modules.compile([
      'impact-trigger', 'pulse', 'toxin', 'tesla-node',
    ]).shots[0];
    const toxinPayload = toxinCarrier?.payload[0];
    const toxinSignal = toxinSetup.signals[0];
    if (!toxinPayload?.static || !toxinSignal) throw new Error('Expected a Corrosive Tesla and signal');
    const toxinEffects = vi.spyOn(toxinSetup.engine.effects, 'spawnMany');
    const toxinProjectile = deployAt(toxinSetup.engine, toxinPayload, 220);

    advanceFor(toxinSetup.engine, 1.2);

    expect(toxinProjectile.triggerCount).toBeGreaterThanOrEqual(2);
    expect(toxinSignal.statuses.find((status) => status.id === 'toxin')?.remaining).toBeGreaterThan(0);
    const toxinReleases = toxinEffects.mock.calls.filter(([ids]) => ids.includes('module:toxin:infect'));
    expect(toxinReleases).toHaveLength(1);
    expect(toxinReleases[0]?.[1].position).toEqual(toxinSignal.position);
  });
});
