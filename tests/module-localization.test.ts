import { describe, expect, it } from 'vitest';
import i18n from '@prism-bastion/web-shared/i18n';
import en from '@prism-bastion/web-shared/i18n/locales/en.json';
import zhCN from '@prism-bastion/web-shared/i18n/locales/zh-CN.json';
import { formatDisplayNumber, moduleDetail } from '@prism-bastion/web-shared/i18n/presentation';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';

const placeholderPattern = /\{\{\s*([^},\s]+).*?\}\}/g;

const placeholderNames = (template: string): string[] => (
  [...template.matchAll(placeholderPattern)].map((match) => match[1]).sort()
);

describe('module localization values', () => {
  const registry = createModuleRegistry();
  const locales = [en, zhCN] as const;

  it('keeps concrete numbers out of localized descriptions and details', () => {
    for (const locale of locales) {
      for (const [key, template] of Object.entries(locale)) {
        if (!/^modules\.[^.]+\.(description|detail)$/.test(key)) continue;
        if (template === null) continue;
        expect(template.replace(placeholderPattern, ''), key).not.toMatch(/\d/);
      }
    }
  });

  it('backs every localized placeholder with its module definition', () => {
    for (const definition of registry.list()) {
      for (const field of ['description', 'detail'] as const) {
        const key = `modules.${definition.id}.${field}` as keyof typeof en;
        const suppliedValues = Object.keys(definition.meta.text?.[field] ?? {}).sort();

        for (const locale of locales) {
          const template = locale[key];
          if (template === null) continue;
          expect(placeholderNames(template), `${key} in localized text`).toEqual(suppliedValues);
        }
      }
    }
  });

  it.each([
    [2.8 / 0.4, 7],
    [0.1 + 0.2, 0.3],
    [1 / 3, 0.333],
    [-Number.EPSILON, 0],
  ])('formats display number %s without floating-point noise', (value, expected) => {
    expect(formatDisplayNumber(value)).toBe(expected);
  });

  it('formats computed values before interpolating module details', () => {
    const definition = registry.require('starfire-matrix');

    expect(moduleDetail(i18n.t, definition)).toContain('7×8 starfire damage');
    expect(moduleDetail(i18n.t, definition)).not.toContain('6.999999999999999');
  });

  it('describes Resonant Trail cadence in seconds instead of engine ticks', () => {
    const detail = moduleDetail(i18n.t, registry.require('resonant-trail'));

    expect(detail).toContain('Pulses every 0.26 seconds');
    expect(detail).not.toContain('trail ticks');
  });

  it('falls back to English when a translated value is null', async () => {
    const key = 'test.nullFallback';
    i18n.addResources('en', 'translation', { [key]: 'English fallback' });
    i18n.addResources('zh-CN', 'translation', { [key]: null });

    try {
      await i18n.changeLanguage('zh-CN');
      expect(i18n.t(key)).toBe('English fallback');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
