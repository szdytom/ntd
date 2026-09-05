// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@prism-bastion/web-shared/i18n';
import zhCN from '@prism-bastion/web-shared/i18n/locales/zh-CN.json';
import { App, TUTORIAL_OFFER_STORAGE_KEY } from '@prism-bastion/web-single/App';
import { LEVEL_SELECTION_STORAGE_KEY } from '@prism-bastion/web-single/LevelSelect';
import { AUTO_PAUSE_STORAGE_KEY } from '@prism-bastion/web-shared/ui/preferences';

beforeEach(() => {
  try {
    globalThis.localStorage?.removeItem(TUTORIAL_OFFER_STORAGE_KEY);
    globalThis.localStorage?.removeItem(LEVEL_SELECTION_STORAGE_KEY);
    globalThis.localStorage?.removeItem(AUTO_PAUSE_STORAGE_KEY);
  } catch {
    // localStorage is unavailable when jsdom uses an opaque origin.
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  void i18n.changeLanguage('en');
});

describe('level selection accessibility', () => {
  it('remembers the last selected mode, difficulty, and level', async () => {
    const storedValues = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));

    await user.click(within(screen.getByRole('group', { name: 'Game mode' })).getByRole('button', { name: /Creative/ }));
    const difficultyGroup = screen.getByRole('radiogroup', { name: 'Choose difficulty' });
    await user.click(difficultyGroup.querySelectorAll('[role="radio"]')[3] as HTMLElement);
    await user.click(screen.getByRole('radio', { name: /Rose Circuit/ }));

    expect(JSON.parse(globalThis.localStorage.getItem(LEVEL_SELECTION_STORAGE_KEY) ?? '{}')).toEqual({
      levelId: 'rose-circuit',
      mode: 'creative',
      difficultyId: 'hard',
    });

    cleanup();
    render(<App />);
    expect(within(screen.getByRole('group', { name: 'Game mode' })).getByRole('button', { name: /Creative/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('radiogroup', { name: 'Choose difficulty' }).querySelector('[aria-checked="true"]')?.textContent).toContain('Hard');
    const restoredLevelCards = screen.getByRole('radiogroup', { name: 'Choose defense sector' }).querySelectorAll('[role="radio"]');
    expect(restoredLevelCards[1]?.getAttribute('aria-checked')).toBe('true');
    expect(restoredLevelCards[1]?.textContent).toContain('Rose Circuit');
  });

  it('exposes mode state and supports arrow-key radio selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));

    const modeGroup = screen.getByRole('group', { name: 'Game mode' });
    const standardMode = within(modeGroup).getByRole('button', { name: /Standard/ });
    const creativeMode = within(modeGroup).getByRole('button', { name: /Creative/ });
    expect(standardMode.getAttribute('aria-pressed')).toBe('true');
    await user.click(creativeMode);
    expect(creativeMode.getAttribute('aria-pressed')).toBe('true');

    const difficultyGroup = screen.getByRole('radiogroup', { name: 'Choose difficulty' });
    const selectedDifficulty = difficultyGroup.querySelector<HTMLElement>('[aria-checked="true"]');
    expect(selectedDifficulty?.textContent).toContain('Standard');
    selectedDifficulty?.focus();
    await user.keyboard('{ArrowRight}');
    expect(difficultyGroup.querySelector('[aria-checked="true"]')?.textContent).toContain('Hard');

    const levelGroup = screen.getByRole('radiogroup', { name: 'Choose defense sector' });
    const selectedLevel = levelGroup.querySelector<HTMLElement>('[aria-checked="true"]');
    expect(selectedLevel?.textContent).toContain('White Prism');
    selectedLevel?.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radiogroup', { name: 'Choose defense sector' }).querySelector('[aria-checked="true"]')?.textContent).toContain('Rose Circuit');
  });

  it('shows three level cards at a time and pages with arrow controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));

    let group = screen.getByRole('radiogroup', { name: 'Choose defense sector' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
    expect(group.textContent).toContain('Launch Elbow');
    expect(group.textContent).not.toContain('Verdant Fold');

    await user.click(screen.getByRole('button', { name: 'Show next levels' }));
    group = screen.getByRole('radiogroup', { name: 'Choose defense sector' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
    expect(group.classList.contains('slide-next')).toBe(true);
    expect(group.textContent).not.toContain('Launch Elbow');
    expect(group.textContent).toContain('Verdant Fold');
  });

  it('shows one selected level card at a time at 949px wide', async () => {
    const viewportWidth = 949;
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(max-width: 980px)' && viewportWidth <= 980,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    } satisfies MediaQueryList)));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));

    let group = screen.getByRole('radiogroup', { name: 'Choose defense sector' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(1);
    expect(group.textContent).toContain('White Prism');

    await user.click(screen.getByRole('button', { name: 'Show next levels' }));
    group = screen.getByRole('radiogroup', { name: 'Choose defense sector' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(1);
    expect(group.textContent).toContain('Rose Circuit');
  });

  it('switches the complete interface language and updates the document locale', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: zhCN['lang.name'] }));

    expect(document.documentElement.lang).toBe('zh-CN');
    expect(screen.getByRole('dialog', { name: zhCN['settings.title'] })).toBeTruthy();
    expect(screen.getByRole('button', { name: zhCN['settings.close'] })).toBeTruthy();
    expect(screen.getByRole('heading', { name: zhCN['levelSelect.gameTitle'] })).toBeTruthy();
    expect(screen.getByText(zhCN['levelSelect.sectorSelectionHeading'])).toBeTruthy();
  });

  it('opens the selected next-wave signal in the compendium and returns to the same run', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));
    await user.click(screen.getByRole('button', { name: /Start deployment/ }));

    const draft = screen.getByRole('region', { name: 'Choose initial modules' });
    await user.click(within(draft).getAllByRole('button', { name: 'Choose module' })[0]);
    expect(within(draft).getByText('2 / 3')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Open Prism Crown in the signal compendium' }));
    expect(screen.getByRole('heading', { name: 'Prism Crown' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Return to current battlefield' }));
    expect(screen.getByRole('region', { name: 'Choose initial modules' })).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();
  });
});
