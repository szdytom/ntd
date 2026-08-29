import { readFileSync } from 'node:fs';

const localePaths = ['src/i18n/locales/en.json', 'src/i18n/locales/zh-CN.json'];
const locales = localePaths.map((path) => ({
  path,
  entries: JSON.parse(readFileSync(path, 'utf8')),
}));
const errors = [];

for (const { path, entries } of locales) {
  if (!entries || Array.isArray(entries) || typeof entries !== 'object') {
    errors.push(`${path}: the root must be an object`);
    continue;
  }
  if (typeof entries['lang.name'] !== 'string' || entries['lang.name'].trim() === '') {
    errors.push(`${path}: lang.name must describe this locale`);
  }
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== 'string') errors.push(`${path}: ${key} must map directly to a string`);
  }
}

const [reference, ...translations] = locales;
if (reference) {
  const referenceKeys = new Set(Object.keys(reference.entries));
  for (const translation of translations) {
    const translationKeys = new Set(Object.keys(translation.entries));
    for (const key of referenceKeys) {
      if (!translationKeys.has(key)) errors.push(`${translation.path}: missing ${key}`);
    }
    for (const key of translationKeys) {
      if (!referenceKeys.has(key)) errors.push(`${translation.path}: unexpected ${key}`);
    }
  }
}

if (errors.length > 0) {
  process.stderr.write(`Locale validation failed:\n${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Locale files are flat and aligned (${Object.keys(reference?.entries ?? {}).length} keys).\n`);
}
