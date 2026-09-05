import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs']);
const filesBelow = (directory) => readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? filesBelow(path) : sourceExtensions.has(extname(entry.name)) ? [path] : [];
});
const violations = [];
const inspect = (directories, rules) => {
  for (const directory of directories) {
    for (const path of filesBelow(directory)) {
      const source = readFileSync(join(root, path), 'utf8');
      for (const { pattern, message } of rules) {
        if (pattern.test(source)) violations.push(`${relative(root, join(root, path))}: ${message}`);
      }
    }
  }
};

inspect(['packages/game-core/src'], [
  { pattern: /(?:from|import\s*)\s*['"](?:react|react-dom|react-i18next|i18next|ws|@prism-bastion\/coop)/, message: 'deterministic core imports a browser, i18n, WebSocket, or co-op dependency' },
  { pattern: /\b(?:CanvasRenderingContext2D|HTMLCanvasElement|EffectEngine)\b/, message: 'deterministic core exposes a browser presentation type' },
  { pattern: /\b(?:displayColor|tint)\b/, message: 'deterministic core contains browser presentation metadata' },
  { pattern: /\bmode\s*===?\s*['"]coop['"]|\btype\s+GameMode\s*=.*coop/, message: 'deterministic core contains a co-op mode branch' },
]);
inspect(['packages/web-shared/src', 'apps/web-single/src'], [
  { pattern: /(?:from|import\s*)\s*['"]@prism-bastion\/(?:coop|web-coop)(?:\/|['"])/, message: 'single/shared browser code imports the co-op implementation' },
  { pattern: /(?:\bt|\bi18n\.t)\(\s*['"]coop\./, message: 'single/shared browser code references co-op copy' },
]);
inspect(['packages/web-shared/src/module-presentations'], [
  { pattern: /\b(?:compile|targetEffect|onCast|onHit|onTrail|onDeploy|onTrigger)\s*:/, message: 'module presentation contains a runtime compiler or combat hook' },
]);
inspect(['apps/coop-server/src'], [
  { pattern: /(?:from|import\s*)\s*['"](?:react|react-dom|react-i18next|i18next|@prism-bastion\/web-)/, message: 'server imports browser runtime code' },
  { pattern: /import\s+['"].*\.(?:css|scss)['"]/, message: 'server imports styles' },
]);
for (const path of filesBelow('apps/web-coop/src')) {
  const source = readFileSync(join(root, path), 'utf8');
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
    const key = match[1];
    if (key && !/^(?:coop\.|levels\.|difficulties\.|modules\.|reward\.|thoughtIndex\.)/.test(key)) {
      violations.push(`${path}: co-op-specific copy must use the coop. locale prefix (${key})`);
    }
  }
}

const coreTsconfig = JSON.parse(readFileSync(join(root, 'packages/game-core/tsconfig.json'), 'utf8'));
if (JSON.stringify(coreTsconfig.compilerOptions?.lib) !== JSON.stringify(['ES2022'])) {
  violations.push('packages/game-core/tsconfig.json: core lib must be exactly ES2022');
}
const singleManifest = JSON.parse(readFileSync(join(root, 'apps/web-single/package.json'), 'utf8'));
for (const dependency of Object.keys(singleManifest.dependencies ?? {})) {
  if (dependency === '@prism-bastion/coop' || dependency === '@prism-bastion/web-coop' || dependency === 'ws' || dependency === 'zod') {
    violations.push(`apps/web-single/package.json: forbidden dependency ${dependency}`);
  }
}

if (violations.length > 0) {
  process.stderr.write(`Workspace boundary validation failed:\n${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Workspace runtime and feature boundaries verified.\n');
}
