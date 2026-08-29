import { useEffect, useRef } from 'react';
import {
  createBloomWebGLContext,
  type ShieldDistortion,
  type SplitDistortion,
  WebGLBloomPipeline,
} from '../effects/bloom';
import { EffectEngine } from '../effects/engine';
import { GAME_EFFECT_IDS, gameEffects } from '../effects/game-effects';
import { ENEMIES } from '../game/config';
import { drawEnemyBody, drawEnemyShield, hexToRgb } from '../game/enemy-visuals';
import { FRACTURE_RIPPLE_DURATION, FRACTURE_SPLIT_DELAY } from '../game/engine';
import { drawSuppressionLink, drawSuppressionSource } from '../game/suppression-visuals';
import { drawTowerBody } from '../game/tower-visuals';
import type { EnemyType } from '../game/types';
import { drawProjectileGlow } from '../modules/render-utils';
import {
  advanceArchiveShieldCycle,
  archiveShieldProjectileProgress,
  createArchiveShieldCycle,
} from './enemy-specimen-cycle';
import './EnemySpecimen.css';

const PREVIEW_WORLD_SIZE = 280;

function drawArchiveField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fbfafe';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = `${color}0d`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0.5; x < width; x += 24) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0.5; y < height; y += 24) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  const centerX = width / 2;
  const centerY = height / 2;
  const glowRadius = Math.min(width, height) * 0.5;
  const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
  glow.addColorStop(0, `${color}1f`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = `${color}47`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, height * 0.12);
  ctx.lineTo(centerX, height * 0.88);
  ctx.moveTo(width * 0.12, centerY);
  ctx.lineTo(width * 0.88, centerY);
  ctx.stroke();
}

