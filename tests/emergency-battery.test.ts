import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';

describe('emergency battery module', () => {
  const registry = createModuleRegistry();

  it('registers as uncommon negative-energy logic', () => {
    expect(registry.require('emergency-battery')).toMatchObject({
      kind: 'logic',
      meta: { rarity: 'uncommon', energy: -15 },
    });
  });

  it('reduces the next projectile cost without changing its damage', () => {
    const base = registry.compile(['fork', 'pulse']).shots[0];
    const powered = registry.compile(['emergency-battery', 'fork', 'pulse']).shots[0];

    expect(powered).toMatchObject({ damage: base?.damage, count: base?.count });
    expect(powered?.energyCost).toBe((base?.energyCost ?? 0) - 15);
  });

  it('respects the one-energy minimum for inexpensive projectiles', () => {
    expect(registry.compile(['emergency-battery', 'pulse']).shots[0]?.energyCost).toBe(1);
  });
});
