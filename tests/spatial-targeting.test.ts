import { describe, expect, it } from 'vitest';
import { SignalSpatialIndex } from '../src/game/spatial-index';
import { selectTowerTarget } from '../src/game/targeting';
import type { Signal, Tower } from '../src/game/types';

const signal = (id: number, x: number, hp: number, progress: number): Signal => ({
  id,
    type: 'spark',
    variantId: 'spark',
  routeId: 'test',
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
  const signals = [signal(1, 20, 80, 0.2), signal(2, 80, 20, 0.8), signal(3, 240, 50, 0.5)];

  it('indexes radius and segment candidates without leaking distant signals', () => {
    const index = new SignalSpatialIndex(64);
    index.rebuild(signals);

    expect(index.withinRadius({ x: 0, y: 0 }, 100).map((item) => item.id)).toEqual([1, 2]);
    expect(index.nearestWithinRadius({ x: 70, y: 0 }, 100).map((item) => item.id)).toEqual([2, 1]);
    expect(index.findNearestWithinRadius({ x: 70, y: 0 }, 100)?.id).toBe(2);
    expect(index.countWithinRadius({ x: 0, y: 0 }, 100)).toBe(2);
    expect(index.alongSegment({ x: 0, y: 0 }, { x: 90, y: 0 }, 12).map((item) => item.id)).toEqual([1, 2]);
  });

  it('fills reusable query buffers without retaining stale results', () => {
    const index = new SignalSpatialIndex(64);
    const result: Signal[] = [];
    index.rebuild(signals);

    expect(index.collectWithinRadius({ x: 0, y: 0 }, 100, result).map((item) => item.id)).toEqual([1, 2]);
    expect(index.collectWithinRadius({ x: 240, y: 0 }, 10, result).map((item) => item.id)).toEqual([3]);
    expect(index.collectAlongSegment({ x: 0, y: 0 }, { x: 90, y: 0 }, 12, result).map((item) => item.id))
      .toEqual([1, 2]);
  });

  it('updates only when a signal dirties its grid membership', () => {
    const index = new SignalSpatialIndex(64);
    const moving = signal(11, 20, 100, 0);

    expect(index.update(moving)).toBe(true);
    expect(index.withinRadius({ x: 20, y: 0 }, 4)).toEqual([moving]);

    moving.position.x = 48;
    expect(index.update(moving)).toBe(false);
    expect(index.withinRadius({ x: 20, y: 0 }, 4)).toEqual([]);
    expect(index.withinRadius({ x: 48, y: 0 }, 4)).toEqual([moving]);

    moving.position.x = 80;
    expect(index.update(moving)).toBe(true);
    expect(index.withinRadius({ x: 48, y: 0 }, 4)).toEqual([]);
    expect(index.withinRadius({ x: 80, y: 0 }, 4)).toEqual([moving]);
  });

  it('incrementally inserts, removes, and clears signal membership', () => {
    const index = new SignalSpatialIndex(64);
    const first = signal(21, 20, 100, 0);
    const second = signal(22, 90, 100, 0);

    index.update(first);
    index.update(second);
    first.dead = true;
    expect(index.update(first)).toBe(true);
    expect(index.withinRadius({ x: 0, y: 0 }, 200).map((item) => item.id)).toEqual([22]);
    expect(index.remove(second.id)).toBe(true);
    expect(index.remove(second.id)).toBe(false);

    first.dead = false;
    index.update(first);
    index.update(second);
    index.clear();
    expect(index.withinRadius({ x: 0, y: 0 }, 200)).toEqual([]);
  });

  it('matches a rebuilt reference index across movement, death, spawn, and removal', () => {
    const incremental = new SignalSpatialIndex(64);
    const reference = new SignalSpatialIndex(64);
    const moving = Array.from({ length: 36 }, (_, index) => (
      signal(index + 100, (index * 47) % 520 - 80, 100, 0)
    ));
    moving.forEach((item, index) => { item.position.y = (index * 71) % 380 - 60; });
    moving.forEach((item) => incremental.update(item));

    const sortedIds = (items: Signal[]) => items.map((item) => item.id).sort((left, right) => left - right);
    for (let step = 0; step < 160; step += 1) {
      for (let index = 0; index < moving.length; index += 1) {
        const item = moving[index];
        if (!item || item.dead) continue;
        item.position.x += ((index * 13 + step * 7) % 17) - 8;
        item.position.y += ((index * 5 + step * 11) % 13) - 6;
        if ((step + index * 19) % 137 === 0) item.dead = true;
        incremental.update(item);
      }
      if (step % 29 === 0) {
        const spawned = signal(1_000 + step, 30 + step * 2, 100, 0);
        spawned.position.y = 210 - step;
        moving.push(spawned);
        incremental.update(spawned);
      }
      if (step % 41 === 0) {
        const removed = moving.shift();
        if (removed) incremental.remove(removed.id);
      }

      reference.rebuild(moving);
      const center = { x: (step * 31) % 520 - 80, y: (step * 23) % 380 - 60 };
      const radius = 35 + (step % 6) * 27;
      expect(sortedIds(incremental.withinRadius(center, radius)))
        .toEqual(sortedIds(reference.withinRadius(center, radius)));
      expect(incremental.countWithinRadius(center, radius)).toBe(reference.countWithinRadius(center, radius));
      expect(incremental.findNearestWithinRadius(center, radius)?.id)
        .toBe(reference.findNearestWithinRadius(center, radius)?.id);
      const end = { x: center.x + 130, y: center.y - 75 };
      expect(sortedIds(incremental.alongSegment(center, end, 24)))
        .toEqual(sortedIds(reference.alongSegment(center, end, 24)));
    }
  });

  it('selects targets with a linear scan for each targeting strategy', () => {
    expect(selectTowerTarget(tower('core-nearest'), signals)?.id).toBe(2);
    expect(selectTowerTarget(tower('hp-lowest'), signals)?.id).toBe(2);
    expect(selectTowerTarget(tower('tower-nearest'), signals)?.id).toBe(1);
  });
});
