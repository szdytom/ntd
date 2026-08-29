import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS, resolveSpawnEntrances } from '../src/game/config';

describe('level configuration', () => {
  it('provides a two-wave, two-node beginner elbow map', () => {
    const level = getLevel('starter-elbow');
    expect(['starter-elbow:0', 'starter-elbow:1', 'starter-elbow:2', 'starter-elbow:3'].map(
      (id) => level.graph.nodes.get(id)?.position,
    )).toEqual([
      { x: -40, y: 510 }, { x: 420, y: 510 },
      { x: 420, y: 145 }, { x: 1120, y: 145 },
    ]);
    expect(level.towerPads).toHaveLength(2);
    expect(level.waves).toHaveLength(2);
    expect(level.waves.flat()).toHaveLength(14);
    expect(LEVELS).toHaveLength(5);
  });

  it('keeps white-prism pads near the road without overlapping it', () => {
    const level = getLevel('white-prism');
    const distanceToSegment = (
      point: { x: number; y: number },
      start: { x: number; y: number },
      end: { x: number; y: number },
    ): number => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const ratio = Math.max(0, Math.min(1, (
        (point.x - start.x) * dx + (point.y - start.y) * dy
      ) / (dx * dx + dy * dy)));
      return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
    };
    const distances = level.towerPads.map((pad) => Math.min(
      ...level.graph.edges.map((edge) => {
        const start = level.graph.nodes.get(edge.from)?.position ?? pad;
        const end = level.graph.nodes.get(edge.to)?.position ?? pad;
        return distanceToSegment(pad, start, end);
      }),
    ));

    expect(level.towerPads).toHaveLength(7);
    expect(level.towerPads).toContainEqual({ x: 650, y: 480 });
    expect(distances.every((distance) => distance >= 75 && distance <= 110)).toBe(true);
  });

  it('provides a three-entrance tree map with a shared route to the core', () => {
    const level = getLevel('triune-delta');
    const confluence = level.graph.nodes.get('confluence');

    expect(level.graph.entrances).toEqual(['north-entry', 'center-entry', 'south-entry']);
    expect(confluence?.children).toEqual(['north-bend', 'center-bend', 'south-bend']);
    expect(level.graph.root).toBe('core');
    expect(level.towerPads).toHaveLength(10);
    expect(level.waves).toHaveLength(7);
    expect(level.moduleDraft).toEqual({ initialPicks: 5, wavePicks: 4 });
    expect(LEVELS.filter((entry) => entry.id !== 'triune-delta').every((entry) => (
      entry.moduleDraft.initialPicks === 3 && entry.moduleDraft.wavePicks === 3
    ))).toBe(true);

    const eliteDeployments = level.waves.map((wave) => wave
      .filter((entry) => ['crown', 'fracture', 'anvil', 'radiant'].includes(entry.type))
      .map((entry) => `${entry.entrance}:${entry.type}`));
    expect(eliteDeployments.slice(2)).toEqual([
      ['north-entry:crown'],
      ['center-entry:fracture'],
      ['north-entry:fracture', 'center-entry:crown', 'south-entry:fracture'],
      ['north-entry:anvil', 'center-entry:radiant', 'south-entry:anvil'],
      [
        'north-entry:crown', 'north-entry:fracture',
        'center-entry:radiant', 'center-entry:anvil',
        'south-entry:crown', 'south-entry:fracture',
      ],
    ]);
    level.waves.slice(2).flat().filter((entry) => entry.entrance).forEach((entry) => {
      expect(resolveSpawnEntrances(entry, level.graph)).toEqual([entry.entrance]);
    });
  });

  it('keeps authored route edges horizontal, vertical, or at 45 degrees', () => {
    for (const level of LEVELS) {
      for (const edge of level.graph.edges) {
        const start = level.graph.nodes.get(edge.from)?.position;
        const end = level.graph.nodes.get(edge.to)?.position;
        if (!start || !end) throw new Error(`Expected route edge ${edge.from} -> ${edge.to}`);
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        expect(dx === 0 || dy === 0 || dx === dy, `${level.id}: ${edge.from} -> ${edge.to}`).toBe(true);
      }
    }
  });
});
