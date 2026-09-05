import { describe, expect, it } from 'vitest';
import { getSignalCapability, signalRegistry } from '@prism-bastion/game-core/signals';
import { absorbSignalShieldDamage, createSignalShield, isInsideRegularShield, updateSignalShield } from '@prism-bastion/game-core/signals/capabilities/shield';
import type { Signal } from '@prism-bastion/game-core/game/types';

const shieldConfig = getSignalCapability(signalRegistry.require('crown'), 'shield');
if (!shieldConfig) throw new Error('Expected shield capability');

function shieldSignal(): Signal {
  return {
    id: 1,
    type: 'crown',
    variantId: 'crown',
    progress: 0,
    distance: 0,
    position: { x: 0, y: 0 },
    angle: 0,
    hp: 100,
    maxHp: 100,
    speed: 0,
    reward: 0,
    coreDamage: 1,
    radius: 10,
    slowFactor: 0,
    slowTime: 0,
    hitFlash: 0,
    ...createSignalShield(shieldConfig, 1),
    statuses: [],
    dead: false,
  };
}

describe('signal shield', () => {
  it('absorbs damage before health and carries overflow', () => {
    const signal = shieldSignal();
    const firstHit = signal.maxShield * 0.4;
    const remainingShield = signal.maxShield - firstHit;
    const overflow = signal.maxShield * 0.25;

    expect(absorbSignalShieldDamage(signal, firstHit, shieldConfig)).toEqual({
      absorbed: firstHit,
      healthDamage: 0,
      broke: false,
    });
    expect(absorbSignalShieldDamage(signal, remainingShield + overflow, shieldConfig)).toEqual({
      absorbed: remainingShield,
      healthDamage: overflow,
      broke: true,
    });
    expect(signal.shield).toBe(-shieldConfig.cooldown * shieldConfig.regen);
  });

  it('restores only after regeneration debt has been repaid', () => {
    const signal = shieldSignal();
    absorbSignalShieldDamage(signal, signal.shield, shieldConfig);

    expect(updateSignalShield(signal, shieldConfig, shieldConfig.cooldown)).toBe(false);
    expect(updateSignalShield(signal, shieldConfig, 0.25)).toBe(true);
  });

  it('uses regular-polygon containment with projectile padding', () => {
    expect(isInsideRegularShield(0, 0, 0, 0, 72, 6, 0)).toBe(true);
    expect(isInsideRegularShield(0, 0, 90, 0, 72, 6, 0)).toBe(false);
    expect(isInsideRegularShield(0, 0, 75, 0, 72, 6, 0, 4)).toBe(true);
  });
});
