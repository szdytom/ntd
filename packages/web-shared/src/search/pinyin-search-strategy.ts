import { match } from 'pinyin-pro';
import type { SearchStrategy } from './search-engine';

export const pinyinSearchStrategy: SearchStrategy = {
  languageTags: ['zh'],
  matches(document, query) {
    return document.fields.some((field) => match(field, query, {
      continuous: true,
      insensitive: true,
      space: 'ignore',
    }) !== null);
  },
};
