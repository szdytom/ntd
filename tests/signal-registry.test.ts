import { describe, expect, it } from 'vitest';
import { LEVELS, TUTORIAL_LEVEL_ID } from '@prism-bastion/game-core/game/config';
import en from '@prism-bastion/web-shared/i18n/locales/en.json';
import zhCN from '@prism-bastion/web-shared/i18n/locales/zh-CN.json';
import { SIGNAL_DEFINITIONS, SIGNAL_IDS, signalRegistry } from '@prism-bastion/game-core/signals';

describe('signal registry', () => {
  it('is the complete ordered source for IDs, variants, and localized archive text', () => {
    expect(new Set(SIGNAL_IDS).size).toBe(SIGNAL_IDS.length);
    expect(SIGNAL_IDS).toEqual(SIGNAL_DEFINITIONS.map((definition) => definition.id));
    expect(new Set(signalRegistry.variants()).size).toBe(signalRegistry.variants().length);

    for (const definition of SIGNAL_DEFINITIONS) {
      const keys = [
        definition.text.nameKey,
        definition.text.roleKey,
        definition.text.descriptionKey,
        definition.text.counterKey,
        definition.archive.ability.labelKey,
        definition.archive.ability.detailKey,
      ];
      for (const mode of definition.archive.demo?.modes ?? []) {
        keys.push(mode.actionKey, mode.restoreKey, mode.text.nameKey, mode.text.roleKey, mode.text.descriptionKey);
      }
      for (const key of keys) {
        expect(Object.hasOwn(en, key), `English locale: ${key}`).toBe(true);
        expect(Object.hasOwn(zhCN, key), `Chinese locale: ${key}`).toBe(true);
      }
    }
  });

  it('keeps every spectrum signal obtainable in a non-tutorial standard level', () => {
    const available = new Set(LEVELS
      .filter((level) => level.id !== TUTORIAL_LEVEL_ID)
      .flatMap((level) => level.waves.flat().map((entry) => entry.type)));
    expect(SIGNAL_IDS.filter((id) => !available.has(id))).toEqual([]);
  });
});
