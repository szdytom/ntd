import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { formatLocaleDirectory } from '../scripts/locale-utils.mjs';

const fixtureDirectories: string[] = [];

const createLocaleDirectory = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'prism-bastion-locales-'));
  fixtureDirectories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of fixtureDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('locale formatting script', () => {
  it('fills missing translations with null and follows English formatting and order', () => {
    const directory = createLocaleDirectory();
    writeFileSync(join(directory, 'en.json'), JSON.stringify({
      'lang.name': 'English',
      'example.second': 'Second',
      'example.first': 'First',
    }, null, 2));
    writeFileSync(join(directory, 'fr.json'), JSON.stringify({
      'example.first': 'Premier',
      'lang.name': 'Francais',
    }));

    const result = formatLocaleDirectory(directory);

    expect(result).toEqual({ keyCount: 3, changedFiles: 2 });
    expect(readFileSync(join(directory, 'en.json'), 'utf8')).toBe(
      '{\n\t"lang.name": "English",\n\t"example.second": "Second",\n\t"example.first": "First"\n}\n',
    );
    expect(readFileSync(join(directory, 'fr.json'), 'utf8')).toBe(
      '{\n\t"lang.name": "Francais",\n\t"example.second": null,\n\t"example.first": "Premier"\n}\n',
    );
    expect(formatLocaleDirectory(directory)).toEqual({ keyCount: 3, changedFiles: 0 });
  });

  it('does not write files when English is missing a key from another locale', () => {
    const directory = createLocaleDirectory();
    const englishSource = '{"lang.name":"English","example.known":"Known"}';
    const frenchSource = '{"lang.name":"Francais","example.untracked":"Non suivi"}';
    writeFileSync(join(directory, 'en.json'), englishSource);
    writeFileSync(join(directory, 'fr.json'), frenchSource);

    expect(() => formatLocaleDirectory(directory)).toThrow('en.json: missing example.untracked');
    expect(readFileSync(join(directory, 'en.json'), 'utf8')).toBe(englishSource);
    expect(readFileSync(join(directory, 'fr.json'), 'utf8')).toBe(frenchSource);
  });
});
