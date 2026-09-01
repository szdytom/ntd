// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '../src/i18n';
import { GameEngine } from '../src/game/engine';
import { GameHeader } from '../src/ui/GameHeader';

afterEach(cleanup);

describe('game header', () => {
  it('keeps settings available while choosing modules', async () => {
    const user = userEvent.setup();
    const engine = new GameEngine({ mode: 'standard', seed: 9 });
    const snapshot = engine.getSnapshot();
    expect(snapshot.draft).not.toBeNull();

    render(<GameHeader engine={engine} snapshot={snapshot} onExit={() => undefined} />);

    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings.getAttribute('disabled')).toBeNull();
    await user.click(settings);
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  });
});
