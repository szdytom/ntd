import { describe, expect, it } from 'vitest';
import { ModuleRegistry, type ModuleDefinition } from '@prism-bastion/game-core/modules';

const TestIcon = () => null;

const definitions: ModuleDefinition[] = [
  {
    id: 'test-bolt',
    kind: 'projectile',
    tags: ['projectile'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 7, rarity: 'common',
    },
    compile: ({ emitProjectile }) => emitProjectile({ damage: 10, speed: 100, size: 2 }),
  },
  {
    id: 'test-power',
    kind: 'modifier',
    tags: [],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 3, rarity: 'common',
    },
    compile: ({ modifyNext }) => modifyNext({ damageMultiplier: 2 }),
  },
  {
    id: 'test-fork',
    kind: 'modifier',
    tags: [],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 2, rarity: 'common',
    },
    compile: ({ modifyNext }) => modifyNext({ count: 3, spread: 0.2 }),
  },
  {
    id: 'test-echo',
    kind: 'modifier',
    tags: ['repeat'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 4, rarity: 'common',
    },
    compile: ({ modifyNext }) => modifyNext({ repeats: 2, repeatDelay: 0.1 }),
  },
  {
    id: 'test-impact',
    kind: 'logic',
    tags: ['trigger'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 5, rarity: 'common',
    },
    compile: ({ wrapNext }) => wrapNext({ type: 'impact', payloadCount: 1 }),
  },
  {
    id: 'test-timer',
    kind: 'logic',
    tags: ['trigger'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 6, rarity: 'common',
    },
    compile: ({ wrapNext }) => wrapNext({ type: 'timer', payloadCount: 1, delay: 0.25 }),
  },
  {
    id: 'test-field',
    kind: 'static',
    tags: ['static'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 8, rarity: 'common',
    },
    compile: ({ emitProjectile }) => emitProjectile({
      damage: 1,
      speed: 0,
      size: 6,
      lifetime: 2,
      static: { duration: 2, armTime: 0, tickRate: 1, triggerRadius: 6 },
    }),
  },
  {
    id: 'test-route',
    kind: 'logic',
    tags: ['route'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 2, rarity: 'common',
    },
    compile: ({ modifyNext }) => modifyNext({ seeking: 4 }),
  },
  {
    id: 'test-fixed',
    kind: 'projectile',
    tags: ['projectile', 'fixed-route'],
    icon: TestIcon,
    meta: {
      color: '#ffffff', displayColor: '#767676', tint: '#eeeeee', energy: 3, rarity: 'common',
    },
    compile: ({ emitProjectile }) => emitProjectile({
      damage: 1,
      speed: 10,
      size: 1,
      trajectory: 'fixed',
    }),
  },
];

const createTestRegistry = (): ModuleRegistry => {
  const registry = new ModuleRegistry();
  definitions.forEach((definition) => registry.register(definition));
  return registry;
};

describe('module compiler', () => {
  const registry = createTestRegistry();

  it('applies modifiers to the projectile on their right', () => {
    const program = registry.compile(['test-power', 'test-bolt']);

    expect(program.diagnostics).toEqual([]);
    expect(program.energyCost).toBe(10);
    expect(program.shots).toHaveLength(1);
    expect(program.shots[0]).toMatchObject({ source: 'test-bolt', damage: 20 });
  });

  it('wraps once to resolve a trailing modifier', () => {
    const program = registry.compile(['test-bolt', 'test-power']);

    expect(program.diagnostics).toEqual([]);
    expect(program.wraps).toBe(1);
    expect(program.shots).toHaveLength(2);
    expect(program.shots[0]).toMatchObject({ source: 'test-bolt', damage: 10 });
    expect(program.shots[1]).toMatchObject({ source: 'test-bolt', damage: 20 });
  });

  it('builds nested trigger payloads and charges their energy', () => {
    const program = registry.compile(['test-impact', 'test-bolt', 'test-field']);

    expect(program.diagnostics).toEqual([]);
    expect(program.energyCost).toBe(20);
    expect(program.shots).toHaveLength(1);
    expect(program.shots[0].trigger).toEqual({ type: 'impact', payloadCount: 1 });
    expect(program.shots[0].payload.map((shot) => shot.source)).toEqual(['test-field']);
  });

  it('rejects a top-level static projectile', () => {
    const program = registry.compile(['test-field']);

    expect(program.shots).toEqual([]);
    expect(program.diagnostics).toContainEqual(expect.objectContaining({
      code: 'static-at-root',
      moduleId: 'test-field',
    }));
  });

  it('terminates unresolved trigger programs with a diagnostic', () => {
    const program = registry.compile(['test-impact', 'test-bolt']);

    expect(program.wraps).toBe(1);
    expect(program.diagnostics).toContainEqual(expect.objectContaining({
      code: 'missing-payload',
      moduleId: 'test-bolt',
    }));
  });

  it('diagnoses conflicting triggers and keeps only the trigger nearest the projectile', () => {
    const program = registry.compile(['test-impact', 'test-timer', 'test-bolt', 'test-field']);

    expect(program.diagnostics.map((diagnostic) => diagnostic.code)).toContain('trigger-conflict');
    expect(program.energyCost).toBe(21);
    expect(program.shots[0].trigger).toEqual({ type: 'timer', payloadCount: 1, delay: 0.25 });
    expect(program.shots[0].modules).toEqual(['test-timer', 'test-bolt']);
  });

  it('counts payload instances for every repeated carrier', () => {
    const program = registry.compile(['test-fork', 'test-impact', 'test-bolt', 'test-bolt']);

    expect(program.projectileCount).toBe(6);
  });

  it('stacks consecutive echo modifiers multiplicatively', () => {
    const program = registry.compile(['test-echo', 'test-echo', 'test-bolt']);

    expect(program.diagnostics).toEqual([]);
    expect(program.shots[0]).toMatchObject({ repeats: 4, repeatDelay: 0.1 });
    expect(program.projectileCount).toBe(4);
  });

  it('caches immutable programs by loadout', () => {
    const first = registry.compile(['test-power', 'test-bolt']);
    const second = registry.compile(['test-power', 'test-bolt']);

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.shots[0])).toBe(true);
  });

  it('derives ineffective combinations from module-owned tags', () => {
    const program = registry.compile(['test-route', 'test-fixed']);

    expect(program.diagnostics).toContainEqual(expect.objectContaining({
      code: 'ineffective-combination',
      moduleId: 'test-route',
      relatedModuleId: 'test-fixed',
    }));
  });
});