function drawShieldProjectile(
  ctx: CanvasRenderingContext2D,
  bloomCtx: CanvasRenderingContext2D | undefined,
  progress: number,
  shieldRadius: number,
): void {
  const startX = -132;
  const startY = -24;
  const targetX = -shieldRadius * Math.cos(Math.PI / 6) - 3;
  const targetY = 0;
  const x = startX + (targetX - startX) * progress;
  const y = startY + (targetY - startY) * progress;
  const angle = Math.atan2(targetY - startY, targetX - startX);
  const color = '#6c5ce7';

  ctx.save();
  ctx.fillStyle = color;
  for (let index = 5; index >= 1; index -= 1) {
    const distance = index * 5;
    ctx.globalAlpha = (1 - index / 6) * 0.24;
    ctx.beginPath();
    ctx.arc(
      x - Math.cos(angle) * distance,
      y - Math.sin(angle) * distance,
      Math.max(1.2, 4.8 - index * 0.55),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
  drawProjectileGlow(ctx, x, y, 4.8, color);
  if (bloomCtx) drawProjectileGlow(bloomCtx, x, y, 5.6, color);
}

export function EnemySpecimen({
  type,
  label,
  fractureSplit,
  radiantSuppression,
}: {
  type: EnemyType;
  label: string;
  fractureSplit: boolean;
  radiantSuppression: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const scene = document.createElement('canvas');
    const sceneCtx = scene.getContext('2d', { alpha: true });
    if (!sceneCtx) return undefined;
    const gl = createBloomWebGLContext(canvas);
    const pipeline = gl ? new WebGLBloomPipeline(canvas, gl) : null;
    const fallbackCtx = pipeline ? null : canvas.getContext('2d');
    if (!pipeline && !fallbackCtx) return undefined;
    const config = ENEMIES[type];
    const effects = new EffectEngine().registerMany(gameEffects);
    const shield = config.shield;
    let animationFrame = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    let renderWidth = 0;
    let renderHeight = 0;
    let renderScale = 0;
    const shieldCycle = createArchiveShieldCycle();

    if (type === 'fracture' && fractureSplit) {
      effects.spawn(GAME_EFFECT_IDS.fractureSplitRipple, {
        position: { x: 0, y: 0 },
        color: '#73e7f2',
      });
    }

    const spawnShieldEffect = (id: typeof GAME_EFFECT_IDS.shieldHit | typeof GAME_EFFECT_IDS.shieldBreak | typeof GAME_EFFECT_IDS.shieldRestore): void => {
      if (!shield) return;
      effects.spawn(id, {
        position: { x: 0, y: 0 },
        rotation: shield.rotation,
        color: shield.color,
        data: { radius: shield.radius, sides: shield.sides },
      });
    };

    const updateCrownShield = (delta: number): void => {
      if (!shield) return;
      const event = advanceArchiveShieldCycle(shieldCycle, delta);
      if (event === 'hit') spawnShieldEffect(GAME_EFFECT_IDS.shieldHit);
      if (event === 'break') spawnShieldEffect(GAME_EFFECT_IDS.shieldBreak);
      if (event === 'restore') spawnShieldEffect(GAME_EFFECT_IDS.shieldRestore);
    };

    const draw = (now: number): void => {
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += delta;
      effects.update(delta);
      if (type === 'crown') updateCrownShield(delta);

      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      if (cssWidth !== renderWidth || cssHeight !== renderHeight || deviceScale !== renderScale) {
        renderWidth = cssWidth;
        renderHeight = cssHeight;
        renderScale = deviceScale;
        if (pipeline) pipeline.resize(cssWidth, cssHeight, deviceScale);
        else {
          canvas.width = Math.max(1, Math.round(cssWidth * deviceScale));
          canvas.height = Math.max(1, Math.round(cssHeight * deviceScale));
        }
        scene.width = canvas.width;
        scene.height = canvas.height;
      }
      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;
      const worldScale = Math.min(cssWidth, cssHeight) / PREVIEW_WORLD_SIZE;
      sceneCtx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      drawArchiveField(sceneCtx, cssWidth, cssHeight, config.color);
      sceneCtx.save();
      sceneCtx.translate(centerX, centerY);
      sceneCtx.scale(worldScale, worldScale);
      const bloomCtx = pipeline?.beginFrame(centerX, centerY, worldScale);

      effects.render(sceneCtx, 'ground', bloomCtx);
      effects.render(sceneCtx, 'under-projectile', bloomCtx);
      effects.render(sceneCtx, 'projectile', bloomCtx);

      const suppressionSource = { x: -48, y: -18 };
      const suppressionTarget = { x: 58, y: 20 };
      const showingSuppression = type === 'radiant' && radiantSuppression && Boolean(config.aura);
      if (showingSuppression && config.aura) {
        drawSuppressionSource(sceneCtx, suppressionSource, config.radius, config.aura, elapsed, 7, false);
        if (bloomCtx) {
          drawSuppressionSource(bloomCtx, suppressionSource, config.radius, config.aura, elapsed, 7, true);
        }
        sceneCtx.save();
        sceneCtx.translate(suppressionTarget.x, suppressionTarget.y);
        drawTowerBody(sceneCtx, {
          color: '#6c5ce7',
          energyRatio: 0.5 + Math.sin(elapsed * 0.7) * 0.035,
          level: 1,
          rotation: Math.atan2(
            suppressionSource.y - suppressionTarget.y,
            suppressionSource.x - suppressionTarget.x,
          ),
          programHasProjectile: true,
        });
        sceneCtx.restore();
      }

      const projectileProgress = type === 'crown'
        ? archiveShieldProjectileProgress(shieldCycle)
        : null;
      canvas.dataset.projectileVisible = projectileProgress === null ? 'false' : 'true';
      if (projectileProgress !== null && shield) {
        drawShieldProjectile(sceneCtx, bloomCtx, projectileProgress, shield.radius * shieldCycle.radiusScale);
      }

      if (type === 'fracture' && fractureSplit) {
        if (elapsed >= FRACTURE_SPLIT_DELAY && config.split) {
          const radius = config.radius * config.split.radiusScale;
          for (let index = 0; index < config.split.count; index += 1) {
            const offset = index - (config.split.count - 1) / 2;
            sceneCtx.save();
            sceneCtx.translate(offset * 34, Math.abs(offset) * 11);
            drawEnemyBody(sceneCtx, { type, radius, time: elapsed, phase: index * 1.7 });
            sceneCtx.restore();
          }
        }
      } else {
        sceneCtx.save();
        if (showingSuppression) sceneCtx.translate(suppressionSource.x, suppressionSource.y);
        drawEnemyBody(sceneCtx, { type, time: elapsed });
        sceneCtx.restore();
      }

      if (shield) {
        drawEnemyShield(sceneCtx, shield, {
          charge: shieldCycle.active ? 1 : 0,
          radiusScale: shieldCycle.radiusScale,
          hitStrength: shieldCycle.hitStrength,
        });
      }
      if (showingSuppression && config.aura) {
        drawSuppressionLink(sceneCtx, suppressionSource, suppressionTarget, config.aura, elapsed, 7, 1, false);
        if (bloomCtx) {
          drawSuppressionLink(bloomCtx, suppressionSource, suppressionTarget, config.aura, elapsed, 7, 1, true);
        }
      }
      effects.render(sceneCtx, 'air', bloomCtx);
      effects.render(sceneCtx, 'overlay', bloomCtx);
      sceneCtx.restore();

      if (pipeline) {
        const shieldDistortion: ShieldDistortion | null = shield ? {
          centerX: centerX * deviceScale,
          centerY: (cssHeight - centerY) * deviceScale,
          radius: shield.radius * worldScale * deviceScale,
          radiusScale: shieldCycle.radiusScale,
          active: shieldCycle.active,
          sides: shield.sides,
          rotation: -shield.rotation,
          hitStrength: shieldCycle.hitStrength,
          color: hexToRgb(shield.color),
          rippleAge: shieldCycle.rippleAge,
          time: elapsed,
        } : null;
        const splitDistortion: SplitDistortion | null = type === 'fracture'
          && fractureSplit
          && elapsed < FRACTURE_RIPPLE_DURATION ? {
            centerX: centerX * deviceScale,
            centerY: (cssHeight - centerY) * deviceScale,
            radius: 120 * worldScale * deviceScale,
            phase: elapsed / FRACTURE_RIPPLE_DURATION,
            color: hexToRgb('#73e7f2'),
          } : null;
        pipeline.render(scene, shieldDistortion, splitDistortion, [], elapsed);
      } else if (fallbackCtx) {
        fallbackCtx.setTransform(1, 0, 0, 1, 0, 0);
        fallbackCtx.clearRect(0, 0, canvas.width, canvas.height);
        fallbackCtx.drawImage(scene, 0, 0);
      }
      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationFrame);
      effects.clear();
      pipeline?.dispose();
    };
  }, [fractureSplit, radiantSuppression, type]);

  return <canvas
    ref={canvasRef}
    width="640"
    height="640"
    className="enemy-archive-specimen"
    role="img"
    aria-label={label}
    data-specimen-count={type === 'fracture' && fractureSplit ? '3' : '1'}
    data-has-shield={ENEMIES[type].shield ? 'true' : 'false'}
    data-suppressed-tower={type === 'radiant' && radiantSuppression ? 'true' : 'false'}
  />;
}
