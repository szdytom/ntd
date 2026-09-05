// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { CoopGameController } from '@prism-bastion/coop/controller';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { GameHeader } from '@prism-bastion/web-shared/ui/GameHeader';

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

  it('turns the co-op launch action into an enabled cancel-ready action', async () => {
    const user = userEvent.setup();
    const engine = new CoopGameController({ levelId: 'starter-elbow', difficultyId: 'normal', seed: 11 }).engine;
    const onLaunch = vi.fn();

    render(<GameHeader
      engine={engine}
      snapshot={engine.getSnapshot()}
      onExit={() => undefined}
      onLaunch={onLaunch}
      launchReady
      launchReadyLabel="Ready"
      launchCancelLabel="Cancel ready"
    />);

    const cancel = screen.getByRole('button', { name: 'Cancel ready' });
    expect(cancel.getAttribute('disabled')).toBeNull();
    expect(cancel.getAttribute('data-ready')).toBe('true');
    expect(cancel.textContent).toContain('Cancel ready');
    await user.click(cancel);
    expect(onLaunch).toHaveBeenCalledOnce();
  });
});
