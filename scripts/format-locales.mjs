import { resolve } from 'node:path';
import {
  defaultLocaleDirectory,
  formatLocaleDirectory,
} from './locale-utils.mjs';

const localeDirectory = resolve(process.argv[2] ?? defaultLocaleDirectory);

try {
  const { keyCount, changedFiles } = formatLocaleDirectory(localeDirectory);
  process.stdout.write(
    `Locale files are complete and formatted (${keyCount} keys, ${changedFiles} files changed).\n`,
  );
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Locale formatting failed:\n${reason}\n`);
  process.exitCode = 1;
}
