import type { SearchStrategy } from './search-engine';

const normalize = (value: string): string => value.normalize('NFKC').toLocaleLowerCase();

export const literalSearchStrategy: SearchStrategy = {
  matches(document, query) {
    const normalizedQuery = normalize(query);
    return document.fields.some((field) => normalize(field).includes(normalizedQuery));
  },
};
