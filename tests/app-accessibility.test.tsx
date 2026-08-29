// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../src/i18n';
import zhCN from '../src/i18n/locales/zh-CN.json';
import { App } from '../src/ui/App';

afterEach(() => {
  cleanup();
  void i18n.changeLanguage('en');
});

describe('level selection accessibility', () => {
  it('exposes mode state and supports arrow-key radio selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    const standardMode = screen.getByRole('button', { name: /Standard/ });
    const creativeMode = screen.getByRole('button', { name: /Creative/ });
    expect(standardMode.getAttribute('aria-pressed')).toBe('true');
    await user.click(creativeMode);
    expect(creativeMode.getAttribute('aria-pressed')).toBe('true');

    const difficultyGroup = screen.getByRole('radiogroup', { name: 'Choose difficulty' });
    const selectedDifficulty = difficultyGroup.querySelector<HTMLElement>('[aria-checked="true"]');
    expect(selectedDifficulty?.textContent).toContain('Normal');
    selectedDifficulty?.focus();
    await user.keyboard('{ArrowRight}');
    expect(difficultyGroup.querySelector('[aria-checked="true"]')?.textContent).toContain('Hard');

    const levelGroup = screen.getByRole('radiogroup', { name: 'Choose defense sector' });
    const selectedLevel = levelGroup.querySelector<HTMLElement>('[aria-checked="true"]');
    expect(selectedLevel?.textContent).toContain('White Prism');
    selectedLevel?.focus();
    await user.keyboard('{ArrowRight}');
    expect(levelGroup.querySelector('[aria-checked="true"]')?.textContent).toContain('Rose Circuit');
  });

  it('shows three level cards at a time and pages with arrow controls', async () => {
    const user = userEvent.setup();
    render(<App />);

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

  it('switches the complete interface language and updates the document locale', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'zh-CN');

    expect(document.documentElement.lang).toBe('zh-CN');
    expect(screen.getByRole('heading', { name: zhCN['levelSelect.title'] })).toBeTruthy();
  });
});
