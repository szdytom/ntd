import { clamp } from '@prism-bastion/game-core/game/math';
import { traceRegularPolygon } from '../signals/visuals/canvas';

export interface TowerVisualOptions {
  color: string;
  energyRatio: number;
  level: number;
  rotation: number;
  flash?: number;
  selected?: boolean;
  programHasProjectile?: boolean;
  label?: string;
}

export function drawTowerBody(ctx: CanvasRenderingContext2D, options: TowerVisualOptions): void {
  const flash = options.flash ?? 0;
  ctx.save();
  const inheritedAlpha = ctx.globalAlpha;
  ctx.shadowColor = 'rgba(44, 38, 76, 0.16)';
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = options.selected ? options.color : '#dad8e2';
  ctx.lineWidth = options.selected ? 3 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#e8e6ee';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 35, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();
  ctx.strokeStyle = options.color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(options.energyRatio, 0, 1));
  ctx.stroke();

  for (let level = 0; level < options.level; level += 1) {
    const angle = Math.PI * 0.78 + level * Math.PI * 0.11;
    ctx.fillStyle = level === options.level - 1 ? '#ffffff' : options.color;
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 35, Math.sin(angle) * 35, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.rotate(options.rotation);
  ctx.fillStyle = options.color;
  ctx.globalAlpha = inheritedAlpha * (0.16 + flash * 0.22);
  ctx.beginPath();
  ctx.roundRect(-3, -10, 36 + flash * 5, 20, 8);
  ctx.fill();
  ctx.globalAlpha = inheritedAlpha;
  ctx.fillStyle = '#332f48';
  ctx.beginPath();
  ctx.roundRect(-2, -7, 28, 14, 6);
  ctx.fill();
  ctx.fillStyle = options.color;
  ctx.beginPath();
  ctx.arc(23, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(-options.rotation);

  ctx.fillStyle = options.color;
  traceRegularPolygon(ctx, 0, 0, 15, 6, Math.PI / 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  if (options.programHasProjectile === false) {
    ctx.fillStyle = '#ff5c5c';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(23, -23, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '800 11px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 23, -23);
  }

  if (options.label) {
    ctx.fillStyle = '#312d43';
    ctx.font = '800 10px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.label, 0, 48);
  }
  ctx.restore();
}
