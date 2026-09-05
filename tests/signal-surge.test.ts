import { describe, expect, it } from 'vitest';
import { getSignalCapability, signalRegistry } from '@prism-bastion/game-core/signals';
import {
  sinePulseMean,
  signalMovementSpeedMultiplier,
  pulseRestSpeedMultiplier,
} from '@prism-bastion/game-core/signals/capabilities/movement';
import { FIXED_SIMULATION_STEP, GameEngine } from '@prism-bastion/game-core/game/engine';
import { findPathInterception } from '@prism-bastion/game-core/game/interception';

describe('Surge wave movement', () => {
  it('uses a smooth sine pulse while preserving its configured average speed', () => {
    const definition = signalRegistry.require('surge');
    const movement = getSignalCapability(definition, 'pulse-movement');
    if (!movement) throw new Error('Expected Surge wave movement');
    const restMultiplier = pulseRestSpeedMultiplier(movement);
    const pulseMean = sinePulseMean(movement.wavePower);

    expect(definition.visual.geometry).toBe('surge');
    expect(
      restMultiplier + (movement.peakSpeedMultiplier - restMultiplier) * pulseMean,
    ).toBeCloseTo(1, 8);
    expect(signalMovementSpeedMultiplier(movement, 0)).toBeCloseTo(movement.peakSpeedMultiplier, 8);
    expect(signalMovementSpeedMultiplier(movement, movement.cycle / 2)).toBeCloseTo(restMultiplier, 8);
    expect(signalMovementSpeedMultiplier(movement, movement.cycle - 1e-8))
      .toBeCloseTo(signalMovementSpeedMultiplier(movement, 1e-8), 8);
    expect(signalMovementSpeedMultiplier(movement, movement.cycle / 4)).toBeCloseTo(
      restMultiplier + (movement.peakSpeedMultiplier - restMultiplier) / 2 ** movement.wavePower,
      8,
    );

    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 89 });
    engine.spawnCreativeSignal('surge');
    const signal = engine.signals[0];
    if (!signal) throw new Error('Expected a Surge signal');
    const averageSpeed = signal.speed;
    for (const tower of engine.towers) tower.slots.fill(null);

    const burstStep = signal.speed * movement.peakSpeedMultiplier * FIXED_SIMULATION_STEP;
    engine.update(FIXED_SIMULATION_STEP);
    expect(signal.distance).toBeCloseTo(burstStep, 8);

    const cycleSteps = Math.round(movement.cycle / FIXED_SIMULATION_STEP);
    for (let step = 1; step < cycleSteps; step += 1) engine.update(FIXED_SIMULATION_STEP);
    expect(signal.distance).toBeCloseTo(averageSpeed * movement.cycle, 6);
    expect(signal.speed).toBe(averageSpeed);
  });

  it('keeps tower interception based on average speed during a dash', () => {
    const movement = getSignalCapability(signalRegistry.require('surge'), 'pulse-movement');
    const engine = new GameEngine({ mode: 'creative', levelId: 'white-prism', seed: 97 });
    engine.spawnCreativeSignal('surge');
    const signal = engine.signals[0];
    const tower = engine.towers[0];
    if (!signal || !tower) throw new Error('Expected a tower and Surge signal');
    const at = engine.path.pointAtDistance(200);
    signal.distance = 200;
    signal.progress = signal.distance / engine.path.length;
    signal.position = at.position;
    signal.angle = at.angle;
    tower.slots.fill(null);
    tower.slots[0] = 'pulse';
    tower.range = 1_000;
    tower.energy = tower.maxEnergy;
    tower.cooldownLeft = 0;

    engine.update(FIXED_SIMULATION_STEP);

    const projectile = engine.projectiles[0];
    if (!projectile) throw new Error('Expected the tower to fire');
    const averagePrediction = findPathInterception({
      origin: tower.position,
      path: engine.path,
      projectileSpeed: projectile.shot.speed,
      projectileLifetime: projectile.shot.lifetime,
      launchOffset: 27,
      targetDistance: signal.distance,
      targetSpeed: signal.speed,
    });
    const burstPrediction = findPathInterception({
      origin: tower.position,
      path: engine.path,
      projectileSpeed: projectile.shot.speed,
      projectileLifetime: projectile.shot.lifetime,
      launchOffset: 27,
      targetDistance: signal.distance,
      targetSpeed: signal.speed * (movement?.peakSpeedMultiplier ?? 1),
    });
    if (!averagePrediction || !burstPrediction) throw new Error('Expected both interception solutions');
    const actualAngle = Math.atan2(projectile.velocity.y, projectile.velocity.x);
    const averageAngle = Math.atan2(
      averagePrediction.position.y - tower.position.y,
      averagePrediction.position.x - tower.position.x,
    );
    const burstAngle = Math.atan2(
      burstPrediction.position.y - tower.position.y,
      burstPrediction.position.x - tower.position.x,
    );

    expect(actualAngle).toBeCloseTo(averageAngle, 7);
    expect(Math.abs(actualAngle - burstAngle)).toBeGreaterThan(0.01);
  });
});
