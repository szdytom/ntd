import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const uiDirectories = [
  resolve('packages/web-shared/src/ui'),
  resolve('apps/web-single/src'),
  resolve('apps/web-coop/src'),
];
const componentFiles = uiDirectories.flatMap((directory) => (
  readdirSync(directory)
    .filter((file) => file.endsWith('.tsx') && file !== 'main.tsx' && file !== 'coop-feature.tsx')
    .map((file) => ({ directory, file }))
));

describe('UI component boundaries', () => {
  it.each(componentFiles)('$file owns a same-named stylesheet', ({ directory, file }) => {
    const componentName = basename(file, '.tsx');
    const source = readFileSync(join(directory, file), 'utf8');
    const globalStylesheet = existsSync(join(directory, `${componentName}.css`));
    const moduleStylesheet = existsSync(join(directory, `${componentName}.module.css`));
    expect(Number(globalStylesheet) + Number(moduleStylesheet)).toBe(1);
    expect(source).toContain(moduleStylesheet
      ? `import styles from './${componentName}.module.css'`
      : `import './${componentName}.css'`);
  });

  it.each(componentFiles)('$file declares no more than one component', ({ directory, file }) => {
    const source = readFileSync(join(directory, file), 'utf8');
    const componentDeclarations = source.match(/(?:export\s+)?function\s+[A-Z][A-Za-z0-9]*/g) ?? [];
    expect(componentDeclarations.length).toBeLessThanOrEqual(1);
  });
});
