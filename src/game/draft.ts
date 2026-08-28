import { DRAFT_BALANCE, MODULE_RARITIES } from '../modules/rarity';
import type { ModuleDefinition } from '../modules/types';
import type { ModuleId } from './types';

export interface DraftRollOptions {
  definitions: readonly ModuleDefinition[];
  ownedCount(moduleId: ModuleId): number;
  random(): number;
  previousChoices: ReadonlySet<ModuleId>;
  draftsWithoutRare: number;
}

export interface DraftRollResult {
  choices: ModuleId[];
  previousChoices: Set<ModuleId>;
  draftsWithoutRare: number;
}

export function rollModuleDraft(options: DraftRollOptions): DraftRollResult {
  const { definitions, ownedCount, random, previousChoices } = options;
  const projectilePool = definitions.filter((definition) => definition.kind === 'projectile');
  const modifierPool = definitions.filter((definition) => definition.kind === 'modifier' || definition.kind === 'trail');
  const utilityPool = definitions.filter((definition) => definition.kind === 'logic' || definition.kind === 'static');
  const selected: ModuleId[] = [];

  const pick = (pool: readonly ModuleDefinition[]): boolean => {
    const candidates = pool.filter((definition) => !selected.includes(definition.id));
    if (candidates.length === 0) return false;
    const weights = candidates.map((definition) => {
      const novelty = previousChoices.has(definition.id) ? 0.22 : 1;
      const ownership = 1 / (1 + ownedCount(definition.id) * 0.45);
      return novelty * ownership * MODULE_RARITIES[definition.meta.rarity].draftWeight;
    });
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let choice = candidates.at(-1);
    if (!choice) return false;
    for (let index = 0; index < candidates.length; index += 1) {
      roll -= weights[index] ?? 0;
      if (roll <= 0) {
        choice = candidates[index] ?? choice;
        break;
      }
    }
    selected.push(choice.id);
    return true;
  };

  const projectileCount = 1 + (random() < 0.5 ? 1 : 0);
  const modifierCount = 1 + (random() < 0.5 ? 1 : 0);
  for (let index = 0; index < projectileCount; index += 1) pick(projectilePool);
  for (let index = 0; index < modifierCount; index += 1) pick(modifierPool);
  while (selected.length < DRAFT_BALANCE.choicesPerOffer && pick(utilityPool)) {
    // Fill remaining slots with unique utility modules.
  }

  const highRarity = (moduleId: ModuleId): boolean => {
    const rarity = definitions.find((definition) => definition.id === moduleId)?.meta.rarity;
    return rarity === 'rare' || rarity === 'legendary';
  };
  if (!selected.some(highRarity) && options.draftsWithoutRare >= DRAFT_BALANCE.dryOffersBeforePity) {
    const replaceIndex = selected.length - 1;
    const replacedId = selected[replaceIndex];
    const replaced = definitions.find((definition) => definition.id === replacedId);
    if (replaced) {
      const sameDraftGroup = (definition: ModuleDefinition): boolean => {
        if (replaced.kind === 'projectile') return definition.kind === 'projectile';
        if (replaced.kind === 'modifier' || replaced.kind === 'trail') {
          return definition.kind === 'modifier' || definition.kind === 'trail';
        }
        return definition.kind === 'logic' || definition.kind === 'static';
      };
      const pityPool = definitions.filter(
        (definition) => sameDraftGroup(definition) && highRarity(definition.id) && !selected.includes(definition.id),
      );
      const pityChoice = pityPool[Math.floor(random() * pityPool.length)];
      if (pityChoice) selected[replaceIndex] = pityChoice.id;
    }
  }

  return {
    choices: selected,
    previousChoices: new Set(selected),
    draftsWithoutRare: selected.some(highRarity) ? 0 : options.draftsWithoutRare + 1,
  };
}
