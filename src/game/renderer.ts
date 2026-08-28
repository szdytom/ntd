import { createBloomWebGLContext, WebGLBloomPipeline, type ShieldDistortion } from '../effects/bloom';
import { ECONOMY_BALANCE } from './balance';
import { ENEMIES, WORLD } from './config';
import { clamp, distance } from './math';
import type { GameEngine } from './engine';
import type { Enemy, Point, Tower } from './types';

function hexToRgb(color: string): readonly [number, number, number] {
  const value = Number.parseInt(color.replace('#', ''), 16);
  if (!Number.isFinite(value)) return [0.27, 0.72, 1];
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  ];
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private readonly scene = document.createElement('canvas');
  private readonly background = document.createElement('canvas');
  private readonly backgroundCtx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;
  private readonly bloom: WebGLBloomPipeline | null;
  private readonly fallbackCtx: CanvasRenderingContext2D | null;
  private readonly resizeObserver: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private engine: GameEngine) {
    const context = this.scene.getContext('2d', { alpha: false });
    const backgroundContext = this.background.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D context is unavailable');
    if (!backgroundContext) throw new Error('Background Canvas 2D context is unavailable');
    this.ctx = context;
    this.backgroundCtx = backgroundContext;
    const gl = createBloomWebGLContext(canvas);
    this.bloom = gl ? new WebGLBloomPipeline(canvas, gl) : null;
    this.fallbackCtx = this.bloom ? null : canvas.getContext('2d', { alpha: false });
    if (!this.bloom && !this.fallbackCtx) throw new Error('Neither WebGL nor Canvas 2D output is available');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, bounds.width);
    const cssHeight = Math.max(1, bounds.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cssWidth === this.cssWidth && cssHeight === this.cssHeight && dpr === this.dpr) return;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.dpr = dpr;
    const pixelWidth = Math.round(this.cssWidth * this.dpr);
    const pixelHeight = Math.round(this.cssHeight * this.dpr);
    this.scene.width = pixelWidth;
    this.scene.height = pixelHeight;
    this.background.width = pixelWidth;
    this.background.height = pixelHeight;
    this.scale = Math.min(this.cssWidth / WORLD.width, this.cssHeight / WORLD.height);
    this.offsetX = (this.cssWidth - WORLD.width * this.scale) / 2;
    this.offsetY = (this.cssHeight - WORLD.height * this.scale) / 2;
    this.rebuildBackground();
    if (this.bloom) this.bloom.resize(this.cssWidth, this.cssHeight, this.dpr);
    else {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
  }

  toWorld(clientX: number, clientY: number): Point {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - bounds.left - this.offsetX) / this.scale,
      y: (clientY - bounds.top - this.offsetY) / this.scale,
    };
  }

  render(): void {
    const ctx = this.ctx;
    const bloomCtx = this.bloom?.beginFrame(this.offsetX, this.offsetY, this.scale);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.drawImage(
      this.background,
      0,
      0,
      this.background.width,
      this.background.height,
      0,
      0,
      this.cssWidth,
      this.cssHeight,
    );
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawDecorations();
    this.engine.effects.render(ctx, 'ground', bloomCtx);
    this.drawTowerPads();
    this.drawSelectionRange();
    this.drawTowers();
    this.engine.effects.render(ctx, 'under-projectile', bloomCtx);
    this.drawProjectiles();
    this.engine.effects.render(ctx, 'projectile', bloomCtx);
    this.drawEnemies();
    this.engine.effects.render(ctx, 'air', bloomCtx);
    this.drawFloatingText();
    this.drawCore();
    this.engine.effects.render(ctx, 'overlay', bloomCtx);

    ctx.restore();

    if (bloomCtx && this.bloom) {
      this.drawBloomSources(bloomCtx);
      this.bloom.render(this.scene, this.getShieldDistortion());
    } else if (this.fallbackCtx) {
      this.fallbackCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.fallbackCtx.drawImage(this.scene, 0, 0);
    }
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.bloom?.dispose();
  }

  private rebuildBackground(): void {
    const ctx = this.backgroundCtx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#fbfbfe';
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    this.drawGround(ctx);
    this.drawPath(ctx);
    ctx.restore();
  }

  private getShieldDistortion(): ShieldDistortion | null {
    const enemy = this.engine.enemies.find((candidate) => !candidate.dead && ENEMIES[candidate.type].shield);
    if (!enemy) return null;
    const shield = ENEMIES[enemy.type].shield;
    if (!shield || (enemy.shield <= 0 && enemy.shieldRippleAge >= 0.72)) return null;
    const bob = Math.sin(this.engine.visualElapsed * 5 + enemy.id) * 2;
    const screenX = this.offsetX + enemy.position.x * this.scale;
    const screenY = this.offsetY + (enemy.position.y + bob) * this.scale;
    return {
      centerX: screenX * this.dpr,
      centerY: (this.cssHeight - screenY) * this.dpr,
      radius: shield.radius * this.scale * this.dpr,
      radiusScale: enemy.shieldRadiusScale,
      active: enemy.shield > 0,
      sides: shield.sides,
      // Canvas 的 Y 轴朝下，而 WebGL 屏幕坐标的 Y 轴朝上。
      rotation: -shield.rotation,
      hitStrength: enemy.shieldHitFlash,
      color: hexToRgb(shield.color),
      rippleAge: enemy.shieldRippleAge,
      time: this.engine.visualElapsed,
    };
  }

  private drawBloomSources(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const tower of this.engine.towers) {
      if (tower.flash <= 0) continue;
      const muzzleX = tower.position.x + Math.cos(tower.rotation) * 30;
      const muzzleY = tower.position.y + Math.sin(tower.rotation) * 30;
      ctx.globalAlpha = tower.flash * 0.75;
      ctx.fillStyle = this.engine.getTowerColor(tower);
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 8 + tower.flash * 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = tower.flash * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 3 + tower.flash * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const projectile of this.engine.projectiles) {
      const staticPulse = projectile.behavior === 'static'
        ? 0.78 + Math.sin(projectile.age * 4 + projectile.id) * 0.18
        : 1;
      for (let index = projectile.trail.length - 1; index >= 0; index -= 1) {
        const trail = projectile.trail[index];
        if (!trail) continue;
        const fade = 1 - index / Math.max(1, projectile.trail.length);
        ctx.globalAlpha = fade * 0.28;
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, projectile.radius * (0.5 + fade * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.82 * staticPulse;
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(projectile.position.x, projectile.position.y, projectile.radius * (projectile.behavior === 'static' ? 1.5 : 1.25), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.88 * staticPulse;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(projectile.position.x, projectile.position.y, Math.max(1.5, projectile.radius * 0.42), 0, Math.PI * 2);
      ctx.fill();

      if (projectile.behavior === 'static' && projectile.shot.static) {
        ctx.globalAlpha = 0.1 * staticPulse;
        ctx.strokeStyle = projectile.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.shot.static.triggerRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const enemy of this.engine.enemies) {
      const shield = ENEMIES[enemy.type].shield;
      if (!shield || enemy.shield <= 0 || enemy.dead) continue;
      const radius = shield.radius * enemy.shieldRadiusScale;
      const bob = Math.sin(this.engine.visualElapsed * 5 + enemy.id) * 2;
      ctx.globalAlpha = 0.045 + enemy.shieldHitFlash * 0.34;
      ctx.fillStyle = shield.color;
      this.tracePolygon(ctx, enemy.position.x, enemy.position.y + bob, radius, shield.sides, shield.rotation);
      ctx.fill();
    }

    ctx.globalAlpha = 0.3 + Math.sin(this.engine.visualElapsed * 3) * 0.08;
    ctx.fillStyle = '#6c5ce7';
    ctx.beginPath();
    const core = this.engine.path.pointAtDistance(this.engine.path.length - 54).position;
    ctx.arc(core.x, core.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#fbfbfe';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = '#e4e3ed';
    for (let x = 24; x < WORLD.width; x += 32) {
      for (let y = 22; y < WORLD.height; y += 32) {
        if ((x / 32 + y / 32) % 3 < 0.5) continue;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(x, y, 1.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    const glow = ctx.createRadialGradient(530, 330, 20, 530, 330, 430);
    glow.addColorStop(0, `${this.engine.level.accent}0d`);
    glow.addColorStop(1, `${this.engine.level.accent}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  private tracePath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    const path = this.engine.level.path;
    const first = path[0];
    if (!first) return;
    ctx.moveTo(first.x, first.y);
    for (let index = 1; index < path.length; index += 1) {
      const point = path[index];
      if (point) ctx.lineTo(point.x, point.y);
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.tracePath(ctx);
    ctx.strokeStyle = 'rgba(49, 45, 72, 0.07)';
    ctx.lineWidth = 86;
    ctx.stroke();
    this.tracePath(ctx);
    ctx.strokeStyle = '#f0eff5';
    ctx.lineWidth = 78;
    ctx.stroke();
    this.tracePath(ctx);
    ctx.setLineDash([3, 14]);
    ctx.strokeStyle = '#cfccd9';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#b8b5c6';
    const arrowGap = this.engine.path.length / 10;
    for (let arrowDistance = arrowGap * 0.6; arrowDistance < this.engine.path.length - 60; arrowDistance += arrowGap) {
      const arrow = this.engine.path.pointAtDistance(arrowDistance);
      ctx.save();
      ctx.translate(arrow.position.x, arrow.position.y);
      ctx.rotate(arrow.angle);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -7);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawDecorations(): void {
    const ctx = this.ctx;
    const bits = [
      { x: 58, y: 43, color: '#ffcf4a', shape: 3, size: 8 },
      { x: 351, y: 55, color: '#00b894', shape: 4, size: 7 },
      { x: 724, y: 67, color: '#ff6b9d', shape: 3, size: 7 },
      { x: 1008, y: 89, color: '#6c5ce7', shape: 6, size: 8 },
      { x: 78, y: 480, color: '#00a8e8', shape: 4, size: 6 },
      { x: 194, y: 600, color: '#ff9f43', shape: 3, size: 8 },
      { x: 436, y: 588, color: '#ff6b9d', shape: 6, size: 7 },
      { x: 721, y: 585, color: '#00b894', shape: 4, size: 6 },
    ];
    for (const bit of bits) {
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(this.engine.visualElapsed * 0.25 + bit.x);
      ctx.strokeStyle = bit.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.55;
      this.polygon(0, 0, bit.size, bit.shape, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawTowerPads(): void {
    const ctx = this.ctx;
    for (let index = 0; index < this.engine.level.towerPads.length; index += 1) {
      if (this.engine.towers.some((tower) => tower.padIndex === index)) continue;
      const pad = this.engine.level.towerPads[index];
      if (!pad) continue;
      const hovered = this.engine.pointer ? distance(this.engine.pointer, pad) < 38 : false;
      ctx.save();
      ctx.translate(pad.x, pad.y);
      if (hovered) {
        ctx.fillStyle = 'rgba(108, 92, 231, 0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, 37, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = hovered ? '#6c5ce7' : '#c8c5d2';
      ctx.lineWidth = hovered ? 2.5 : 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 29, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hovered ? '#6c5ce7' : '#aaa7b8';
      ctx.font = '700 18px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', 0, -2);
      if (hovered) {
        ctx.fillStyle = '#332f48';
        ctx.font = '700 11px Manrope, sans-serif';
        ctx.fillText(`${ECONOMY_BALANCE.towerCost} ◇`, 0, 48);
      }
      ctx.restore();
    }
  }

  private drawSelectionRange(): void {
    const tower = this.engine.getSelectedTower();
    if (!tower) return;
    const ctx = this.ctx;
    const pulse = Math.sin(this.engine.visualElapsed * 3) * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(108, 92, 231, 0.025)';
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.arc(tower.position.x, tower.position.y, tower.range + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawTowers(): void {
    for (const tower of this.engine.towers) this.drawTower(tower);
  }

  private drawTower(tower: Tower): void {
    const ctx = this.ctx;
    const color = this.engine.getTowerColor(tower);
    const selected = tower.id === this.engine.selectedTowerId;
    const programHasProjectile = tower.slots.some((id) => id && this.engine.modules.get(id)?.kind === 'projectile');
    ctx.save();
    ctx.translate(tower.position.x, tower.position.y);

    ctx.shadowColor = 'rgba(44, 38, 76, 0.16)';
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = selected ? color : '#dad8e2';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e8e6ee';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 35, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (tower.energy / tower.maxEnergy));
    ctx.stroke();

    for (let level = 0; level < tower.level; level += 1) {
      const angle = Math.PI * 0.78 + level * Math.PI * 0.11;
      ctx.fillStyle = level === tower.level - 1 ? '#ffffff' : color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 35, Math.sin(angle) * 35, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.rotate(tower.rotation);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.16 + tower.flash * 0.22;
    ctx.beginPath();
    ctx.roundRect(-3, -10, 36 + tower.flash * 5, 20, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#332f48';
    ctx.beginPath();
    ctx.roundRect(-2, -7, 28, 14, 6);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(23, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-tower.rotation);

    ctx.fillStyle = color;
    this.polygon(0, 0, 15, 6, Math.PI / 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    if (!programHasProjectile) {
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

    ctx.fillStyle = '#312d43';
    ctx.font = '800 10px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`T${String(tower.id).padStart(2, '0')} · L${tower.level}`, 0, 48);
    ctx.restore();
  }

  private drawProjectiles(): void {
    const ctx = this.ctx;
    for (const projectile of this.engine.projectiles) {
      for (let index = projectile.trail.length - 1; index >= 0; index -= 1) {
        const trail = projectile.trail[index];
        if (!trail) continue;
        ctx.globalAlpha = (1 - index / projectile.trail.length) * 0.16;
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, projectile.radius * (1 - index / (projectile.trail.length + 2)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.engine.modules.renderProjectile(projectile.modules, { ctx, projectile });
    }
  }

  private drawEnemies(): void {
    const ordered = [...this.engine.enemies].sort((a, b) => a.position.y - b.position.y);
    for (const enemy of ordered) this.drawEnemy(enemy);
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const config = ENEMIES[enemy.type];
    const bob = Math.sin(this.engine.elapsed * 5 + enemy.id) * 2;
    ctx.save();
    ctx.translate(enemy.position.x, enemy.position.y + bob);
    ctx.rotate(enemy.angle + (enemy.type === 'kite' ? Math.PI / 4 : 0));
    ctx.shadowColor = 'rgba(37, 31, 65, 0.18)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : config.color;
    this.polygon(0, 0, enemy.radius, config.sides, enemy.type === 'spark' ? Math.PI / 2 : 0);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = enemy.type === 'crown' ? 4 : 3;
    ctx.stroke();

    if (enemy.type === 'hex' || enemy.type === 'crown') {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      this.polygon(0, 0, enemy.radius * 0.48, config.sides, 0);
      ctx.stroke();
    }
    if (enemy.type === 'crown') {
      ctx.rotate(-enemy.angle - this.engine.elapsed * 0.9);
      ctx.strokeStyle = '#ffcf4a';
      ctx.lineWidth = 3;
      this.polygon(0, 0, enemy.radius + 7, 8, this.engine.elapsed * 0.9);
      ctx.stroke();
    }
    ctx.restore();

    this.drawEnemyShield(enemy, bob);

    const barWidth = enemy.radius * 2.15;
    const barY = enemy.position.y - enemy.radius - 10 + bob;
    if (enemy.maxShield > 0) {
      ctx.fillStyle = 'rgba(49,45,67,0.1)';
      ctx.beginPath();
      ctx.roundRect(enemy.position.x - barWidth / 2, barY - 7, barWidth, 3, 1.5);
      ctx.fill();
      ctx.fillStyle = ENEMIES[enemy.type].shield?.color ?? '#45b7ff';
      ctx.beginPath();
      ctx.roundRect(
        enemy.position.x - barWidth / 2,
        barY - 7,
        barWidth * clamp(enemy.shield / enemy.maxShield, 0, 1),
        3,
        1.5,
      );
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(49,45,67,0.12)';
    ctx.beginPath();
    ctx.roundRect(enemy.position.x - barWidth / 2, barY, barWidth, 4, 2);
    ctx.fill();
    ctx.fillStyle = enemy.slowTime > 0 ? '#00a8e8' : config.color;
    ctx.beginPath();
    ctx.roundRect(enemy.position.x - barWidth / 2, barY, barWidth * clamp(enemy.hp / enemy.maxHp, 0, 1), 4, 2);
    ctx.fill();

    if (enemy.slowTime > 0) {
      ctx.strokeStyle = 'rgba(0,168,232,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y + bob, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    enemy.statuses.forEach((status, index) => {
      const radius = enemy.radius + 7 + index * 4;
      ctx.strokeStyle = status.color;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        enemy.position.x,
        enemy.position.y + bob,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(status.remaining / status.duration, 0, 1),
      );
      ctx.stroke();
      for (let dot = 0; dot < 3; dot += 1) {
        const angle = this.engine.elapsed * (1.8 + index * 0.3) + dot * Math.PI * 2 / 3;
        ctx.fillStyle = status.color;
        ctx.beginPath();
        ctx.arc(
          enemy.position.x + Math.cos(angle) * radius,
          enemy.position.y + bob + Math.sin(angle) * radius,
          2.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }

  private drawEnemyShield(enemy: Enemy, bob: number): void {
    const shield = ENEMIES[enemy.type].shield;
    if (!shield || enemy.shield <= 0 || enemy.shieldRadiusScale <= 0) return;
    const ctx = this.ctx;
    const radius = shield.radius * enemy.shieldRadiusScale;
    const rotation = shield.rotation;
    const hit = enemy.shieldHitFlash;
    const charge = clamp(enemy.shield / enemy.maxShield, 0, 1);

    ctx.save();
    ctx.translate(enemy.position.x, enemy.position.y + bob);
    ctx.globalAlpha = 0.045 + charge * 0.025 + hit * 0.18;
    ctx.fillStyle = shield.color;
    this.tracePolygon(ctx, 0, 0, radius, shield.sides, rotation);
    ctx.fill();

    ctx.globalAlpha = 0.38 + charge * 0.14 + hit * 0.4;
    ctx.strokeStyle = shield.color;
    ctx.lineWidth = 1.4 + hit * 3.2;
    this.tracePolygon(ctx, 0, 0, radius, shield.sides, rotation);
    ctx.stroke();

    if (hit > 0) {
      ctx.globalAlpha = hit * 0.82;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 + hit * 1.7;
      this.tracePolygon(ctx, 0, 0, radius - 2, shield.sides, rotation);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.22 + hit * 0.72;
    ctx.fillStyle = hit > 0.15 ? '#ffffff' : shield.color;
    for (let index = 0; index < shield.sides; index += 1) {
      const angle = rotation + index * Math.PI * 2 / shield.sides;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.5 + hit * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFloatingText(): void {
    const ctx = this.ctx;
    for (const text of this.engine.floatingTexts) {
      ctx.globalAlpha = clamp(text.life / 0.4, 0, 1);
      ctx.fillStyle = text.color;
      ctx.font = '800 13px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text.text, text.position.x, text.position.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawCore(): void {
    const ctx = this.ctx;
    const core = this.engine.path.pointAtDistance(this.engine.path.length - 54).position;
    const x = core.x;
    const y = core.y;
    const pulse = 1 + Math.sin(this.engine.elapsed * 3) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 5;
    this.polygon(0, 0, 38, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6c5ce7';
    this.polygon(0, 0, 21, 6, Math.PI / 6 + this.engine.elapsed * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private polygon(x: number, y: number, radius: number, sides: number, rotation: number): void {
    this.tracePolygon(this.ctx, x, y, radius, sides, rotation);
  }

  private tracePolygon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sides: number,
    rotation: number,
  ): void {
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + (index / sides) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
