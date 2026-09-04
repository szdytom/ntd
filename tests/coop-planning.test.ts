import { describe, expect, it } from 'vitest';
import { ECONOMY_BALANCE } from '../src/game/balance';
import { applyCoopPlanningCommand, createInitialCoopPlan, hashCoopPlan } from '../src/coop/planning';

describe('co-op planning model', () => {
  it('creates deterministic but seat-specific tower plans', () => {
    const first = createInitialCoopPlan('white-prism', 'normal', 11);
    const repeated = createInitialCoopPlan('white-prism', 'normal', 11);
    const peer = createInitialCoopPlan('white-prism', 'normal', 12);
    expect(first).toEqual(repeated);
    expect(hashCoopPlan(first)).toBe(hashCoopPlan(repeated));
    expect(peer.towers[0]).not.toEqual(first.towers[0]);
  });

  it('applies authoritative tower costs and inventory limits', () => {
    const initial = createInitialCoopPlan('white-prism', 'normal', 21);
    const built = applyCoopPlanningCommand(initial, { type: 'place-tower', padIndex: 1 }, 'white-prism', 21);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.plan.shards).toBe(initial.shards - ECONOMY_BALANCE.towerCost);
    expect(built.plan.towers).toHaveLength(2);

    const unavailable = applyCoopPlanningCommand(
      built.plan,
      { type: 'install-module', towerId: 2, slotIndex: 0, moduleId: 'frost' },
      'white-prism',
      21,
    );
    expect(unavailable.ok).toBe(true);
    if (!unavailable.ok) return;
    const exhausted = applyCoopPlanningCommand(
      unavailable.plan,
      { type: 'install-module', towerId: 2, slotIndex: 1, moduleId: 'frost' },
      'white-prism',
      21,
    );
    expect(exhausted.ok).toBe(false);
  });

  it('rejects invalid pads and overspending without mutating the input', () => {
    const initial = createInitialCoopPlan('white-prism', 'normal', 31);
    const before = structuredClone(initial);
    const invalid = applyCoopPlanningCommand(initial, { type: 'place-tower', padIndex: 999 }, 'white-prism', 31);
    expect(invalid).toEqual({ ok: false, reason: 'invalid-pad' });
    expect(initial).toEqual(before);
  });
});
