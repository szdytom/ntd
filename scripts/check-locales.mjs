import { resolve } from 'node:path';
import {
  defaultLocaleDirectory,
  findEnglishLocale,
  readLocales,
  validateLocales,
} from './locale-utils.mjs';

const localeDirectory = resolve(process.argv[2] ?? defaultLocaleDirectory);

try {
  const locales = readLocales(localeDirectory);
  const english = findEnglishLocale(locales);
  const errors = validateLocales(locales, { requireAlignment: true, requireFormatting: true });

  if (errors.length > 0) {
    process.stderr.write(`Locale validation failed:\n${errors.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Locale files are flat, aligned, and formatted (${Object.keys(english.entries).length} keys).\n`,
    );
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Locale validation failed:\n${reason}\n`);
  process.exitCode = 1;
}
