// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../src/i18n';
import { GameEngine } from '../src/game/engine';
import { GameSession } from '../src/ui/GameSession';

afterEach(() => cleanup());

describe('advanced draft diagnostics', () => {
  it('silently toggles compact offer calculations outside the cards with F3', () => {
    const engine = new GameEngine({ mode: 'standard', seed: 11 });
    render(<GameSession
      engine={engine}
      defenseArchive={{} as never}
      onExit={() => undefined}
      onOpenArchive={() => undefined}
      onTutorialResolved={() => undefined}
    />);

    expect(document.querySelector('.reward-advanced-inline')).toBeNull();
    expect(document.querySelector('.reward-debug-summary')).toBeNull();
    expect(fireEvent.keyDown(window, { key: 'F3' })).toBe(false);

    expect(document.querySelector('.reward-advanced-inline')?.textContent).toMatch(
      /^s=1\.00 a=2\.00 b=1\.60 u=\+0\.00 q=1\.60 \(0\/2 [1-5]:-:\d+:\d+\)$/,
    );
    const summary = document.querySelector('.reward-head > .reward-debug-summary');
    const cardDiagnostics = [...(summary?.querySelectorAll('code') ?? [])];
    expect(cardDiagnostics).toHaveLength(4);
    cardDiagnostics.forEach((row) => {
      expect(row.textContent?.trim()).toMatch(/^b=\S+ r=\S+ o=\S+ t=\S+ p=\S+ d=\S+ w=\S+$/);
    });

    fireEvent.keyDown(window, { key: 'F3' });
    expect(document.querySelector('.reward-advanced-inline')).toBeNull();
    expect(document.querySelector('.reward-debug-summary')).toBeNull();
  });
});
