import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';

describe('premium baseline projectiles', () => {
  const registry = createModuleRegistry();

  it('positions Prism Slug as a rare single-target upgrade to Pulse Round', () => {
    const definition = registry.require('prism-slug');
    const pulseDefinition = registry.require('pulse');
    const shot = registry.compile(['prism-slug']).shots[0];
    const pulse = registry.compile(['pulse']).shots[0];

    expect(definition).toMatchObject({ kind: 'projectile', meta: { rarity: 'rare' } });
    expect(definition.meta.energy).toBeGreaterThan(pulseDefinition.meta.energy);
    expect(shot?.damage).toBeGreaterThan(pulse?.damage ?? Number.POSITIVE_INFINITY);
    expect(shot).toMatchObject({ count: 1, pierce: 0, splash: 0 });
  });

  it('positions Geode Bloom as an epic area upgrade to Micro Nova', () => {
    const definition = registry.require('geode-bloom');
    const novaDefinition = registry.require('nova');
    const shot = registry.compile(['geode-bloom']).shots[0];
    const nova = registry.compile(['nova']).shots[0];

    expect(definition).toMatchObject({ kind: 'projectile', meta: { rarity: 'epic' } });
    expect(definition.tags).toContain('area');
    expect(definition.meta.energy).toBeGreaterThan(novaDefinition.meta.energy);
    expect(shot?.damage).toBeGreaterThan(nova?.damage ?? Number.POSITIVE_INFINITY);
    expect(shot?.splash).toBeGreaterThan(nova?.splash ?? Number.POSITIVE_INFINITY);
  });

  it('allows Condense Core to convert the Geode Bloom blast', () => {
    const base = registry.compile(['geode-bloom']).shots[0];
    const condensed = registry.compile(['condense-core', 'geode-bloom']).shots[0];

    expect(condensed?.splash).toBe(0);
    expect(condensed?.damage).toBeGreaterThan(base?.damage ?? Number.POSITIVE_INFINITY);
  });
});
