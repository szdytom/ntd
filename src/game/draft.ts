import { DRAFT_BALANCE, MODULE_RARITIES } from '../modules/rarity';
import type { ModuleDefinition } from '../modules/types';
import type { ModuleId } from './types';

export interface DraftRollOptions {
  definitions: readonly ModuleDefinition[];
  ownedCount(moduleId: ModuleId): number;
  availableCount(moduleId: ModuleId): number;
  random(): number;
  previousChoices: ReadonlySet<ModuleId>;
  qualityCenter: number;
  projectileDeficit: number;
  guaranteedChoices?: ReadonlySet<ModuleId>;
}

export interface DraftWeight {
  moduleId: ModuleId;
  quality: number;
  base: number;
  multiplier: number;
  weight: number;
}

export interface DraftRollResult {
  choices: ModuleId[];
  previousChoices: Set<ModuleId>;
}

export interface QualityCenterOptions {
  anchor: number;
  inventoryAverage: number;
  inventoryInfluence: number;
  qualityBias: number;
  boost?: number;
}

const clampQuality = (quality: number): number => Math.max(1, Math.min(5, quality));

export function calculateInventoryQuality(
  definitions: readonly ModuleDefinition[],
  ownedCount: (moduleId: ModuleId) => number,
): number {
  let copies = 0;
  let points = 0;
  for (const definition of definitions) {
    const count = Math.max(0, ownedCount(definition.id));
    copies += count;
    points += count * MODULE_RARITIES[definition.meta.rarity].qualityPoints;
  }
  return copies > 0 ? points / copies : 1;
}

export function calculateQualityCenter(options: QualityCenterOptions): number {
  const influence = Math.max(0, Math.min(1, options.inventoryInfluence));
  return clampQuality(
    (1 - influence) * options.anchor
    + influence * options.inventoryAverage
    - options.qualityBias
    + (options.boost ?? 0),
  );
}

export function calculateModuleDraftWeights(options: DraftRollOptions): DraftWeight[] {
  const availableFor = (predicate: (definition: ModuleDefinition) => boolean): number => (
    options.definitions.reduce((sum, definition) => (
      predicate(definition) ? sum + Math.max(0, options.availableCount(definition.id)) : sum
    ), 0)
  );
  const availableTrails = availableFor((definition) => definition.kind === 'trail');
  const availableStatics = availableFor((definition) => definition.kind === 'static');
  const availableTriggers = availableFor((definition) => definition.tags.includes('reliable-trigger'));
  const availableTrailCarriers = availableFor((definition) => definition.tags.includes('trail-carrier'));
  const needsProjectile = options.projectileDeficit > 0;

  return options.definitions.map((definition) => {
    const quality = MODULE_RARITIES[definition.meta.rarity].qualityPoints;
    const distance = quality - clampQuality(options.qualityCenter);
    const base = Math.max(
      DRAFT_BALANCE.minimumBaseWeight,
      1 - Math.tanh(DRAFT_BALANCE.qualitySharpness * distance * distance),
    );
    const recent = options.previousChoices.has(definition.id)
      ? DRAFT_BALANCE.recentChoiceMultiplier
      : 1;
    const ownership = 1 / (
      1 + Math.max(0, options.ownedCount(definition.id)) * DRAFT_BALANCE.ownershipSlope
    );
    let multiplier = recent * ownership;

    if (definition.tags.includes('trail-carrier')) {
      if (availableTrails === 0) multiplier *= DRAFT_BALANCE.noTrailCarrierMultiplier;
      else if (availableTrailCarriers === 0) multiplier *= DRAFT_BALANCE.dependencyImbalanceMultiplier;
    }
    if (needsProjectile && definition.kind === 'projectile') {
      multiplier *= DRAFT_BALANCE.projectileShortageMultiplier;
    }
    if (availableStatics > availableTriggers && definition.tags.includes('trigger')) {
      multiplier *= DRAFT_BALANCE.dependencyImbalanceMultiplier;
    }
    if (availableTriggers > availableStatics && definition.kind === 'static') {
      multiplier *= DRAFT_BALANCE.dependencyImbalanceMultiplier;
    }

    return { moduleId: definition.id, quality, base, multiplier, weight: base * multiplier };
  });
}

export function rollModuleDraft(options: DraftRollOptions): DraftRollResult {
  const candidates = calculateModuleDraftWeights(options);
  const choices: ModuleId[] = [];

  const takeWeightedCandidate = (eligible: readonly DraftWeight[]): ModuleId | null => {
    if (eligible.length === 0) return null;
    let roll = options.random() * eligible.reduce((sum, candidate) => sum + candidate.weight, 0);
    let selected = eligible[eligible.length - 1];
    for (const candidate of eligible) {
      roll -= candidate.weight;
      if (roll <= 0) {
        selected = candidate;
        break;
      }
    }
    if (!selected) return null;
    const selectedIndex = candidates.indexOf(selected);
    if (selectedIndex >= 0) candidates.splice(selectedIndex, 1);
    return selected.moduleId;
  };

  if (options.guaranteedChoices && options.guaranteedChoices.size > 0) {
    const guaranteed = candidates.filter((candidate) => options.guaranteedChoices?.has(candidate.moduleId));
    const selected = takeWeightedCandidate(guaranteed);
    if (selected) choices.push(selected);
  }

  while (choices.length < DRAFT_BALANCE.choicesPerOffer && candidates.length > 0) {
    const selected = takeWeightedCandidate(candidates);
    if (selected) choices.push(selected);
  }

  return { choices, previousChoices: new Set(choices) };
}
