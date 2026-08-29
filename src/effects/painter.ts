import type { EffectPainter } from './types';

export class CanvasEffectPainter implements EffectPainter {
  constructor(readonly ctx: CanvasRenderingContext2D, private intensity = 1) {}

  setIntensity(intensity: number): void {
    this.intensity = intensity;
  }

  private alpha(value: number): number {
    return Math.max(0, Math.min(1, value * this.intensity));
  }

  circle(x: number, y: number, radius: number, color: string, alpha = 1): void {
    if (radius <= 0 || alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.alpha(alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ring(x: number, y: number, radius: number, stroke: number, color: string, alpha = 1): void {
    if (radius <= 0 || stroke <= 0 || alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.alpha(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: number, color: string, alpha = 1): void {
    if (stroke <= 0 || alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.alpha(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  lineAngle(x: number, y: number, angle: number, length: number, stroke: number, color: string, alpha = 1): void {
    this.line(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, stroke, color, alpha);
  }

  polygon(x: number, y: number, radius: number, sides: number, rotation: number, color: string, alpha = 1, stroke = 0): void {
    if (radius <= 0 || sides < 3 || alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.alpha(alpha);
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + (index / sides) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (stroke > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = stroke;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  triangle(x: number, y: number, width: number, length: number, rotation: number, color: string, alpha = 1): void {
    if (width <= 0 || length <= 0 || alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = this.alpha(alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(length, 0);
    ctx.lineTo(0, -width / 2);
    ctx.lineTo(0, width / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  light(x: number, y: number, radius: number, color: string, alpha = 0.4): void {
    if (radius <= 0 || alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.withAlpha(color, this.alpha(alpha)));
    gradient.addColorStop(0.35, this.withAlpha(color, this.alpha(alpha * 0.55)));
    gradient.addColorStop(1, this.withAlpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private withAlpha(color: string, alpha: number): string {
    if (!color.startsWith('#')) return color;
    const hex = color.slice(1);
    const normalized = hex.length === 3 ? hex.split('').map((value) => value + value).join('') : hex;
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}

/** Executes effect geometry once while painting it into the scene and emissive targets. */
export class MirroredEffectPainter implements EffectPainter {
  get ctx(): CanvasRenderingContext2D {
    return this.scene.ctx;
  }

  constructor(
    private scene: EffectPainter,
    private emissive: EffectPainter,
  ) {}

  setPainters(scene: EffectPainter, emissive: EffectPainter): void {
    this.scene = scene;
    this.emissive = emissive;
  }

  circle(x: number, y: number, radius: number, color: string, alpha = 1): void {
    this.scene.circle(x, y, radius, color, alpha);
    this.emissive.circle(x, y, radius, color, alpha);
  }

  ring(x: number, y: number, radius: number, stroke: number, color: string, alpha = 1): void {
    this.scene.ring(x, y, radius, stroke, color, alpha);
    this.emissive.ring(x, y, radius, stroke, color, alpha);
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: number, color: string, alpha = 1): void {
    this.scene.line(x1, y1, x2, y2, stroke, color, alpha);
    this.emissive.line(x1, y1, x2, y2, stroke, color, alpha);
  }

  lineAngle(x: number, y: number, angle: number, length: number, stroke: number, color: string, alpha = 1): void {
    this.scene.lineAngle(x, y, angle, length, stroke, color, alpha);
    this.emissive.lineAngle(x, y, angle, length, stroke, color, alpha);
  }

  polygon(
    x: number,
    y: number,
    radius: number,
    sides: number,
    rotation: number,
    color: string,
    alpha = 1,
    stroke = 0,
  ): void {
    this.scene.polygon(x, y, radius, sides, rotation, color, alpha, stroke);
    this.emissive.polygon(x, y, radius, sides, rotation, color, alpha, stroke);
  }

  triangle(x: number, y: number, width: number, length: number, rotation: number, color: string, alpha = 1): void {
    this.scene.triangle(x, y, width, length, rotation, color, alpha);
    this.emissive.triangle(x, y, width, length, rotation, color, alpha);
  }

  light(x: number, y: number, radius: number, color: string, alpha = 0.4): void {
    this.scene.light(x, y, radius, color, alpha);
    this.emissive.light(x, y, radius, color, alpha);
  }
}
