import { describe, expect, it } from 'vitest';
import { findPathInterception } from '../src/game/interception';
import { distance } from '../src/game/math';
import { createPathSampler } from '../src/game/path';

describe('path interception', () => {
  it('leads a target moving away on a straight path', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 500, y: 0 },
    ]);

    const interception = findPathInterception({
      origin: { x: 0, y: 0 },
      path,
      projectileSpeed: 50,
      projectileLifetime: 5,
      targetDistance: 100,
      targetSpeed: 10,
    });

    expect(interception).not.toBeNull();
    expect(interception?.time).toBeCloseTo(2.5, 4);
    expect(interception?.position).toEqual({ x: expect.closeTo(125, 4), y: 0 });
  });

  it('accounts for the projectile spawning ahead of the tower', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 500, y: 0 },
    ]);

    const interception = findPathInterception({
      origin: { x: 0, y: 0 },
      path,
      projectileSpeed: 50,
      projectileLifetime: 5,
      launchOffset: 27,
      targetDistance: 100,
      targetSpeed: 10,
    });

    expect(interception?.time).toBeCloseTo(1.825, 4);
    expect(interception?.position.x).toBeCloseTo(118.25, 4);
  });

  it('aims beyond a corner when the target will turn before impact', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
    ]);
    const origin = { x: 0, y: 60 };

    const interception = findPathInterception({
      origin,
      path,
      projectileSpeed: 100,
      projectileLifetime: 3,
      targetDistance: 80,
      targetSpeed: 40,
    });

    expect(interception).not.toBeNull();
    expect(interception?.position.x).toBeCloseTo(100, 5);
    expect(interception?.position.y).toBeGreaterThan(0);
    expect(distance(origin, interception!.position)).toBeCloseTo(100 * interception!.time, 3);
  });

  it('uses the target\'s full speed after its slow expires', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 500, y: 0 },
    ]);

    const interception = findPathInterception({
      origin: { x: 0, y: 0 },
      path,
      projectileSpeed: 50,
      projectileLifetime: 5,
      targetDistance: 100,
      targetSpeed: 20,
      targetSlowFactor: 0.5,
      targetSlowTime: 1,
    });

    expect(interception?.time).toBeCloseTo(3, 4);
    expect(interception?.position.x).toBeCloseTo(150, 4);
  });

  it('returns null when the projectile cannot intercept within its lifetime', () => {
    const path = createPathSampler([
      { x: 0, y: 0 },
      { x: 500, y: 0 },
    ]);

    expect(findPathInterception({
      origin: { x: 0, y: 0 },
      path,
      projectileSpeed: 10,
      projectileLifetime: 2,
      targetDistance: 100,
      targetSpeed: 20,
    })).toBeNull();
  });
});
