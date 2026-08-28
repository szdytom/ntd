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
});
