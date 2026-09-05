// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { GameSnapshot } from '@prism-bastion/game-core/game/types';
import { Battlefield } from '@prism-bastion/web-shared/ui/Battlefield';
import { SignalPreview } from '@prism-bastion/web-shared/ui/SignalPreview';

afterEach(cleanup);

const finalWaveSnapshot = (engine: GameEngine, snapshot: GameSnapshot): GameSnapshot => ({
  ...snapshot,
  status: 'planning',
  wave: engine.level.waves.length - 1,
});

describe('signal wave preview', () => {
  it('shows every signal type in a wave without truncation', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 17 });
    const snapshot = finalWaveSnapshot(engine, engine.getSnapshot());

    render(<SignalPreview
      engine={engine}
      wave={snapshot.wave}
      onOpenArchive={() => undefined}
    />);

    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(screen.getByTitle('Kite × 18')).toBeTruthy();
    expect(screen.getByTitle('Prism Crown × 2')).toBeTruthy();
    expect(screen.getByTitle('Fracture Star × 2')).toBeTruthy();
    expect(screen.getByTitle('Radiant Lag Ring × 1')).toBeTruthy();
    expect(screen.getByTitle('Prism Anvil × 1')).toBeTruthy();
  });

  it('keeps the current-wave roster visible while showing live counts', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'triune-delta', seed: 19 });
    const snapshot = finalWaveSnapshot(engine, engine.getSnapshot());

    render(<SignalPreview
      engine={engine}
      wave={snapshot.wave}
      liveCounts={{ kite: 4, crown: 1 }}
      onOpenArchive={() => undefined}
    />);

    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(screen.getByTitle('Kite × 4')).toBeTruthy();
    expect(screen.getByTitle('Prism Crown × 1')).toBeTruthy();
    expect(screen.getByTitle('Fracture Star × 0')).toBeTruthy();
    expect(screen.getByTitle('Radiant Lag Ring × 0')).toBeTruthy();
    expect(screen.getByTitle('Prism Anvil × 0')).toBeTruthy();
  });

  it('switches the signal heading when an attack starts', () => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 23 });
    const onOpenArchive = () => undefined;
    const { rerender } = render(<Battlefield
      engine={engine}
      view={engine.getViewSnapshot()}
      onOpenArchive={onOpenArchive}
    />);
    expect(screen.getByText('Next-wave signals')).toBeTruthy();

    engine.startWave();
    rerender(<Battlefield
      engine={engine}
      view={engine.getViewSnapshot()}
      onOpenArchive={onOpenArchive}
    />);

    expect(screen.getByText('Current-wave signals')).toBeTruthy();
  });

  it.each(['won', 'lost'] as const)('shows no signals after the run is %s', (status) => {
    const engine = new GameEngine({ mode: 'creative', levelId: 'starter-elbow', seed: 29 });
    const view = engine.getViewSnapshot();
    const { container } = render(<Battlefield
      engine={engine}
      view={{ ...view, game: { ...view.game, status } }}
      onOpenArchive={() => undefined}
    />);

    expect(screen.getByText('No signals')).toBeTruthy();
    expect(container.querySelector('[data-signal-preview]')).toBeNull();
  });
});
