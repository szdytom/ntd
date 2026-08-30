import { describe, expect, it, vi } from 'vitest';
import { EffectEngine } from '../src/effects/engine';
import { statusOrbs } from '../src/effects/factories';
import type { EffectFrame, EffectPainter } from '../src/effects/types';

describe('effect engine reuse', () => {
  it('preserves frame values when expired instances are recycled', () => {
    const rendered: Array<{ id: number; x: number; fin: number }> = [];
    const engine = new EffectEngine().register({
      id: 'test:recycled',
      lifetime: 1,
      layer: 'air',
      render: (frame) => rendered.push({ id: frame.id, x: frame.x, fin: frame.fin }),
    });
    const ctx = {
      save() {},
      restore() {},
    } as unknown as CanvasRenderingContext2D;

    engine.spawn('test:recycled', { position: { x: 10, y: 0 } });
    engine.update(0.25);
    engine.render(ctx, 'air');
    engine.update(1);
    engine.spawn('test:recycled', { position: { x: 20, y: 0 } });
    engine.update(0.5);
    engine.render(ctx, 'air');

    expect(rendered).toEqual([
      { id: 1, x: 10, fin: 0.25 },
      { id: 2, x: 20, fin: 0.5 },
    ]);
  });
});

describe('status orb effects', () => {
  it('draws only translucent circles sampled across the supplied target radius', () => {
    const circles: Array<{ x: number; y: number; alpha: number | undefined }> = [];
    const triangle = vi.fn();
    const effect = statusOrbs({ id: 'test:status-orbs', bloom: 0.9 });
    const frame: EffectFrame = {
      id: 1,
      x: 100,
      y: 80,
      rotation: 0,
      color: '#ff6000',
      data: { radius: 20 },
      time: 0.2,
      lifetime: 0.5,
      fin: 0.4,
      fout: 0.6,
      slope: 0.95,
      easeIn: (power = 2) => 0.4 ** power,
      easeOut: (power = 2) => 1 - 0.6 ** power,
      random: (index, min = 0, max = 1) => {
        const unit = [0.25, 0.81, 0.5][index] ?? 0.5;
        return min + unit * (max - min);
      },
      randomSign: () => 1,
    };
    const painter: EffectPainter = {
      ctx: {} as CanvasRenderingContext2D,
      circle: (x, y, _radius, _color, alpha) => circles.push({ x, y, alpha }),
      ring: vi.fn(),
      line: vi.fn(),
      lineAngle: vi.fn(),
      polygon: vi.fn(),
      triangle,
      light: vi.fn(),
    };

    effect.render(frame, painter);

    expect(effect.bloom).toBe(0.9);
    expect(circles).toHaveLength(3);
    expect(triangle).not.toHaveBeenCalled();
    expect(Math.hypot((circles[0]?.x ?? 0) - frame.x, (circles[0]?.y ?? 0) - frame.y)).toBeCloseTo(16.2);
    expect(circles.every(({ alpha }) => (alpha ?? 1) < 0.6)).toBe(true);
  });
});
