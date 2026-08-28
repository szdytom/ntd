import { describe, expect, it } from 'vitest';
import { rollModuleDraft } from '../src/game/draft';
import { createSeededRandom } from '../src/game/tower-generation';
import { createModuleRegistry } from '../src/modules';

describe('module draft system', () => {
  const definitions = createModuleRegistry().list();

  it('returns a unique four-choice offer with the required category mix', () => {
    const result = rollModuleDraft({
      definitions,
      ownedCount: () => 0,
      random: createSeededRandom(42),
      previousChoices: new Set(),
      draftsWithoutRare: 0,
    });
    const selected = result.choices.map((id) => definitions.find((definition) => definition.id === id));

    expect(result.choices).toHaveLength(4);
    expect(new Set(result.choices).size).toBe(4);
    expect(selected.some((definition) => definition?.kind === 'projectile')).toBe(true);
    expect(selected.some((definition) => definition?.kind === 'modifier' || definition?.kind === 'trail')).toBe(true);
  });

  it('guarantees a rare or legendary choice after the dry-offer threshold', () => {
    const result = rollModuleDraft({
      definitions,
      ownedCount: () => 0,
      random: () => 0.99,
      previousChoices: new Set(),
      draftsWithoutRare: 2,
    });

    expect(result.choices.some((id) => {
      const rarity = definitions.find((definition) => definition.id === id)?.meta.rarity;
      return rarity === 'rare' || rarity === 'legendary';
    })).toBe(true);
  });
});
