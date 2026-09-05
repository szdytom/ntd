import { describe, expect, it } from 'vitest';
import { createInitialCoopPlan, hashCoopPlan } from '@prism-bastion/coop/planning';
import type { CoopCombatResult, CoopLeakedSignal } from '@prism-bastion/coop/types';
import { CoopGameController } from '@prism-bastion/coop/controller';
import { combatResultsMatch } from '@prism-bastion/coop/results';
import { simulateAuthoritativeCombat } from '@prism-bastion/coop/simulation';
import type { CombatVerificationRequest } from '@prism-bastion/coop/simulation';

const noFireRequest = (): CombatVerificationRequest => {
  const plan = createInitialCoopPlan('triune-delta', 'extreme', 42);
  plan.towers[0]?.slots.fill(null);
  return {
    levelId: 'triune-delta',
    difficultyId: 'extreme',
    phaseId: 7,
    kind: 'local-defense',
    wave: 8,
    planHash: hashCoopPlan(plan),
    plan,
    signals: [],
  };
};

describe('authoritative co-op combat simulation', () => {
  it('replays a phase deterministically without a browser', () => {
    const request = noFireRequest();

    const first = simulateAuthoritativeCombat(request);
    const second = simulateAuthoritativeCombat(request);

    expect(first).toEqual(second);
    expect(first.phaseId).toBe(request.phaseId);
    expect(first.planHash).toBe(request.planHash);
    expect(first.shardsEarned).toBe(0);
    expect(first.leaks).toHaveLength(60);
  });

  it('rejects omitted leaks and forged rewards', () => {
    const expected = simulateAuthoritativeCombat(noFireRequest());

    expect(combatResultsMatch(expected, { ...expected, leaks: [] })).toBe(false);
    expect(combatResultsMatch(expected, { ...expected, shardsEarned: 1_000_000 })).toBe(false);
    expect(combatResultsMatch(expected, structuredClone(expected))).toBe(true);
  });

  it('restores post-local tower state before validating reinforcement', () => {
    const plan = createInitialCoopPlan('starter-elbow', 'normal', 42);
    const localPlanHash = hashCoopPlan(plan);
    const controller = new CoopGameController({ levelId: 'starter-elbow', difficultyId: 'normal', seed: 0 });
    const clientEngine = controller.engine;
    controller.applyPlan(plan);
    const results = new Map<number, CoopCombatResult>();
    clientEngine.subscribe((event) => {
      if (event.type !== 'combat-phase-completed') return;
      const result = event.result;
      results.set(result.phaseId, {
        phaseId: result.phaseId,
        planHash: result.planHash,
        shardsEarned: result.shardsEarned,
        leaks: result.leaks.map((leak) => ({ ...leak })),
      });
    });
    controller.startCombat({
      phaseId: 1,
      planHash: localPlanHash,
      wave: 1,
      kind: 'local-defense',
    });
    expect(controller.fastForward()).toBe(true);
    const localResult = results.get(1);
    expect(localResult).toBeDefined();
    if (!localResult) return;

    const postLocalPlan = structuredClone(plan);
    postLocalPlan.shards += localResult.shardsEarned;
    const reinforcementPlanHash = hashCoopPlan(postLocalPlan);
    const signals: CoopLeakedSignal[] = [{ ordinal: 0, type: 'spark', entrance: 'starter-elbow:0' }];
    controller.startCombat({
      phaseId: 2,
      planHash: reinforcementPlanHash,
      wave: 1,
      kind: 'reinforcement',
      signals,
    });
    expect(controller.fastForward()).toBe(true);
    const clientResult = results.get(2);
    expect(clientResult).toBeDefined();
    if (!clientResult) return;

    const serverResult = simulateAuthoritativeCombat({
      levelId: 'starter-elbow',
      difficultyId: 'normal',
      phaseId: 2,
      kind: 'reinforcement',
      wave: 1,
      planHash: reinforcementPlanHash,
      plan: postLocalPlan,
      signals,
    });
    expect(serverResult).toEqual(clientResult);
  });
});
