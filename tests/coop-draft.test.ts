import { describe, expect, it } from 'vitest';
import { createCoopDraftRuntime, generateCoopDraftOffers, resolveCoopDraftDecision } from '@prism-bastion/coop/draft';
import { createInitialCoopPlan } from '@prism-bastion/coop/planning';
import { COOP_MODULE_POOL, createCoopPool } from '@prism-bastion/coop/pool';
import { ORCHESTRATION_MODULE_IDS } from '@prism-bastion/game-core/game/orchestration-codec';

describe('co-op shared draft', () => {
  const plans = {
    p1: createInitialCoopPlan('white-prism', 'normal', 1),
    p2: createInitialCoopPlan('white-prism', 'normal', 2),
  };

  it('requires an explicit authored count for every module', () => {
    expect(Object.keys(COOP_MODULE_POOL).sort()).toEqual([...ORCHESTRATION_MODULE_IDS].sort());
    expect(COOP_MODULE_POOL['rift-trail']).toBe(1);
    expect(COOP_MODULE_POOL['impact-trigger']).toBe('unlimited');
  });

  it('does not overbook finite copies across simultaneous offers', () => {
    const pool = createCoopPool();
    const runtime = createCoopDraftRuntime(8, 3);
    const offers = generateCoopDraftOffers(runtime, ['p1', 'p2'], plans, pool, 'white-prism', 0);
    const appearances = [...(offers.p1?.choices ?? []), ...(offers.p2?.choices ?? [])];
    for (const moduleId of new Set(appearances)) {
      const count = appearances.filter((candidate) => candidate === moduleId).length;
      const available = pool[moduleId];
      if (available !== 'unlimited') expect(count).toBeLessThanOrEqual(available ?? 0);
    }
  });

  it('resolves both decisions before the next pick and preserves abandon boost state', () => {
    const pool = createCoopPool();
    const runtime = createCoopDraftRuntime(9, 2);
    const offers = generateCoopDraftOffers(runtime, ['p1', 'p2'], plans, pool, 'white-prism', 0);
    const firstChoice = offers.p1?.choices[0];
    expect(firstChoice).toBeTruthy();
    if (!offers.p1 || !offers.p2 || !firstChoice) return;
    expect(resolveCoopDraftDecision(runtime, 'p1', offers.p1, null, plans.p1, pool)).toEqual({ ok: true });
    expect(resolveCoopDraftDecision(runtime, 'p2', offers.p2, offers.p2.choices[0]!, plans.p2, pool)).toEqual({ ok: true });
    expect(runtime.players.p1.qualityBoostPending).toBe(true);
    expect(runtime.players.p2.qualityBoostPending).toBe(false);
    runtime.pick += 1;
    const next = generateCoopDraftOffers(runtime, ['p1', 'p2'], plans, pool, 'white-prism', 0);
    expect(next.p1?.boosted).toBe(true);
    expect(next.p2?.boosted).toBe(false);
  });

  it('allows authored unlimited foundations to appear in both offers', () => {
    const pool = Object.fromEntries(ORCHESTRATION_MODULE_IDS.map((moduleId) => [moduleId, 0]));
    pool['impact-trigger'] = 'unlimited';
    pool['timer-trigger'] = 'unlimited';
    pool['condense-core'] = 'unlimited';
    pool.pulse = 'unlimited';
    const runtime = createCoopDraftRuntime(13, 1);
    const offers = generateCoopDraftOffers(runtime, ['p1', 'p2'], plans, pool, 'white-prism', 0);
    expect(offers.p1?.choices).toHaveLength(4);
    expect(offers.p2?.choices).toHaveLength(4);
    expect(new Set(offers.p1?.choices)).toEqual(new Set(offers.p2?.choices));
  });
});
