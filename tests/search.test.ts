import { describe, expect, it, vi } from 'vitest';
import { literalSearchStrategy } from '@prism-bastion/web-shared/search/literal-search-strategy';
import { pinyinSearchStrategy } from '@prism-bastion/web-shared/search/pinyin-search-strategy';
import { createSearchEngine, type SearchStrategy } from '@prism-bastion/web-shared/search/search-engine';
import zhCN from '@prism-bastion/web-shared/i18n/locales/zh-CN.json';

const search = createSearchEngine([
  literalSearchStrategy,
  pinyinSearchStrategy,
]);

describe('search strategies', () => {
  it('matches literal text in every language', () => {
    const document = { fields: ['Pulse Round', 'A stable baseline projectile'] };
    expect(search.matches(document, 'PULSE', 'en')).toBe(true);
    expect(search.matches(document, 'baseline projectile', 'zh-CN')).toBe(true);
    expect(search.matches(document, 'trail', 'en')).toBe(false);
  });

  it('adds full and abbreviated pinyin matching for Chinese', () => {
    const document = { fields: [
      zhCN['modules.frost.name'],
      zhCN['modules.frost.description'],
    ] };
    expect(search.matches(document, 'lengningtoujing', 'zh-CN')).toBe(true);
    expect(search.matches(document, 'lntj', 'zh-CN')).toBe(true);
    expect(search.matches(document, 'jiansu', 'zh-CN')).toBe(true);
    expect(search.matches(document, 'lengningtoujing', 'en')).toBe(false);
  });

  it('selects added strategies through their declared language tags', () => {
    const matches = vi.fn(() => true);
    const extension: SearchStrategy = { languageTags: ['fr'], matches };
    const extendedSearch = createSearchEngine([literalSearchStrategy, extension]);
    const document = { fields: ['unrelated'] };

    expect(extendedSearch.matches(document, 'requete', 'en')).toBe(false);
    expect(matches).not.toHaveBeenCalled();
    expect(extendedSearch.matches(document, 'requete', 'fr-FR')).toBe(true);
    expect(matches).toHaveBeenCalledOnce();
  });
});
