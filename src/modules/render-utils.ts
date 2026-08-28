export function drawProjectileGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 2.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.25, Math.max(1.2, radius * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function projectileAngle(velocity: { x: number; y: number }): number {
  return Math.atan2(velocity.y, velocity.x);
}
