import { describe, expect, it } from 'vitest';
import { LEVELS, resolveSpawnEntrances, WORLD } from '../src/game/config';
import { signalRegistry } from '../src/signals';

describe('level configuration', () => {
  it('keeps every level structurally playable', () => {
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);

    for (const level of LEVELS) {
      expect(level.id.trim(), 'level id').not.toBe('');
      expect(level.graph.nodes.has(level.graph.root), `${level.id}: root`).toBe(true);
      expect(level.graph.entrances.length, `${level.id}: entrances`).toBeGreaterThan(0);
      expect(level.towerPads.length, `${level.id}: tower pads`).toBeGreaterThan(0);
      expect(level.waves.length, `${level.id}: waves`).toBeGreaterThan(0);
      expect(level.signalHealthScale, `${level.id}: health scale`).toBeGreaterThan(0);
      expect(level.signalSpeedScale, `${level.id}: speed scale`).toBeGreaterThan(0);
      expect(level.startingShards, `${level.id}: starting shards`).toBeGreaterThanOrEqual(0);

      for (const [key, picks] of Object.entries(level.moduleDraft)) {
        expect(Number.isInteger(picks) && picks > 0, `${level.id}: ${key}`).toBe(true);
      }
      for (const [index, pad] of level.towerPads.entries()) {
        expect(Number.isFinite(pad.x) && pad.x >= 0 && pad.x <= WORLD.width, `${level.id}: pad ${index} x`).toBe(true);
        expect(Number.isFinite(pad.y) && pad.y >= 0 && pad.y <= WORLD.height, `${level.id}: pad ${index} y`).toBe(true);
      }
      for (const [waveIndex, wave] of level.waves.entries()) {
        expect(wave.length, `${level.id}: wave ${waveIndex + 1}`).toBeGreaterThan(0);
        for (const entry of wave) {
          expect(signalRegistry.require(entry.type), `${level.id}: ${entry.type}`).toBeDefined();
          expect(() => resolveSpawnEntrances(entry, level.graph)).not.toThrow();
        }
      }
    }
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
