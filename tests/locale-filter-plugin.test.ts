import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filterLocaleObject } from '../build/locale-filter-plugin.mjs';

describe('single-player locale filtering', () => {
  it('removes every co-op key while preserving values and Unicode text', () => {
    const chinese = String.fromCodePoint(0x4e2d, 0x6587);
    const closedRoom = String.fromCodePoint(0x623f, 0x95f4, 0x5df2, 0x5173, 0x95ed);
    const locale = {
      'home.title': 'Prism Bastion',
      'coop.title': 'Parallel defense',
      'settings.language.zh-CN': chinese,
      'coop.error.closed': closedRoom,
    };

    expect(filterLocaleObject(locale)).toEqual({
      'home.title': 'Prism Bastion',
      'settings.language.zh-CN': chinese,
    });
    expect(locale).toHaveProperty('coop.title');
  });

  it('does not modify the shared source locale', () => {
    const path = 'packages/web-shared/src/i18n/locales/en.json';
    const before = readFileSync(path, 'utf8');
    const parsed = JSON.parse(before) as Record<string, string>;

    filterLocaleObject(parsed);

    expect(readFileSync(path, 'utf8')).toBe(before);
    expect(Object.keys(parsed).some((key) => key.startsWith('coop.'))).toBe(true);
  });
});
