// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalibrationSlider } from '@prism-bastion/web-shared/ui/CalibrationSlider';

afterEach(cleanup);

describe('calibration slider', () => {
  it('reports numeric changes and exposes its progress to the shared track', () => {
    const onChange = vi.fn();
    const { container } = render(<CalibrationSlider
      label="Health multiplier"
      min={0.25}
      max={5}
      step={0.25}
      value={1}
      onChange={onChange}
    />);

    const slider = screen.getByRole('slider', { name: 'Health multiplier' });
    fireEvent.change(slider, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith(2);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--calibration-progress')).toBe('15.789473684210526%');
  });
});
