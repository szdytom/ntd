import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from '../src/modules';

describe('module balance metadata', () => {
  const registry = createModuleRegistry();

  it.each([
    ['echo', 18],
    ['barrage', 32],
    ['razor', 24],
    ['tesla-node', 22],
    ['proximity-mine', 28],
    ['proximity-trigger', 7],
    ['reclaim-circuit', 4],
    ['colossus', 9],
    ['singularity', 82],
    ['condense-core', 17],
    ['focus-core', 16],
    ['arcbolt', 25],
    ['seeker', 10],
  ] as const)('%s costs %i energy', (moduleId, energy) => {
    expect(registry.require(moduleId).meta.energy).toBe(energy);
  });

  it.each([
    ['echo', 'rare'],
    ['seeker', 'uncommon'],
    ['economizer', 'uncommon'],
    ['condense-core', 'uncommon'],
  ] as const)('%s has %s rarity', (moduleId, rarity) => {
    expect(registry.require(moduleId).meta.rarity).toBe(rarity);
  });

  it('limits singularity fields to three seconds', () => {
    const carrier = registry.compile(['impact-trigger', 'pulse', 'singularity']).shots[0];
    const singularity = carrier?.payload[0];

    expect(singularity).toMatchObject({ lifetime: 3, static: { duration: 3 } });
  });
});
