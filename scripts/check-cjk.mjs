import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const allowed = (path) => (
  path.startsWith('docs/')
  || path.startsWith('packages/web-shared/src/i18n/locales/')
  || /^README(?:\.[^.]+)?\.md$/.test(path)
);
const cjk = /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/u;
const ignoredDirectories = new Set(['.git', 'dist', 'dist-types', 'node_modules', 'test-results', 'playwright-report']);
const collectFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
  const absolutePath = join(directory, entry.name);
  if (entry.isDirectory()) return collectFiles(absolutePath);
  return [relative(process.cwd(), absolutePath)];
});
const files = collectFiles(process.cwd()).filter((path) => !allowed(path));
const violations = [];

for (const path of files) {
  const content = readFileSync(path);
  if (content.includes(0)) continue;
  content.toString('utf8').split('\n').forEach((line, index) => {
    if (cjk.test(line)) violations.push(`${path}:${index + 1}:${line.trim()}`);
  });
}

if (violations.length > 0) {
  process.stderr.write(`CJK characters found outside documentation and locale files:\n${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`CJK boundary verified across ${files.length} files.\n`);
}
