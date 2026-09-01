import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const defaultLocaleDirectory = resolve('src/i18n/locales');

const moduleTextKey = /^modules\.[^.]+\.(description|detail)$/;
const placeholderPattern = /\{\{\s*([^},\s]+).*?\}\}/g;

const isRecord = (value) => (
  value !== null && !Array.isArray(value) && typeof value === 'object'
);

const placeholders = (value) => (
  [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort()
);

const displayPath = (path) => {
  const localPath = relative(process.cwd(), path);
  return localPath.startsWith('..') ? path : localPath;
};

export const readLocales = (localeDirectory = defaultLocaleDirectory) => {
  const directory = resolve(localeDirectory);
  const filenames = readdirSync(directory)
    .filter((filename) => filename.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));

  if (filenames.length === 0) {
    throw new Error(`${displayPath(directory)}: no locale JSON files found`);
  }

  return filenames.map((filename) => {
    const path = join(directory, filename);
    const source = readFileSync(path, 'utf8');
    try {
      return {
        filename,
        path,
        displayPath: displayPath(path),
        source,
        entries: JSON.parse(source),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${displayPath(path)}: invalid JSON (${reason})`, { cause: error });
    }
  });
};

export const findEnglishLocale = (locales) => {
  const english = locales.find(({ filename }) => filename === 'en.json');
  if (!english) throw new Error('Locale directory must contain en.json');
  return english;
};

export const canonicalLocaleSource = (entries, referenceKeys) => {
  const orderedEntries = Object.fromEntries(referenceKeys.map((key) => [key, entries[key]]));
  return `${JSON.stringify(orderedEntries, null, '\t')}\n`;
};

export const validateLocales = (locales, {
  requireAlignment = false,
  requireFormatting = false,
} = {}) => {
  const errors = [];
  const english = findEnglishLocale(locales);

  for (const locale of locales) {
    const { displayPath: path, entries } = locale;
    if (!isRecord(entries)) {
      errors.push(`${path}: the root must be an object`);
      continue;
    }

    if (typeof entries['lang.name'] !== 'string' || entries['lang.name'].trim() === '') {
      errors.push(`${path}: lang.name must describe this locale`);
    }

    for (const [key, value] of Object.entries(entries)) {
      const isEnglish = locale === english;
      if (typeof value !== 'string' && (isEnglish || value !== null)) {
        errors.push(`${path}: ${key} must map directly to ${isEnglish ? 'a string' : 'a string or null'}`);
        continue;
      }
      if (typeof value === 'string' && moduleTextKey.test(key)) {
        const literalText = value.replace(placeholderPattern, '');
        if (/\d/.test(literalText)) {
          errors.push(`${path}: ${key} must express numeric values through interpolation placeholders`);
        }
      }
    }
  }

  if (!isRecord(english.entries)) return errors;

  const referenceKeys = Object.keys(english.entries);
  const referenceKeySet = new Set(referenceKeys);
  for (const locale of locales) {
    if (!isRecord(locale.entries)) continue;

    for (const key of Object.keys(locale.entries)) {
      if (!referenceKeySet.has(key)) {
        errors.push(`${english.displayPath}: missing ${key} (found in ${locale.displayPath})`);
      }
    }

    if (locale === english) continue;

    if (requireAlignment) {
      for (const key of referenceKeys) {
        if (!Object.hasOwn(locale.entries, key)) errors.push(`${locale.displayPath}: missing ${key}`);
      }
    }

    for (const key of referenceKeys) {
      if (!moduleTextKey.test(key)) continue;
      const expected = english.entries[key];
      const actual = locale.entries[key];
      if (typeof expected !== 'string' || typeof actual !== 'string') continue;
      if (placeholders(expected).join('\0') !== placeholders(actual).join('\0')) {
        errors.push(`${locale.displayPath}: ${key} placeholders must match ${english.displayPath}`);
      }
    }
  }

  if (requireFormatting) {
    for (const locale of locales) {
      if (!isRecord(locale.entries)) continue;
      if (locale.source !== canonicalLocaleSource(locale.entries, referenceKeys)) {
        errors.push(`${locale.displayPath}: run npm run format:locales`);
      }
    }
  }

  return errors;
};

export const formatLocaleDirectory = (localeDirectory = defaultLocaleDirectory) => {
  const locales = readLocales(localeDirectory);
  const english = findEnglishLocale(locales);
  const errors = validateLocales(locales);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const referenceKeys = Object.keys(english.entries);
  let changedFiles = 0;

  for (const locale of locales) {
    const completedEntries = Object.fromEntries(referenceKeys.map((key) => [
      key,
      Object.hasOwn(locale.entries, key) ? locale.entries[key] : null,
    ]));
    const source = canonicalLocaleSource(completedEntries, referenceKeys);
    if (source === locale.source) continue;
    writeFileSync(locale.path, source);
    changedFiles += 1;
  }

  return { keyCount: referenceKeys.length, changedFiles };
};
