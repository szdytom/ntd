// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ANVIL_SHAPE, FRACTURE_SHAPE } from '../src/game/enemy-shapes';
import { SignalIcon } from '../src/ui/SignalIcon';

afterEach(cleanup);

describe('shared signal icon', () => {
  it('uses the battlefield fracture geometry', () => {
    const { container } = render(<SignalIcon type="fracture" />);

    expect(container.querySelectorAll('.signal-icon__fracture-spike')).toHaveLength(FRACTURE_SHAPE.spikeCount);
    expect(container.querySelector('.signal-icon__fracture-core')).toBeTruthy();
    expect(container.querySelector('.signal-icon__detail-outline')).toBeTruthy();
  });

  it('keeps the anvil armor layers distinct', () => {
    const { container } = render(<SignalIcon type="anvil" monochrome />);

    expect(container.querySelector('.signal-icon__anvil-shell')).toBeTruthy();
    expect(container.querySelector('.signal-icon__anvil-plate')).toBeTruthy();
    expect(container.querySelector('.signal-icon__anvil-core')).toBeTruthy();
    expect(container.querySelectorAll('.signal-icon__anvil-groove')).toHaveLength(ANVIL_SHAPE.sides);
  });
});
