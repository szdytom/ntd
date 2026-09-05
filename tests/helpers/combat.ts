import { FIXED_SIMULATION_STEP, type GameEngine } from '@prism-bastion/game-core/game/engine';
import { createProjectileState } from '@prism-bastion/game-core/game/projectile';
import type { Point, Projectile, ShotBlueprint, Signal } from '@prism-bastion/game-core/game/types';

export function addTestProjectile(
  engine: GameEngine,
  shot: ShotBlueprint,
  position: Point,
  velocity: Point,
  targetId: number | null = null,
  overrides: Partial<Projectile> = {},
): Projectile {
  const projectile = Object.assign(createProjectileState({
    id: 50_000 + engine.projectiles.length,
    towerId: engine.towers[0]?.id ?? -1,
    shot,
    position,
    velocity,
    targetId,
    trailTimer: 1,
  }), overrides);
  engine.projectiles.push(projectile);
  return projectile;
}

export function placeSignalOnPath(
  engine: GameEngine,
  signal: Signal,
  distance: number,
  options: { speed?: number; health?: number } = {},
): void {
  const at = engine.path.pointAtDistance(distance);
  signal.distance = distance;
  signal.progress = distance / engine.path.length;
  signal.position = at.position;
  signal.angle = at.angle;
  if (options.speed !== undefined) signal.speed = options.speed;
  if (options.health !== undefined) {
    signal.hp = options.health;
    signal.maxHp = options.health;
  }
}

export function advanceEngineFor(engine: GameEngine, seconds: number): void {
  const steps = Math.ceil(seconds / FIXED_SIMULATION_STEP);
  for (let step = 0; step < steps; step += 1) engine.update(FIXED_SIMULATION_STEP);
}

export function advanceEngineUntil(
  engine: GameEngine,
  condition: () => boolean,
  seconds = 1,
): void {
  const steps = Math.ceil(seconds / FIXED_SIMULATION_STEP);
  for (let step = 0; step < steps && !condition(); step += 1) engine.update(FIXED_SIMULATION_STEP);
}
