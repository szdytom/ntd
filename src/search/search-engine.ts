export interface SearchDocument {
  readonly fields: readonly string[];
}

export interface SearchStrategy {
  /** Omit to enable the strategy for every locale. */
  readonly languageTags?: readonly string[];
  matches(document: SearchDocument, query: string): boolean;
}

const baseLanguage = (languageTag: string): string => languageTag.split('-')[0]?.toLocaleLowerCase() ?? '';

const supportsLanguage = (strategy: SearchStrategy, languageTag: string): boolean => (
  strategy.languageTags === undefined
  || strategy.languageTags.some((supported) => baseLanguage(supported) === baseLanguage(languageTag))
);

export interface SearchEngine {
  matches(document: SearchDocument, query: string, languageTag: string): boolean;
}

export const createSearchEngine = (strategies: readonly SearchStrategy[]): SearchEngine => ({
  matches(document, query, languageTag) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return true;
    return strategies
      .filter((strategy) => supportsLanguage(strategy, languageTag))
      .some((strategy) => strategy.matches(document, normalizedQuery));
  },
});
