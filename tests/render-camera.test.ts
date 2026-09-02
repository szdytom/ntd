import { describe, expect, it } from 'vitest';
import { resolveRenderBounds } from '../src/game/renderer';

describe('render camera', () => {
  it('keeps the default renderer on the full world', () => {
    expect(resolveRenderBounds(1160, 650)).toEqual({ x: 0, y: 0, width: 1160, height: 650 });
  });

  it('crops a wide thought stage around its local subject', () => {
    const bounds = resolveRenderBounds(1080, 450, { center: { x: 465, y: 500 }, height: 300 });
    expect(bounds).toEqual({ x: 105, y: 350, width: 720, height: 300 });
  });

  it('tightens horizontally on a portrait stage without revealing more world', () => {
    const bounds = resolveRenderBounds(360, 420, { center: { x: 465, y: 500 }, height: 300 });
    expect(bounds.height).toBe(300);
    expect(bounds.width).toBeCloseTo(257.14, 2);
    expect(bounds.x).toBeGreaterThan(330);
    expect(bounds.y).toBe(350);
  });
});
