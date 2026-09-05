import type { CSSProperties } from 'react';
import './CalibrationSlider.css';

export function CalibrationSlider({ label, min, max, step, value, layout = 'inline', onChange }: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  layout?: 'inline' | 'stacked';
  onChange: (value: number) => void;
}) {
  const progress = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
  return <label
    className={`calibration-slider calibration-slider--${layout}`}
    style={{ '--calibration-progress': `${progress}%` } as CSSProperties}
  >
    <span>{label}</span>
    <input
      aria-label={label}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
    />
    <b>{value.toFixed(2)}×</b>
  </label>;
}
