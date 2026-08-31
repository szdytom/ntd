import {
  createBloomWebGLContext,
  MAX_SINGULARITY,
  MAX_SHIELD_DISTORTIONS,
  WebGLBloomPipeline,
  type ShieldDistortion,
  type SingularityDistortion,
  type SplitDistortion,
} from '../effects/bloom';
import { ECONOMY_BALANCE } from './balance';
import i18n from '../i18n';
import { DEFAULT_SIGNAL_ID, getSignalCapability, signalRegistry } from '../signals';
import { WORLD } from './config';
import { clamp, distanceSquared, seededNoise } from './math';
import { drawSignalBody, drawSignalShield, hexToRgb, traceRegularPolygon } from '../signals/visuals/canvas';
import {
  buildSuppressionLinkPoints,
  drawSuppressionCollapse,
  drawSuppressionSource,
  strokeSuppressionLink,
} from '../signals/visuals/suppression';
import { drawTowerBody, type TowerVisualOptions } from './tower-visuals';
import type { GameEngine } from './engine';
import type { Signal, Point, Projectile, SpaceRift, Tower } from './types';
import type { ProjectileRenderContext } from '../modules/types';

const DECORATIONS = [
  { x: 58, y: 43, color: '#ffcf4a', shape: 3, size: 8 },
  { x: 351, y: 55, color: '#00b894', shape: 4, size: 7 },
  { x: 724, y: 67, color: '#ff6b9d', shape: 3, size: 7 },
  { x: 1008, y: 89, color: '#6c5ce7', shape: 6, size: 8 },
  { x: 78, y: 480, color: '#00a8e8', shape: 4, size: 6 },
  { x: 194, y: 600, color: '#ff9f43', shape: 3, size: 8 },
  { x: 436, y: 588, color: '#ff6b9d', shape: 6, size: 7 },
  { x: 721, y: 585, color: '#00b894', shape: 4, size: 6 },
] as const;
const SPLIT_DISTORTION_COLOR = hexToRgb('#73e7f2');
const compareSignalY = (left: Signal, right: Signal): number => left.position.y - right.position.y;
const PAD_DASH = [5, 5];
const RANGE_DASH = [7, 7];
const NO_DASH: number[] = [];
const RIFT_COLLAPSE_DURATION = 0.5;

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
  private readonly activeSingularities: Projectile[] = [];
  private readonly singularityDistortions: SingularityDistortion[] = [];
  private readonly suppressionSources: Signal[] = [];
  private readonly orderedEnemies: Signal[] = [];
  private readonly lightningPoints: Point[] = [];
  private readonly riftLeftX: number[] = [];
  private readonly riftLeftY: number[] = [];
  private readonly riftRightX: number[] = [];
  private readonly riftRightY: number[] = [];
  private readonly shieldDistortions: ShieldDistortion[] = [];
  private readonly shieldDistortionPool: ShieldDistortion[] = [];
  private readonly shieldDistortionColors = new Map<string, ShieldDistortion['color']>();
  private readonly splitDistortion: SplitDistortion = {
    centerX: 0,
    centerY: 0,
    radius: 0,
    phase: 0,
    color: SPLIT_DISTORTION_COLOR,
  };
  private readonly towerVisualOptions: TowerVisualOptions = {
    color: '#6c5ce7',
    energyRatio: 1,
    level: 1,
    rotation: 0,
  };
  private readonly towerLabels = new Map<number, { level: number; label: string }>();
  private readonly signalBodyOptions = {
    type: DEFAULT_SIGNAL_ID,
    radius: 0,
    time: 0,
    travelAngle: 0,
    phase: 0,
    hitStrength: 0,
  };
  private readonly signalShieldVisualState = { charge: 0, radiusScale: 0, hitStrength: 0 };
  private readonly projectileRenderContext: ProjectileRenderContext = {
    ctx: null as unknown as CanvasRenderingContext2D,
    projectile: null as unknown as Projectile,
  };
  private riftSpaceConfigurationRevision = -1;
  private riftSpaceActive = false;

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
    this.collectFrameEntities();
    const ctx = this.ctx;
    const riftSpaceActive = this.hasEquippedRiftSpace() && this.engine.spaceRifts.length > 0;
    const bloomCtx = this.bloom?.beginFrame(this.offsetX, this.offsetY, this.scale, riftSpaceActive);
    const riftMaskCtx = this.bloom?.getRiftMaskContext() ?? null;
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
    this.drawSpaceRifts(bloomCtx ?? null, riftMaskCtx);
    this.drawSignalAuraSources(bloomCtx ?? null);
    this.drawSingularityFields(bloomCtx ?? null);
    this.drawTowerPads();
    this.drawSelectionRange();
    this.drawTowers();
    this.engine.effects.render(ctx, 'under-projectile', bloomCtx);
    this.drawProjectiles();
    this.engine.effects.render(ctx, 'projectile', bloomCtx);
    this.drawEnemies();
    this.drawSignalAuraLinks(bloomCtx ?? null);
    this.engine.effects.render(ctx, 'air', bloomCtx);
    this.drawFloatingText();
    this.drawCore();
    this.engine.effects.render(ctx, 'overlay', bloomCtx);

    ctx.restore();

    if (bloomCtx && this.bloom) {
      this.drawBloomSources(bloomCtx);
      this.bloom.render(
        this.scene,
        this.getShieldDistortions(),
        this.getSplitDistortion(),
        this.getSingularityDistortions(),
        this.engine.visualElapsed,
      );
    } else if (this.fallbackCtx) {
      this.fallbackCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.fallbackCtx.drawImage(this.scene, 0, 0);
    }
  }

  private hasEquippedRiftSpace(): boolean {
    const revision = this.engine.getViewSnapshot().revision;
    if (revision === this.riftSpaceConfigurationRevision) return this.riftSpaceActive;
    this.riftSpaceConfigurationRevision = revision;
    this.riftSpaceActive = this.engine.towers.some((tower) => tower.slots.some((moduleId) => (
      moduleId !== null && this.engine.modules.hasTag(moduleId, 'rift-space')
    )));
    return this.riftSpaceActive;
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

  private getShieldDistortions(): readonly ShieldDistortion[] {
    const distortions = this.shieldDistortions;
    distortions.length = 0;
    for (const candidate of this.engine.signals) {
      if (candidate.dead) continue;
      const shield = getSignalCapability(signalRegistry.require(candidate.type), 'shield');
      if (!shield || (candidate.shield <= 0 && candidate.shieldRippleAge >= 0.72)) continue;
      const index = distortions.length;
      if (index >= MAX_SHIELD_DISTORTIONS) break;
      let distortion = this.shieldDistortionPool[index];
      if (!distortion) {
        distortion = {
          centerX: 0,
          centerY: 0,
          radius: 0,
          radiusScale: 0,
          active: false,
          sides: 6,
          rotation: 0,
          hitStrength: 0,
          color: [0.27, 0.72, 1],
          rippleAge: 2,
          time: 0,
        };
        this.shieldDistortionPool.push(distortion);
      }
      const bob = Math.sin(this.engine.visualElapsed * 5 + candidate.id) * 2;
      const screenX = this.offsetX + candidate.position.x * this.scale;
      const screenY = this.offsetY + (candidate.position.y + bob) * this.scale;
      distortion.centerX = screenX * this.dpr;
      distortion.centerY = (this.cssHeight - screenY) * this.dpr;
      distortion.radius = shield.radius * this.scale * this.dpr;
      distortion.radiusScale = candidate.shieldRadiusScale;
      distortion.active = candidate.shield > 0;
      distortion.sides = shield.sides;
      // Canvas Y coordinates point down, while WebGL screen coordinates point up.
      distortion.rotation = -shield.rotation;
      distortion.hitStrength = candidate.shieldHitFlash;
      let color = this.shieldDistortionColors.get(shield.color);
      if (!color) {
        color = hexToRgb(shield.color);
        this.shieldDistortionColors.set(shield.color, color);
      }
      distortion.color = color;
      distortion.rippleAge = candidate.shieldRippleAge;
      distortion.time = this.engine.visualElapsed;
      distortions.push(distortion);
    }
    return distortions;
  }

  private getSplitDistortion(): SplitDistortion | null {
    const rifts = this.engine.getSplitRifts();
    const rift = rifts[rifts.length - 1];
    if (!rift) return null;
    const screenX = this.offsetX + rift.position.x * this.scale;
    const screenY = this.offsetY + rift.position.y * this.scale;
    const distortion = this.splitDistortion;
    distortion.centerX = screenX * this.dpr;
    distortion.centerY = (this.cssHeight - screenY) * this.dpr;
    distortion.radius = 120 * this.scale * this.dpr;
    distortion.phase = clamp(rift.age / rift.duration, 0, 1);
    return distortion;
  }

  private collectFrameEntities(): void {
    this.activeSingularities.length = 0;
    for (const projectile of this.engine.projectiles) {
      if (
        projectile.behavior === 'static'
        && projectile.shot.source === 'singularity'
        && projectile.age >= (projectile.shot.static?.armTime ?? 0)
        && projectile.life > 0
      ) this.activeSingularities.push(projectile);
    }

    this.suppressionSources.length = 0;
    this.orderedEnemies.length = 0;
    for (const signal of this.engine.signals) {
      this.orderedEnemies.push(signal);
      if (!signal.dead && getSignalCapability(signalRegistry.require(signal.type), 'tower-suppression-aura')) this.suppressionSources.push(signal);
    }
    this.orderedEnemies.sort(compareSignalY);
  }

  private getSingularityDistortions(): SingularityDistortion[] {
    const start = Math.max(0, this.activeSingularities.length - MAX_SINGULARITY);
    const count = this.activeSingularities.length - start;
    for (let index = 0; index < count; index += 1) {
      const projectile = this.activeSingularities[start + index];
      if (!projectile) continue;
      const screenX = this.offsetX + projectile.position.x * this.scale;
      const screenY = this.offsetY + projectile.position.y * this.scale;
      const armTime = projectile.shot.static?.armTime ?? 0;
      const fadeIn = clamp((projectile.age - armTime) / 0.28, 0, 1);
      const fadeOut = clamp(projectile.life / 0.4, 0, 1);
      let distortion = this.singularityDistortions[index];
      if (!distortion) {
        distortion = { centerX: 0, centerY: 0, radius: 0, strength: 0 };
        this.singularityDistortions[index] = distortion;
      }
      distortion.centerX = screenX * this.dpr;
      distortion.centerY = (this.cssHeight - screenY) * this.dpr;
      distortion.radius = 72 * this.scale * this.dpr;
      distortion.strength = fadeIn * fadeOut;
    }
    this.singularityDistortions.length = count;
    return this.singularityDistortions;
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
      const isSingularity = projectile.behavior === 'static' && projectile.shot.source === 'singularity';
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
      const renderContext = this.projectileRenderContext;
      renderContext.ctx = ctx;
      renderContext.projectile = projectile;
      if (this.engine.modules.renderProjectileBloom(projectile.modules, renderContext)) continue;
      if (isSingularity) {
        ctx.globalAlpha = 0.34 * staticPulse;
        ctx.strokeStyle = '#6f4ad8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        continue;
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

    for (const signal of this.engine.signals) {
      const shield = getSignalCapability(signalRegistry.require(signal.type), 'shield');
      if (!shield || signal.shield <= 0 || signal.dead) continue;
      const radius = shield.radius * signal.shieldRadiusScale;
      const bob = Math.sin(this.engine.visualElapsed * 5 + signal.id) * 2;
      ctx.globalAlpha = 0.045 + signal.shieldHitFlash * 0.34;
      ctx.fillStyle = shield.color;
      traceRegularPolygon(ctx, signal.position.x, signal.position.y + bob, radius, shield.sides, shield.rotation);
      ctx.fill();
    }

    ctx.globalAlpha = 0.3 + Math.sin(this.engine.visualElapsed * 3) * 0.08;
    ctx.fillStyle = '#6c5ce7';
    ctx.beginPath();
    const core = this.engine.getCorePosition();
    ctx.arc(core.x, core.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSpaceRifts(
    bloomCtx: CanvasRenderingContext2D | null,
    riftMaskCtx: CanvasRenderingContext2D | null,
  ): void {
    const time = this.engine.visualElapsed;

    this.ctx.save();
    this.ctx.lineCap = 'butt';
    this.ctx.lineJoin = 'miter';
    if (bloomCtx) {
      bloomCtx.save();
      bloomCtx.globalCompositeOperation = 'lighter';
      bloomCtx.lineCap = 'butt';
      bloomCtx.lineJoin = 'miter';
    }
    for (const rift of this.engine.spaceRifts) {
      if (rift.points.length < 2) continue;
      const collapse = rift.source.life > 0 ? 1 : clamp(rift.remaining / RIFT_COLLAPSE_DURATION, 0, 1);
      if (collapse <= 0) continue;
      const pointCount = this.buildRiftEdges(rift, time, collapse);
      this.drawRiftEjectionParticles(rift, time, collapse, bloomCtx);

      this.ctx.globalAlpha = 0.22;
      this.ctx.strokeStyle = rift.color;
      this.ctx.lineWidth = 7;
      this.traceRiftEdge(this.ctx, this.riftLeftX, this.riftLeftY, pointCount);
      this.traceRiftEdge(this.ctx, this.riftRightX, this.riftRightY, pointCount);
      this.ctx.globalAlpha = 0.82;
      this.ctx.strokeStyle = '#d9b8f4';
      this.ctx.lineWidth = 3.1;
      this.traceRiftEdge(this.ctx, this.riftLeftX, this.riftLeftY, pointCount);
      this.traceRiftEdge(this.ctx, this.riftRightX, this.riftRightY, pointCount);
      this.ctx.globalAlpha = 0.98;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.6;
      this.traceRiftEdge(this.ctx, this.riftLeftX, this.riftLeftY, pointCount);
      this.traceRiftEdge(this.ctx, this.riftRightX, this.riftRightY, pointCount);
      this.ctx.globalAlpha = 0.30;
      this.ctx.strokeStyle = rift.color;
      this.ctx.lineWidth = 2;
      this.traceRiftBranches(this.ctx, this.riftLeftX, this.riftLeftY, pointCount, rift, 1, collapse);
      this.traceRiftBranches(this.ctx, this.riftRightX, this.riftRightY, pointCount, rift, -1, collapse);
      this.ctx.globalAlpha = 0.92;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 0.8;
      this.traceRiftBranches(this.ctx, this.riftLeftX, this.riftLeftY, pointCount, rift, 1, collapse);
      this.traceRiftBranches(this.ctx, this.riftRightX, this.riftRightY, pointCount, rift, -1, collapse);

      if (!bloomCtx) continue;
      bloomCtx.globalAlpha = 0.38;
      bloomCtx.strokeStyle = rift.color;
      bloomCtx.lineWidth = 5.5;
      this.traceRiftEdge(bloomCtx, this.riftLeftX, this.riftLeftY, pointCount);
      this.traceRiftEdge(bloomCtx, this.riftRightX, this.riftRightY, pointCount);
      bloomCtx.globalAlpha = 0.84;
      bloomCtx.strokeStyle = '#f3ddff';
      bloomCtx.lineWidth = 1.2;
      this.traceRiftEdge(bloomCtx, this.riftLeftX, this.riftLeftY, pointCount);
      this.traceRiftEdge(bloomCtx, this.riftRightX, this.riftRightY, pointCount);
      bloomCtx.globalAlpha = 0.52;
      bloomCtx.strokeStyle = rift.color;
      bloomCtx.lineWidth = 1.7;
      this.traceRiftBranches(bloomCtx, this.riftLeftX, this.riftLeftY, pointCount, rift, 1, collapse);
      this.traceRiftBranches(bloomCtx, this.riftRightX, this.riftRightY, pointCount, rift, -1, collapse);
    }
    this.ctx.restore();
    if (bloomCtx) bloomCtx.restore();

    this.ctx.save();
    this.ctx.fillStyle = bloomCtx ? '#07050c' : '#35105e';
    if (bloomCtx) {
      bloomCtx.save();
      bloomCtx.globalCompositeOperation = 'destination-out';
      bloomCtx.fillStyle = '#000000';
    }
    if (riftMaskCtx) {
      riftMaskCtx.save();
      riftMaskCtx.fillStyle = '#ffffff';
    }
    for (const rift of this.engine.spaceRifts) {
      if (rift.points.length < 2) continue;
      const collapse = rift.source.life > 0 ? 1 : clamp(rift.remaining / RIFT_COLLAPSE_DURATION, 0, 1);
      if (collapse <= 0) continue;
      const pointCount = this.buildRiftEdges(rift, time, collapse);

      this.ctx.globalAlpha = 0.96;
      this.traceRiftInterior(this.ctx, pointCount);
      this.ctx.fill();

      if (!bloomCtx) continue;
      bloomCtx.globalAlpha = 1;
      this.traceRiftInterior(bloomCtx, pointCount);
      bloomCtx.fill();

      if (!riftMaskCtx) continue;
      riftMaskCtx.globalAlpha = 1;
      this.traceRiftInterior(riftMaskCtx, pointCount);
      riftMaskCtx.fill();
    }
    this.ctx.restore();
    if (bloomCtx) bloomCtx.restore();
    if (riftMaskCtx) riftMaskCtx.restore();
  }

  private buildRiftEdges(rift: SpaceRift, time: number, collapse: number): number {
    const pointCount = rift.points.length;
    this.riftLeftX.length = pointCount;
    this.riftLeftY.length = pointCount;
    this.riftRightX.length = pointCount;
    this.riftRightY.length = pointCount;
    for (let index = 0; index < pointCount; index += 1) {
      const point = rift.points[index];
      const previous = rift.points[Math.max(0, index - 1)];
      const next = rift.points[Math.min(pointCount - 1, index + 1)];
      if (!point || !previous || !next) continue;
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const length = Math.hypot(dx, dy) || 1;
      const normalX = -dy / length;
      const normalY = dx / length;
      const leftNoise = seededNoise(rift.id * 977 + index * 71);
      const rightNoise = seededNoise(rift.id * 557 + index * 101);
      const wavePhase = seededNoise(rift.id * 313 + index * 37) * Math.PI * 2;
      const waveSpeed = 1.35 + seededNoise(rift.id * 149 + index * 29) * 0.9;
      const wave = Math.sin(time * waveSpeed + wavePhase) * 0.35;
      const endpointScale = index === 0 || index === pointCount - 1
        ? 0
        : index === 1 || index === pointCount - 2 ? 0.68 : 1;
      const leftWidth = Math.max(0.4, rift.width * (0.45 + leftNoise * 0.12) + wave)
        * endpointScale * collapse;
      const rightWidth = Math.max(0.4, rift.width * (0.45 + rightNoise * 0.12) - wave * 0.7)
        * endpointScale * collapse;
      const centerX = point.x;
      const centerY = point.y;
      this.riftLeftX[index] = centerX + normalX * leftWidth;
      this.riftLeftY[index] = centerY + normalY * leftWidth;
      this.riftRightX[index] = centerX - normalX * rightWidth;
      this.riftRightY[index] = centerY - normalY * rightWidth;
    }
    return pointCount;
  }

  private traceRiftEdge(
    ctx: CanvasRenderingContext2D,
    xPoints: readonly number[],
    yPoints: readonly number[],
    pointCount: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(xPoints[0] ?? 0, yPoints[0] ?? 0);
    for (let index = 1; index < pointCount; index += 1) {
      ctx.lineTo(xPoints[index] ?? 0, yPoints[index] ?? 0);
    }
    ctx.stroke();
  }

  private traceRiftBranches(
    ctx: CanvasRenderingContext2D,
    xPoints: readonly number[],
    yPoints: readonly number[],
    pointCount: number,
    rift: SpaceRift,
    side: 1 | -1,
    collapse: number,
  ): void {
    ctx.beginPath();
    for (let index = 4; index < pointCount - 3; index += 7) {
      const branchNoise = seededNoise(rift.id * 401 + index * 83 + side * 37);
      if (branchNoise < 0.43) continue;
      const previousX = xPoints[index - 1];
      const previousY = yPoints[index - 1];
      const startX = xPoints[index];
      const startY = yPoints[index];
      const nextX = xPoints[index + 1];
      const nextY = yPoints[index + 1];
      if (
        previousX === undefined || previousY === undefined || startX === undefined || startY === undefined
        || nextX === undefined || nextY === undefined
      ) continue;
      const tangentX = nextX - previousX;
      const tangentY = nextY - previousY;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const unitX = tangentX / tangentLength;
      const unitY = tangentY / tangentLength;
      const outwardX = -unitY * side;
      const outwardY = unitX * side;
      const reach = (4.5 + branchNoise * 7) * collapse;
      const along = (seededNoise(rift.id * 719 + index * 47) - 0.5) * 6 * collapse;
      const jointX = startX + outwardX * reach * 0.58 + unitX * along * 0.35;
      const jointY = startY + outwardY * reach * 0.58 + unitY * along * 0.35;
      const endX = startX + outwardX * reach + unitX * along;
      const endY = startY + outwardY * reach + unitY * along;
      ctx.moveTo(startX, startY);
      ctx.lineTo(jointX, jointY);
      ctx.lineTo(endX, endY);
      const splitNoise = seededNoise(rift.id * 863 + index * 59 + side * 19);
      if (splitNoise < 0.61) continue;
      const forkLength = (2.5 + splitNoise * 3.5) * collapse;
      ctx.moveTo(jointX, jointY);
      ctx.lineTo(
        jointX + outwardX * forkLength + unitX * forkLength * (splitNoise - 0.5),
        jointY + outwardY * forkLength + unitY * forkLength * (splitNoise - 0.5),
      );
    }
    ctx.stroke();
  }

  private drawRiftEjectionParticles(
    rift: SpaceRift,
    time: number,
    collapse: number,
    bloomCtx: CanvasRenderingContext2D | null,
  ): void {
    this.ctx.lineCap = 'round';
    if (bloomCtx) bloomCtx.lineCap = 'round';
    let particleCount = 0;
    for (let index = 3; index < rift.points.length - 2 && particleCount < 28; index += 5) {
      const point = rift.points[index];
      const previous = rift.points[index - 1];
      const next = rift.points[index + 1];
      if (!point || !previous || !next) continue;
      particleCount += 1;
      const tangentX = next.x - previous.x;
      const tangentY = next.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const normalX = -tangentY / tangentLength;
      const normalY = tangentX / tangentLength;
      const seed = seededNoise(rift.id * 947 + index * 73);
      const side = seededNoise(rift.id * 631 + index * 41) < 0.5 ? -1 : 1;
      const spread = (seededNoise(rift.id * 353 + index * 97) - 0.5) * 0.5;
      const baseAngle = Math.atan2(normalY * side, normalX * side) + spread;
      const directionX = Math.cos(baseAngle);
      const directionY = Math.sin(baseAngle);
      const phase = (time / 0.78 + seed * 2.7) % 1;
      const remaining = 1 - phase;
      const travel = (20 + seed * 28) * (1 - remaining * remaining * remaining);
      const originOffset = rift.width * (0.04 + seed * 0.10);
      const originX = point.x + directionX * originOffset;
      const originY = point.y + directionY * originOffset;
      const x = originX + directionX * travel;
      const y = originY + directionY * travel;
      const streak = 2.2 + remaining * remaining * 7.5;
      const fadeIn = Math.min(1, phase * 10);
      const alpha = fadeIn * remaining * remaining * collapse;
      if (alpha <= 0.01) continue;

      this.ctx.globalAlpha = alpha * 0.88;
      this.ctx.strokeStyle = '#3b0b63';
      this.ctx.lineWidth = 1 + remaining * 0.8;
      this.ctx.beginPath();
      this.ctx.moveTo(x - directionX * streak, y - directionY * streak);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.ctx.fillStyle = '#30084f';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.1 + remaining * 0.75, 0, Math.PI * 2);
      this.ctx.fill();

      if (!bloomCtx) continue;
      bloomCtx.globalAlpha = alpha * 0.22;
      bloomCtx.strokeStyle = '#6d2ca5';
      bloomCtx.lineWidth = 2 + remaining;
      bloomCtx.beginPath();
      bloomCtx.moveTo(x - directionX * streak, y - directionY * streak);
      bloomCtx.lineTo(x, y);
      bloomCtx.stroke();
      bloomCtx.fillStyle = '#6d2ca5';
      bloomCtx.beginPath();
      bloomCtx.arc(x, y, 1.7 + remaining * 0.7, 0, Math.PI * 2);
      bloomCtx.fill();
    }
    this.ctx.lineCap = 'butt';
    if (bloomCtx) bloomCtx.lineCap = 'butt';
  }

  private traceRiftInterior(ctx: CanvasRenderingContext2D, pointCount: number): void {
    ctx.beginPath();
    ctx.moveTo(this.riftLeftX[0] ?? 0, this.riftLeftY[0] ?? 0);
    for (let index = 1; index < pointCount; index += 1) {
      ctx.lineTo(this.riftLeftX[index] ?? 0, this.riftLeftY[index] ?? 0);
    }
    for (let index = pointCount - 1; index >= 0; index -= 1) {
      ctx.lineTo(this.riftRightX[index] ?? 0, this.riftRightY[index] ?? 0);
    }
    ctx.closePath();
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
    for (const edge of this.engine.level.graph.edges) {
      const start = this.engine.level.graph.nodes.get(edge.from)?.position;
      const end = this.engine.level.graph.nodes.get(edge.to)?.position;
      if (!start || !end) continue;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
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
    for (const edge of this.engine.level.graph.edges) {
      const start = this.engine.level.graph.nodes.get(edge.from)?.position;
      const end = this.engine.level.graph.nodes.get(edge.to)?.position;
      if (!start || !end) continue;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const arrowGap = 105;
      for (let arrowDistance = 46; arrowDistance < edge.length - 28; arrowDistance += arrowGap) {
        const progress = arrowDistance / edge.length;
        ctx.save();
        ctx.translate(
          start.x + (end.x - start.x) * progress,
          start.y + (end.y - start.y) * progress,
        );
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-5, -7);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-5, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    for (const node of this.engine.level.graph.nodes.values()) {
      if (node.children.length < 2) continue;
      ctx.fillStyle = '#f8f7fb';
      ctx.strokeStyle = '#b8b5c6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    for (const entrance of this.engine.level.graph.entrances) {
      const marker = this.engine.routeFor(entrance).pointAtDistance(42);
      ctx.save();
      ctx.translate(marker.position.x, marker.position.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd447';
      ctx.strokeStyle = '#312d48';
      ctx.lineWidth = 2;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawDecorations(): void {
    const ctx = this.ctx;
    for (const bit of DECORATIONS) {
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
      let occupied = false;
      for (const tower of this.engine.towers) {
        if (tower.padIndex !== index) continue;
        occupied = true;
        break;
      }
      if (occupied) continue;
      const pad = this.engine.level.towerPads[index];
      if (!pad) continue;
      const hovered = this.engine.pointer ? distanceSquared(this.engine.pointer, pad) < 38 * 38 : false;
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
      ctx.setLineDash(PAD_DASH);
      ctx.beginPath();
      ctx.arc(0, 0, 29, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash(NO_DASH);
      ctx.strokeStyle = hovered ? '#6c5ce7' : '#aaa7b8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
      if (hovered) {
        ctx.fillStyle = '#332f48';
        ctx.font = '700 11px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.engine.mode === 'creative' ? i18n.t('canvas.unlimitedShards') : `${ECONOMY_BALANCE.towerCost} ◇`, 0, 48);
      }
      ctx.restore();
    }
  }

  private drawSelectionRange(): void {
    let hoveredTower: Tower | null = null;
    if (this.engine.pointer) {
      for (const candidate of this.engine.towers) {
        if (distanceSquared(candidate.position, this.engine.pointer) >= 35 * 35) continue;
        hoveredTower = candidate;
        break;
      }
    }
    const tower = hoveredTower ?? this.engine.getSelectedTower();
    if (!tower) return;
    const ctx = this.ctx;
    const pulse = Math.sin(this.engine.visualElapsed * 3) * 2;
    ctx.save();
    ctx.fillStyle = hoveredTower ? 'rgba(108, 92, 231, 0.045)' : 'rgba(108, 92, 231, 0.025)';
    ctx.strokeStyle = hoveredTower ? 'rgba(108, 92, 231, 0.48)' : 'rgba(108, 92, 231, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash(RANGE_DASH);
    ctx.beginPath();
    ctx.arc(tower.position.x, tower.position.y, tower.range + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawSignalAuraSources(bloomCtx: CanvasRenderingContext2D | null): void {
    const sources = this.suppressionSources;
    if (sources.length === 0) return;
    const ctx = this.ctx;

    for (const source of sources) {
      const aura = getSignalCapability(signalRegistry.require(source.type), 'tower-suppression-aura');
      if (!aura) continue;
      drawSuppressionSource(ctx, source.position, source.radius, aura, this.engine.visualElapsed, source.id, false);
      if (bloomCtx) drawSuppressionSource(bloomCtx, source.position, source.radius, aura, this.engine.visualElapsed, source.id, true);
    }
  }

  private drawSignalAuraLinks(bloomCtx: CanvasRenderingContext2D | null): void {
    const sources = this.suppressionSources;
    if (sources.length === 0) return;
    const ctx = this.ctx;
    const time = this.engine.visualElapsed;
    const points = this.lightningPoints;
    for (const tower of this.engine.towers) {
      let source: Signal | null = null;
      let nearestDistanceSquared = Number.POSITIVE_INFINITY;
      for (const candidate of sources) {
        const aura = getSignalCapability(signalRegistry.require(candidate.type), 'tower-suppression-aura');
        if (!aura) continue;
        const deltaX = tower.position.x - candidate.position.x;
        const deltaY = tower.position.y - candidate.position.y;
        const distSquared = deltaX * deltaX + deltaY * deltaY;
        const radiusSquared = aura.radius * aura.radius;
        if (distSquared > radiusSquared || distSquared >= nearestDistanceSquared) continue;
        source = candidate;
        nearestDistanceSquared = distSquared;
      }
      if (!source) continue;
      const aura = getSignalCapability(signalRegistry.require(source.type), 'tower-suppression-aura');
      if (!aura) continue;
      buildSuppressionLinkPoints(
        source.position,
        tower.position,
        source.id,
        tower.id,
        Math.floor(time * 22),
        points,
      );
      strokeSuppressionLink(ctx, points, aura, false);
      drawSuppressionCollapse(ctx, tower.position, tower.id, time, false);
      if (bloomCtx) {
        strokeSuppressionLink(bloomCtx, points, aura, true);
        drawSuppressionCollapse(bloomCtx, tower.position, tower.id, time, true);
      }
    }
  }

  private drawSingularityFields(bloomCtx: CanvasRenderingContext2D | null): void {
    for (const projectile of this.activeSingularities) {
      this.drawSingularityParticles(this.ctx, projectile, false);
      if (bloomCtx) this.drawSingularityParticles(bloomCtx, projectile, true);
    }
  }

  private drawSingularityParticles(
    ctx: CanvasRenderingContext2D,
    projectile: Projectile,
    emissive: boolean,
  ): void {
    const fieldRadius = projectile.shot.static?.gravity?.radius ?? 150;
    const armTime = projectile.shot.static?.armTime ?? 0;
    const lifeFade = Math.min(
      clamp((projectile.age - armTime) / 0.22, 0, 1),
      clamp(projectile.life / 0.35, 0, 1),
    );
    const time = this.engine.visualElapsed;
    ctx.save();
    ctx.lineCap = 'round';
    if (emissive) ctx.globalCompositeOperation = 'lighter';

    for (let index = 0; index < 18; index += 1) {
      const seed = projectile.id * 409 + index * 67;
      const speed = 0.34 + seededNoise(seed + 3) * 0.22;
      const phase = (time * speed + seededNoise(seed + 7)) % 1;
      const previousPhase = Math.max(0, phase - (0.025 + phase * 0.055));
      const outerRadius = fieldRadius * (0.72 + seededNoise(seed + 11) * 0.26);
      const innerRadius = 14 + seededNoise(seed + 13) * 5;
      const acceleration = phase * phase * phase;
      const previousAcceleration = previousPhase * previousPhase * previousPhase;
      const radius = outerRadius - (outerRadius - innerRadius) * acceleration;
      const previousRadius = outerRadius - (outerRadius - innerRadius) * previousAcceleration;
      const baseAngle = seededNoise(seed + 17) * Math.PI * 2;
      const curl = (seededNoise(seed + 19) - 0.5) * 1.3;
      const angle = baseAngle + curl * phase * phase;
      const previousAngle = baseAngle + curl * previousPhase * previousPhase;
      const alpha = clamp(phase / 0.1, 0, 1) * clamp((1 - phase) / 0.08, 0, 1) * lifeFade;
      const x = projectile.position.x + Math.cos(angle) * radius;
      const y = projectile.position.y + Math.sin(angle) * radius;
      const previousX = projectile.position.x + Math.cos(previousAngle) * previousRadius;
      const previousY = projectile.position.y + Math.sin(previousAngle) * previousRadius;

      ctx.globalAlpha = alpha * (emissive ? 0.72 : 0.88);
      ctx.strokeStyle = index % 3 === 0 ? '#ffffff' : index % 2 === 0 ? '#cbb8ff' : '#6f4ad8';
      ctx.lineWidth = emissive ? 3.8 : 0.8 + acceleration * 2.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(previousX, previousY);
      ctx.stroke();

      if (!emissive && index % 3 === 0) {
        const size = 1.8 + acceleration * 2.6;
        ctx.globalAlpha = alpha * 0.78;
        ctx.fillStyle = index % 2 === 0 ? '#160d2b' : '#6f4ad8';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + time * (0.8 + seededNoise(seed + 23)));
        ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
        ctx.restore();
      }
    }

    ctx.globalAlpha = (emissive ? 0.32 : 0.24) * lifeFade;
    ctx.strokeStyle = emissive ? '#6f4ad8' : '#cbb8ff';
    ctx.lineWidth = emissive ? 4 : 1;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, 26 + Math.sin(time * 3.4) * 2, 0, Math.PI * 2);
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
    let programHasProjectile = false;
    for (const id of tower.slots) {
      if (!id || this.engine.modules.get(id)?.kind !== 'projectile') continue;
      programHasProjectile = true;
      break;
    }
    let labelRecord = this.towerLabels.get(tower.id);
    if (!labelRecord || labelRecord.level !== tower.level) {
      labelRecord = {
        level: tower.level,
        label: i18n.t('canvas.towerLabel', { id: String(tower.id).padStart(2, '0'), level: tower.level }),
      };
      this.towerLabels.set(tower.id, labelRecord);
    }
    const options = this.towerVisualOptions;
    options.color = color;
    options.selected = selected;
    options.energyRatio = tower.energy / tower.maxEnergy;
    options.level = tower.level;
    options.rotation = tower.rotation;
    options.flash = tower.flash;
    options.programHasProjectile = programHasProjectile;
    options.label = labelRecord.label;
    ctx.save();
    ctx.translate(tower.position.x, tower.position.y);
    drawTowerBody(ctx, options);
    ctx.restore();
  }

  private drawProjectiles(): void {
    const ctx = this.ctx;
    const renderContext = this.projectileRenderContext;
    renderContext.ctx = ctx;
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
      renderContext.projectile = projectile;
      this.engine.modules.renderProjectile(projectile.modules, renderContext);
    }
  }

  private drawEnemies(): void {
    for (const signal of this.orderedEnemies) this.drawSignal(signal);
  }

  private drawSignal(signal: Signal): void {
    const ctx = this.ctx;
    const definition = signalRegistry.require(signal.type);
    const shield = getSignalCapability(definition, 'shield');
    const bob = Math.sin(this.engine.elapsed * 5 + signal.id) * 2;
    const bodyOptions = this.signalBodyOptions;
    bodyOptions.type = signal.type;
    bodyOptions.radius = signal.radius;
    bodyOptions.time = this.engine.elapsed;
    bodyOptions.travelAngle = signal.angle;
    bodyOptions.phase = signal.id * 0.17;
    bodyOptions.hitStrength = signal.hitFlash;
    ctx.save();
    ctx.translate(signal.position.x, signal.position.y + bob);
    drawSignalBody(ctx, bodyOptions);
    ctx.restore();

    if (shield) {
      const shieldState = this.signalShieldVisualState;
      shieldState.charge = signal.maxShield > 0 ? signal.shield / signal.maxShield : 0;
      shieldState.radiusScale = signal.shieldRadiusScale;
      shieldState.hitStrength = signal.shieldHitFlash;
      ctx.save();
      ctx.translate(signal.position.x, signal.position.y + bob);
      drawSignalShield(ctx, shield, shieldState);
      ctx.restore();
    }

    const barWidth = signal.radius * 2.15;
    const barY = signal.position.y - signal.radius - 10 + bob;
    if (signal.maxShield > 0) {
      ctx.fillStyle = 'rgba(49,45,67,0.1)';
      ctx.beginPath();
      ctx.roundRect(signal.position.x - barWidth / 2, barY - 7, barWidth, 3, 1.5);
      ctx.fill();
      ctx.fillStyle = shield?.color ?? '#45b7ff';
      ctx.beginPath();
      ctx.roundRect(
        signal.position.x - barWidth / 2,
        barY - 7,
        barWidth * clamp(signal.shield / signal.maxShield, 0, 1),
        3,
        1.5,
      );
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(49,45,67,0.12)';
    ctx.beginPath();
    ctx.roundRect(signal.position.x - barWidth / 2, barY, barWidth, 4, 2);
    ctx.fill();
    ctx.fillStyle = signal.slowTime > 0 ? '#00a8e8' : definition.visual.color;
    ctx.beginPath();
    ctx.roundRect(signal.position.x - barWidth / 2, barY, barWidth * clamp(signal.hp / signal.maxHp, 0, 1), 4, 2);
    ctx.fill();

    if (signal.slowTime > 0) {
      ctx.strokeStyle = 'rgba(0,168,232,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(signal.position.x, signal.position.y + bob, signal.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let index = 0; index < signal.statuses.length; index += 1) {
      const status = signal.statuses[index];
      if (!status) continue;
      const radius = signal.radius + 7 + index * 4;
      ctx.strokeStyle = status.color;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        signal.position.x,
        signal.position.y + bob,
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
          signal.position.x + Math.cos(angle) * radius,
          signal.position.y + bob + Math.sin(angle) * radius,
          2.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
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
    const core = this.engine.getCorePosition();
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
    traceRegularPolygon(this.ctx, x, y, radius, sides, rotation);
  }

}
