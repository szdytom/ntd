import { describe, expect, it } from 'vitest';
import { MODULE_RARITIES, createModuleRegistry } from '../src/modules';

describe('module metadata', () => {
  const registry = createModuleRegistry();

  it('provides structurally valid metadata for every registered module', () => {
    const modules = registry.list();
    const ids = modules.map((module) => module.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(modules.map((module) => module.icon)).size).toBe(modules.length);
    for (const module of modules) {
      expect(module.id.length).toBeGreaterThan(0);
      expect(typeof module.icon).toBe('function');
      expect(module.meta.name.length).toBeGreaterThan(0);
      expect(module.meta.shortName.length).toBeGreaterThan(0);
      expect(module.meta.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(module.meta.tint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Number.isFinite(module.meta.energy)).toBe(true);
      if (module.meta.energy < 0) expect(module.kind).toBe('logic');
      expect(Object.keys(MODULE_RARITIES)).toContain(module.meta.rarity);
      expect(Array.isArray(module.tags)).toBe(true);
      expect(new Set(module.tags).size).toBe(module.tags.length);
    }
  });

  it('keeps static projectile lifetime aligned with its runtime duration', () => {
    for (const module of registry.list().filter((candidate) => candidate.kind === 'static')) {
      const carrier = registry.compile(['impact-trigger', 'pulse', module.id]).shots[0];
      const payload = carrier?.payload[0];

      expect(payload?.static).toBeDefined();
      expect(payload?.lifetime).toBe(payload?.static?.duration);
      expect(payload?.lifetime).toBeGreaterThan(0);
    }
  });

  it('keeps resonant trail at its authored rare damage tier', () => {
    const resonance = registry.require('resonant-trail');

    expect(resonance.meta.rarity).toBe('rare');
    expect(resonance.meta.energy).toBe(32);
    expect(resonance.meta.text?.detail?.damage).toBe(200);
  });
});
