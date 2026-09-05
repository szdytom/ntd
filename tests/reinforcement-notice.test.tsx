// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { ReinforcementNotice } from '../apps/web-coop/src/ReinforcementNotice';

afterEach(() => cleanup());

describe('co-op reinforcement notice', () => {
  it('previews grouped incoming signals without requiring an action', () => {
    render(<ReinforcementNotice signals={[
      { ordinal: 0, type: 'spark', entrance: 'white-prism:0' },
      { ordinal: 1, type: 'spark', entrance: 'white-prism:0' },
      { ordinal: 2, type: 'crown', entrance: 'white-prism:0' },
    ]} />);

    expect(screen.getByRole('status', { name: 'Reinforcement phase' })).not.toBeNull();
    expect(screen.getByTitle('Spark × 2')).not.toBeNull();
    expect(screen.getByTitle('Prism Crown × 1')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
