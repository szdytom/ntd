import { describe, expect, it } from 'vitest';
import en from '../src/i18n/locales/en.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import { createModuleRegistry } from '../src/modules';

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
          expect(placeholderNames(locale[key]), `${key} in localized text`).toEqual(suppliedValues);
        }
      }
    }
  });
});
