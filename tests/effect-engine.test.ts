import { describe, expect, it } from 'vitest';
import { EffectEngine } from '../src/effects/engine';

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
