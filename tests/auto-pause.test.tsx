// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/i18n';
import { GameEngine } from '../src/game/engine';
import { App } from '../src/ui/App';
import { GameSession } from '../src/ui/GameSession';
import { SettingsPanel } from '../src/ui/SettingsPanel';
import { AUTO_PAUSE_STORAGE_KEY } from '../src/ui/preferences';

beforeEach(() => {
  const storedValues = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('automatic pause', () => {
  it('is enabled by default and persists when disabled in settings', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SettingsPanel />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    const autoPauseGroup = screen.getByRole('group', { name: 'Automatic pause' });
    expect(within(autoPauseGroup).getByRole('button', { name: 'Enabled' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(autoPauseGroup).getByRole('button', { name: 'Disabled' }));
    expect(globalThis.localStorage.getItem(AUTO_PAUSE_STORAGE_KEY)).toBe('0');

    unmount();
    render(<SettingsPanel />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const restoredGroup = screen.getByRole('group', { name: 'Automatic pause' });
    expect(within(restoredGroup).getByRole('button', { name: 'Disabled' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('pauses while the Arc Workshop is open and resumes when it closes', async () => {
    const user = userEvent.setup();
    const engine = new GameEngine({ mode: 'creative', seed: 9 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a tower');
    engine.selectTower(tower.id);

    render(<GameSession
      engine={engine}
      defenseArchive={{} as never}
      onExit={() => undefined}
      onOpenArchive={() => undefined}
      onTutorialResolved={() => undefined}
    />);

    await waitFor(() => expect(engine.getSnapshot()).toMatchObject({ paused: true, manuallyPaused: false }));
    expect(screen.getByText('AUTO PAUSED')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Pause game' }));
    expect(screen.getByText('SYSTEM PAUSED')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Resume game' }));
    expect(screen.getByText('AUTO PAUSED')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Close workshop' }));
    await waitFor(() => expect(engine.getSnapshot().paused).toBe(false));
  });

  it('registers the signal compendium and lost tab focus as automatic conditions', async () => {
    const user = userEvent.setup();
    const conditionSpy = vi.spyOn(GameEngine.prototype, 'setAutoPauseCondition');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'No, thanks' }));
    await user.click(screen.getByRole('button', { name: /Start deployment/ }));

    window.dispatchEvent(new Event('blur'));
    expect(conditionSpy).toHaveBeenCalledWith('page-focus', true);

    await user.click(screen.getAllByRole('button', { name: /signal compendium/ })[0] as HTMLElement);
    expect(conditionSpy).toHaveBeenCalledWith('signal-archive', true);
    await user.click(screen.getByRole('button', { name: 'Return to current battlefield' }));
    expect(conditionSpy).toHaveBeenCalledWith('signal-archive', false);
  });
});
