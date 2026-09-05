import { describe, expect, it } from 'vitest';
import { LEVELS, resolveSpawnEntrances, TUTORIAL_LEVEL_ID, WORLD } from '@prism-bastion/game-core/game/config';
import { signalRegistry } from '@prism-bastion/game-core/signals';

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

      for (const [key, picks] of Object.entries({
        initialPicks: level.moduleDraft.initialPicks,
        wavePicks: level.moduleDraft.wavePicks,
      })) {
        expect(Number.isInteger(picks) && picks > 0, `${level.id}: ${key}`).toBe(true);
      }
      expect(level.moduleDraft.qualityAnchors, `${level.id}: quality anchors`).toHaveLength(level.waves.length);
      expect(level.moduleDraft.qualityAnchors.every((anchor) => anchor >= 1 && anchor <= 5)).toBe(true);
      expect(level.moduleDraft.inventoryInfluence).toBeGreaterThanOrEqual(0);
      expect(level.moduleDraft.inventoryInfluence).toBeLessThanOrEqual(1);
      expect(Number.isFinite(level.moduleDraft.qualityBias)).toBe(true);
      expect(level.moduleDraft.abandonLimit).toBe(Math.floor(level.waves.length / 2));
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

  it('ramps standard reward quality from two to three', () => {
    for (const level of LEVELS.filter((candidate) => candidate.id !== TUTORIAL_LEVEL_ID)) {
      expect(level.moduleDraft.qualityAnchors[0], level.id).toBe(2);
      expect(level.moduleDraft.qualityAnchors.at(-1), level.id).toBe(3);
      for (let index = 1; index < level.moduleDraft.qualityAnchors.length; index += 1) {
        expect(level.moduleDraft.qualityAnchors[index], level.id)
          .toBeGreaterThan(level.moduleDraft.qualityAnchors[index - 1] ?? 0);
      }
    }
  });
});
