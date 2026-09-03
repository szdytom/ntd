import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from '../src/modules';
import {
  MINIMUM_MODULE_UI_CONTRAST,
  contrastAgainstWhite,
  moduleUiColor,
} from '../src/ui/modulePresentation';

describe('module UI colors', () => {
  it('gives every module theme at least 3:1 contrast against white', () => {
    for (const module of createModuleRegistry().list()) {
      expect(
        contrastAgainstWhite(moduleUiColor(module)),
        `${module.id} (${moduleUiColor(module)})`,
      ).toBeGreaterThanOrEqual(MINIMUM_MODULE_UI_CONTRAST);
    }
  });

  it('does not mutate the colors used by combat rendering', () => {
    const modules = createModuleRegistry();
    expect(modules.require('timer-trigger').meta.color).toBe('#fee440');
    expect(modules.require('void-beam').meta.color).toBe('#98ffa9');
    expect(modules.require('timer-trigger').meta.displayColor).toBe('#a7952a');
    expect(modules.require('void-beam').meta.displayColor).toBe('#61a36c');
  });

  it('stores adjusted and original display colors explicitly', () => {
    const modules = createModuleRegistry().list();
    expect(modules.filter((module) => module.meta.displayColor === module.meta.color)).toHaveLength(23);
    expect(modules.filter((module) => module.meta.displayColor !== module.meta.color)).toHaveLength(17);
  });
});
