import type { TFunction } from 'i18next';
import { moduleShortName } from '../i18n/presentation';
import { literalSearchStrategy } from '../search/literal-search-strategy';
import { pinyinSearchStrategy } from '../search/pinyin-search-strategy';
import { createSearchEngine } from '../search/search-engine';
import type { ThoughtDefinition } from './types';

const thoughtSearchEngine = createSearchEngine([
  literalSearchStrategy,
  pinyinSearchStrategy,
]);

export const matchesThoughtSearch = (
  definition: ThoughtDefinition,
  query: string,
  languageTag: string,
  t: TFunction,
): boolean => thoughtSearchEngine.matches({
  fields: [
    t(definition.titleKey),
    moduleShortName(t, definition.subject.moduleId),
    t(definition.summaryKey),
  ],
}, query, languageTag);
