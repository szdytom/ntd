import { describe, expect, it } from 'vitest';
import { EnemySpatialIndex } from '../src/game/spatial-index';
import { selectTowerTarget } from '../src/game/targeting';
import type { Enemy, Tower } from '../src/game/types';

const enemy = (id: number, x: number, hp: number, progress: number): Enemy => ({
  id,
  type: 'spark',
  progress,
  distance: progress * 100,
  position: { x, y: 0 },
  angle: 0,
  hp,
  maxHp: 100,
  speed: 0,
  reward: 0,
  coreDamage: 1,
  radius: 10,
  splitGeneration: 0,
  slowFactor: 0,
  slowTime: 0,
  hitFlash: 0,
  shield: 0,
  maxShield: 0,
  shieldHitFlash: 0,
  shieldRadiusScale: 0,
  shieldRippleAge: 0,
  statuses: [],
  dead: false,
});

const tower = (targeting: Tower['targeting']): Tower => ({
  id: 1,
  padIndex: 0,
  position: { x: 0, y: 0 },
  rotation: 0,
  energy: 100,
  maxEnergy: 100,
  energyRegen: 10,
  cooldown: 1,
  cooldownLeft: 0,
  range: 200,
  targeting,
  level: 1,
  slots: [],
  flash: 0,
  targetId: null,
});

describe('spatial targeting systems', () => {
  const enemies = [enemy(1, 20, 80, 0.2), enemy(2, 80, 20, 0.8), enemy(3, 240, 50, 0.5)];

  it('indexes radius and segment candidates without leaking distant enemies', () => {
    const index = new EnemySpatialIndex(64);
    index.rebuild(enemies);

    expect(index.withinRadius({ x: 0, y: 0 }, 100).map((item) => item.id)).toEqual([1, 2]);
    expect(index.nearestWithinRadius({ x: 70, y: 0 }, 100).map((item) => item.id)).toEqual([2, 1]);
    expect(index.alongSegment({ x: 0, y: 0 }, { x: 90, y: 0 }, 12).map((item) => item.id)).toEqual([1, 2]);
  });

  it('selects targets with a linear scan for each targeting strategy', () => {
    expect(selectTowerTarget(tower('core-nearest'), enemies)?.id).toBe(2);
    expect(selectTowerTarget(tower('hp-lowest'), enemies)?.id).toBe(2);
    expect(selectTowerTarget(tower('tower-nearest'), enemies)?.id).toBe(1);
  });
});
