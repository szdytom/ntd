const SPRITE_SIZE = 64;
const glowSpriteCache = new Map<string, HTMLCanvasElement>();

function rgba(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const normalized = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;
  if (normalized.length !== 6) return color;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/** A cached soft radial glow per color, composited with `drawImage`. */
function glowSprite(color: string): HTMLCanvasElement {
  let sprite = glowSpriteCache.get(color);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const ctx = sprite.getContext('2d');
  if (ctx) {
    const half = SPRITE_SIZE / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, rgba(color, 1));
    gradient.addColorStop(0.35, rgba(color, 0.72));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  }
  glowSpriteCache.set(color, sprite);
  return sprite;
}

/**
 * Draws a soft halo centered at (x, y) with the given halo radius. Cheap and
 * allocation-free (cached sprite), replacing per-shape Canvas `shadowBlur`.
 */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 1,
): void {
  if (radius <= 0 || alpha <= 0) return;
  const sprite = glowSprite(color);
  const diameter = radius * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - diameter / 2, y - diameter / 2, diameter, diameter);
  ctx.restore();
}
