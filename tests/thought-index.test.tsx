// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/i18n';
import { GameEngine } from '../src/game/engine';
import { thoughtRegistry, ThoughtSceneDirector } from '../src/thoughts';
import { App, TUTORIAL_OFFER_STORAGE_KEY } from '../src/ui/App';
import { RewardDraft } from '../src/ui/RewardDraft';
import { Workshop } from '../src/ui/Workshop';
import { ProgramReadout } from '../src/ui/ProgramReadout';

beforeEach(() => {
  const values = new Map<string, string>([[TUTORIAL_OFFER_STORAGE_KEY, '1']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('thought index entry points', () => {
  it('opens from deployment and returns to the mounted selection screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open the thought index' }));
    expect(screen.getByRole('main', { name: 'Thought Index' })).toBeTruthy();
    expect(document.querySelector('.thought-module-badge')).toBeTruthy();
    expect(document.querySelector('.thought-scene-overlay')).toBeTruthy();
    const timeline = screen.getByRole('navigation', { name: 'Thought timeline' });
    const units = within(timeline).getAllByRole('button');
    const beats = thoughtRegistry.require('pulse').beats;
    expect(units).toHaveLength(beats.length);
    beats.forEach((beat, index) => expect(units[index]?.style.flexGrow).toBe(String(beat.timelineDuration)));
    const target = units.at(-1);
    if (!target) throw new Error('Expected a timeline unit');
    await user.click(target);
    expect(target.getAttribute('aria-current')).toBe('step');
    await user.click(screen.getByRole('button', { name: 'Return to deployment' }));
    expect(screen.getByRole('heading', { name: 'Prism Bastion' })).toBeTruthy();
  });

  it('renders authored indefinite waits as square timeline markers', async () => {
    const user = userEvent.setup();
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => beat.cues?.some((cue) => cue.timelineWait)));
    if (!definition) throw new Error('Expected an authored indefinite wait');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open the thought index' }));
    const record = document.querySelector<HTMLElement>(`[data-thought-id="${definition.id}"]`);
    if (!record) throw new Error('Expected the thought record');
    await user.click(record);
    const director = new ThoughtSceneDirector(definition);
    const expectedMarkerCount = director.getTimelineWaitMarkers().length;
    director.dispose();
    expect(document.querySelectorAll('.thought-progress-wait')).toHaveLength(expectedMarkerCount);
  });

  it('only shows a workshop thought action for covered modules', async () => {
    const user = userEvent.setup();
    const engine = new GameEngine({ mode: 'creative', seed: 5 });
    const tower = engine.towers[0];
    if (!tower) throw new Error('Expected a tower');
    engine.selectTower(tower.id);
    const openThought = vi.fn();
    const rendered = render(<Workshop engine={engine} tower={tower} view={engine.getViewSnapshot()} onOpenThought={openThought} />);
    await user.click(screen.getByRole('button', { name: 'View thought' }));
    expect(openThought).toHaveBeenCalledWith('pulse');

    await user.click(screen.getByRole('button', { name: /Arcbolt/ }));
    const arcboltThought = rendered.queryByRole('button', { name: 'View thought' });
    expect(arcboltThought).not.toBeNull();
    await user.click(arcboltThought!);
    expect(openThought).toHaveBeenCalledWith('arcbolt');
  });

  it('opens a covered draft thought without consuming the draft choice', async () => {
    const user = userEvent.setup();
    let engine: GameEngine | undefined;
    for (let seed = 1; seed < 100; seed += 1) {
      const candidate = new GameEngine({ mode: 'standard', seed });
      if (candidate.getSnapshot().draft?.choices.some((id) => ['frost', 'pulse', 'focus-core', 'double-fork', 'impact-trigger', 'proximity-mine', 'cinder-trail', 'void-beam'].includes(id))) {
        engine = candidate;
        break;
      }
    }
    if (!engine) throw new Error('Expected a covered draft choice');
    const before = engine.getSnapshot().draft;
    const openThought = vi.fn();
    render(<RewardDraft engine={engine} snapshot={engine.getSnapshot()} inventory={engine.getViewSnapshot().moduleInventory} onOpenThought={openThought} />);
    const panel = screen.getByRole('region', { name: 'Choose initial modules' });
    await user.click(within(panel).getAllByRole('button', { name: 'View thought' })[0] as HTMLElement);
    expect(openThought).toHaveBeenCalledOnce();
    expect(engine.getSnapshot().draft).toEqual(before);
  });

  it('links covered compiler diagnostics to their explanation', async () => {
    const user = userEvent.setup();
    const engine = new GameEngine({ mode: 'creative', seed: 7 });
    const openThought = vi.fn();
    render(<ProgramReadout
      program={engine.modules.compile(['impact-trigger', 'pulse'])}
      engine={engine}
      maxEnergy={100}
      onOpenThought={openThought}
    />);
    await user.click(screen.getByRole('button', { name: 'Show why' }));
    expect(openThought).toHaveBeenCalledWith('impact-trigger');
  });
});
