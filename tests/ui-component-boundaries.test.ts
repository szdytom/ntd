import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const uiDirectory = resolve('src/ui');
const componentFiles = readdirSync(uiDirectory).filter((file) => file.endsWith('.tsx'));

describe('UI component boundaries', () => {
  it.each(componentFiles)('%s owns a same-named stylesheet', (file) => {
    const componentName = basename(file, '.tsx');
    const source = readFileSync(join(uiDirectory, file), 'utf8');
    expect(existsSync(join(uiDirectory, `${componentName}.css`))).toBe(true);
    expect(source).toContain(`import './${componentName}.css'`);
  });

  it.each(componentFiles)('%s declares no more than one component', (file) => {
    const source = readFileSync(join(uiDirectory, file), 'utf8');
    const componentDeclarations = source.match(/(?:export\s+)?function\s+[A-Z][A-Za-z0-9]*/g) ?? [];
    expect(componentDeclarations.length).toBeLessThanOrEqual(1);
  });
});
