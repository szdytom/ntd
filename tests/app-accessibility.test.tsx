// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/ui/App';

afterEach(cleanup);

describe('level selection accessibility', () => {
  it('exposes mode state and supports arrow-key radio selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    const standardMode = screen.getByRole('button', { name: /正式模式/ });
    const creativeMode = screen.getByRole('button', { name: /创造模式/ });
    expect(standardMode.getAttribute('aria-pressed')).toBe('true');
    await user.click(creativeMode);
    expect(creativeMode.getAttribute('aria-pressed')).toBe('true');

    const difficultyGroup = screen.getByRole('radiogroup', { name: '选择难度' });
    const selectedDifficulty = difficultyGroup.querySelector<HTMLElement>('[aria-checked="true"]');
    expect(selectedDifficulty?.textContent).toContain('正常');
    selectedDifficulty?.focus();
    await user.keyboard('{ArrowRight}');
    expect(difficultyGroup.querySelector('[aria-checked="true"]')?.textContent).toContain('困难');

    const levelGroup = screen.getByRole('radiogroup', { name: '选择防御区' });
    const selectedLevel = levelGroup.querySelector<HTMLElement>('[aria-checked="true"]');
    expect(selectedLevel?.textContent).toContain('白棱镜区');
    selectedLevel?.focus();
    await user.keyboard('{ArrowRight}');
    expect(levelGroup.querySelector('[aria-checked="true"]')?.textContent).toContain('玫红回路');
  });

  it('shows three level cards at a time and pages with arrow controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    let group = screen.getByRole('radiogroup', { name: '选择防御区' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
    expect(group.textContent).toContain('启航折线');
    expect(group.textContent).not.toContain('翠光折返');

    await user.click(screen.getByRole('button', { name: '显示下一组关卡' }));
    group = screen.getByRole('radiogroup', { name: '选择防御区' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
    expect(group.classList.contains('slide-next')).toBe(true);
    expect(group.textContent).not.toContain('启航折线');
    expect(group.textContent).toContain('翠光折返');
  });
});
