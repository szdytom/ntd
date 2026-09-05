import { readFile } from 'node:fs/promises';

export const COOP_LOCALE_PREFIX = 'coop.';

export function filterLocaleObject(entries) {
  return Object.fromEntries(Object.entries(entries).filter(([key]) => !key.startsWith(COOP_LOCALE_PREFIX)));
}

export const localeFilterPlugin = {
  name: 'prism-locale-filter',
  setup(build) {
    build.onLoad({ filter: /[\\/]i18n[\\/]locales[\\/][^\\/]+\.json$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const entries = JSON.parse(source);
      const filtered = filterLocaleObject(entries);
      if (Object.keys(filtered).some((key) => key.startsWith(COOP_LOCALE_PREFIX))) {
        throw new Error(`Locale filtering failed for ${path}`);
      }
      return { contents: JSON.stringify(filtered), loader: 'json' };
    });
  },
};
