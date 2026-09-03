// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/i18n';
import { GameEngine } from '../src/game/engine';
import { encodeOrchestration } from '../src/game/orchestration-codec';
import { GameSession } from '../src/ui/GameSession';
import { Workshop } from '../src/ui/Workshop';

const renderWorkshop = (mode: 'creative' | 'standard' = 'creative') => {
  const engine = new GameEngine({ mode, seed: 41 });
  const tower = engine.towers[0];
  if (!tower) throw new Error('Expected a tower');
  engine.selectTower(tower.id);
  const view = engine.getViewSnapshot();
  if (!view.selectedTower) throw new Error('Expected a selected tower');
  const onToast = vi.fn<(message: string, tone: 'good' | 'warn') => void>();
  render(<Workshop engine={engine} tower={view.selectedTower} view={view} onToast={onToast} />);
  return { engine, tower, onToast };
};

const setClipboard = (clipboard: Partial<Clipboard>): void => {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: clipboard,
  });
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('workshop orchestration transfer', () => {
  it('copies only the compact orchestration token', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(data: string) => Promise<void>>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const { tower, onToast } = renderWorkshop();

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(writeText).toHaveBeenCalledWith(encodeOrchestration({
      slots: tower.slots,
      targeting: tower.targeting,
    }));
    expect(onToast).toHaveBeenCalledWith('Orchestration copied', 'good');
    expect(document.querySelector('.orchestration-notice')).toBeNull();
  });

  it('reads, validates, and applies an orchestration from the clipboard', async () => {
    const user = userEvent.setup();
    const token = encodeOrchestration({ slots: ['frost', 'pulse'], targeting: 'tower-farthest' });
    setClipboard({ readText: vi.fn<() => Promise<string>>().mockResolvedValue(`  ${token}\n`) });
    const { tower, onToast } = renderWorkshop();

    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(tower.slots.slice(0, 2)).toEqual(['frost', 'pulse']));
    expect(tower.slots.slice(2).every((slot) => slot === null)).toBe(true);
    expect(tower.targeting).toBe('tower-farthest');
    expect(onToast).toHaveBeenCalledWith('Orchestration imported', 'good');
  });

  it('reports damaged tokens without changing the current tower', async () => {
    const user = userEvent.setup();
    const token = encodeOrchestration({ slots: ['pulse'], targeting: 'core-nearest' });
    const replacement = token.endsWith('0') ? '1' : '0';
    setClipboard({ readText: vi.fn<() => Promise<string>>().mockResolvedValue(`${token.slice(0, -1)}${replacement}`) });
    const { tower, onToast } = renderWorkshop();
    const before = { slots: [...tower.slots], targeting: tower.targeting };

    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(tower.slots).toEqual(before.slots);
    expect(tower.targeting).toBe(before.targeting);
    expect(onToast).toHaveBeenCalledWith('The orchestration token is damaged or incomplete.', 'warn');
  });

  it('reports unavailable clipboard access and hides transfer controls outside creative mode', async () => {
    const user = userEvent.setup();
    setClipboard({});
    const { onToast } = renderWorkshop();
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('Clipboard access failed'), 'warn');

    cleanup();
    renderWorkshop('standard');
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
  });

  it('routes workshop feedback through the session Toast', async () => {
    const user = userEvent.setup();
    setClipboard({ writeText: vi.fn<(data: string) => Promise<void>>().mockResolvedValue(undefined) });
    const engine = new GameEngine({ mode: 'creative', seed: 43 });
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

    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Orchestration copied'));
    expect(document.querySelector('.orchestration-notice')).toBeNull();
  });
});
