import { describe, expect, it } from 'vitest';
import {
  calculateInventoryQuality,
  calculateModuleDraftWeights,
  calculateQualityCenter,
  rollModuleDraft,
  type DraftRollOptions,
} from '@prism-bastion/game-core/game/draft';
import { createSeededRandom } from '@prism-bastion/game-core/game/tower-generation';
import { DRAFT_BALANCE, createModuleRegistry } from '@prism-bastion/game-core/modules';
import type { ModuleId } from '@prism-bastion/game-core/game/types';

describe('module draft system', () => {
  const definitions = createModuleRegistry().list();
  const options = (overrides: Partial<DraftRollOptions> = {}): DraftRollOptions => ({
    definitions,
    ownedCount: () => 0,
    availableCount: () => 1,
    random: createSeededRandom(42),
    previousChoices: new Set(),
    qualityCenter: 2,
    projectileDeficit: 0,
    ...overrides,
  });
  const weightFor = (moduleId: ModuleId, overrides: Partial<DraftRollOptions> = {}) => {
    const row = calculateModuleDraftWeights(options(overrides)).find((candidate) => candidate.moduleId === moduleId);
    if (!row) throw new Error(`Expected draft weight for ${moduleId}`);
    return row;
  };

  it('calculates inventory quality from every owned copy and blends the configured center', () => {
    const counts: Partial<Record<ModuleId, number>> = { pulse: 3, arcbolt: 1 };
    expect(calculateInventoryQuality(definitions, (moduleId) => counts[moduleId] ?? 0)).toBe(2);
    expect(calculateInventoryQuality(definitions, () => 0)).toBe(1);
    expect(calculateQualityCenter({
      anchor: 4,
      inventoryAverage: 2,
      inventoryInfluence: 0.4,
      qualityBias: 0.2,
      boost: 1,
    })).toBeCloseTo(4);
    expect(calculateQualityCenter({
      anchor: 5,
      inventoryAverage: 5,
      inventoryInfluence: 0.4,
      qualityBias: 0,
      boost: 1,
    })).toBe(5);
  });

  it('returns four unique choices from one weighted module pool', () => {
    const result = rollModuleDraft(options());
    expect(result.choices).toHaveLength(DRAFT_BALANCE.choicesPerOffer);
    expect(new Set(result.choices).size).toBe(DRAFT_BALANCE.choicesPerOffer);
    expect(result.choiceWeights.map((candidate) => candidate.moduleId).sort()).toEqual([...result.choices].sort());

    const allProjectile = rollModuleDraft(options({ random: () => 0 })).choices;
    expect(allProjectile.every((id) => definitions.find((definition) => definition.id === id)?.kind === 'projectile')).toBe(true);
  });

  it('applies quality distance, recent-choice suppression, and ownership decay', () => {
    const centered = weightFor('frost', { qualityCenter: 1 });
    const distant = weightFor('frost', { qualityCenter: 5 });
    expect(centered.base).toBe(1);
    expect(distant.base).toBe(DRAFT_BALANCE.minimumBaseWeight);

    const recent = weightFor('frost', { previousChoices: new Set<ModuleId>(['frost']) });
    expect(recent.recent).toBe(DRAFT_BALANCE.recentChoiceMultiplier);
    expect(recent.multiplier).toBeCloseTo(DRAFT_BALANCE.recentChoiceMultiplier);

    const owned = weightFor('frost', { ownedCount: (id) => id === 'frost' ? 2 : 0 });
    expect(owned.ownership).toBeCloseTo(1 / (1 + 2 * DRAFT_BALANCE.ownershipSlope));
    expect(owned.multiplier).toBeCloseTo(1 / (1 + 2 * DRAFT_BALANCE.ownershipSlope));
  });

  it('applies the projectile and trail-carrier compatibility rules', () => {
    const unavailable = () => 0;
    const pulse = weightFor('pulse', {
      projectileDeficit: 1,
    });
    expect(pulse.projectileCompatibility).toBe(DRAFT_BALANCE.projectileShortageMultiplier);
    expect(pulse.multiplier).toBe(DRAFT_BALANCE.projectileShortageMultiplier);
    expect(weightFor('void-beam', {
      availableCount: unavailable,
      projectileDeficit: 1,
    }).multiplier).toBeCloseTo(
      DRAFT_BALANCE.projectileShortageMultiplier * DRAFT_BALANCE.noTrailCarrierMultiplier,
    );

    const voidBeam = weightFor('void-beam', {
      availableCount: (id) => id === 'resonant-trail' ? 1 : 0,
    });
    expect(voidBeam.trailCompatibility).toBe(DRAFT_BALANCE.dependencyImbalanceMultiplier);
    expect(voidBeam.multiplier).toBe(DRAFT_BALANCE.dependencyImbalanceMultiplier);
  });

  it('reserves one slot for a weighted guarantee', () => {
    const result = rollModuleDraft(options({
      guaranteedChoices: new Set<ModuleId>(['nova']),
    }));

    expect(result.choices).toContain('nova');
    expect(result.choices).toHaveLength(DRAFT_BALANCE.choicesPerOffer);
    expect(new Set(result.choices).size).toBe(DRAFT_BALANCE.choicesPerOffer);
  });

  it('balances idle static payloads and triggers in both directions', () => {
    const trigger = weightFor('impact-trigger', {
      availableCount: (id) => id === 'proximity-mine' ? 2 : 0,
    });
    expect(trigger.multiplier).toBe(DRAFT_BALANCE.dependencyImbalanceMultiplier);

    const payload = weightFor('proximity-mine', {
      availableCount: (id) => id === 'impact-trigger' ? 2 : 0,
    });
    expect(payload.multiplier).toBe(DRAFT_BALANCE.dependencyImbalanceMultiplier);

    const terrainOnly = weightFor('proximity-mine', {
      availableCount: (id) => id === 'terrain-trigger' ? 2 : 0,
    });
    expect(terrainOnly.multiplier).toBe(1);
  });
});
