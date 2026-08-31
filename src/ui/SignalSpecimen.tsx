import { useEffect, useRef } from 'react';
import {
  createBloomWebGLContext,
  type ShieldDistortion,
  type SingularityDistortion,
  type SplitDistortion,
  WebGLBloomPipeline,
} from '../effects/bloom';
import { EffectEngine } from '../effects/engine';
import { GAME_EFFECT_IDS, gameEffects } from '../effects/game-effects';
import { drawSignalBody, drawSignalShield, hexToRgb } from '../signals/visuals/canvas';
import { drawSuppressionLink, drawSuppressionSource } from '../signals/visuals/suppression';
import { drawTowerBody } from '../game/tower-visuals';
import type { SignalId } from '../game/types';
import { drawProjectileGlow } from '../modules/render-utils';
import { getSignalCapability, signalRegistry, type SignalArchiveDemoMode } from '../signals';
import {
  advanceArchiveShieldCycle,
  archiveShieldProjectileProgress,
  createArchiveShieldCycle,
} from '../signals/archive/specimen-cycle';
import './SignalSpecimen.css';

const PREVIEW_WORLD_SIZE = 280;
const NO_SINGULARITIES: readonly SingularityDistortion[] = [];
const NO_SHIELDS: readonly ShieldDistortion[] = [];
const SUPPRESSION_SOURCE = { x: -48, y: -18 } as const;
const SUPPRESSION_TARGET = { x: 58, y: 20 } as const;

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

export function SignalSpecimen({
  type,
  label,
  demoMode,
}: {
  type: SignalId;
  label: string;
  demoMode: SignalArchiveDemoMode | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewStateRef = useRef<{ type: SignalId; demoMode: SignalArchiveDemoMode | undefined }>({ type, demoMode });
  previewStateRef.current.type = type;
  previewStateRef.current.demoMode = demoMode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const scene = document.createElement('canvas');
    const sceneCtx = scene.getContext('2d', { alpha: true });
    const field = document.createElement('canvas');
    const fieldCtx = field.getContext('2d', { alpha: false });
    if (!sceneCtx || !fieldCtx) return undefined;
    const gl = createBloomWebGLContext(canvas);
    const pipeline = gl ? new WebGLBloomPipeline(canvas, gl) : null;
    const fallbackCtx = pipeline ? null : canvas.getContext('2d');
    if (!pipeline && !fallbackCtx) return undefined;
    const effects = new EffectEngine().registerMany(gameEffects);
    let animationFrame = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    let renderWidth = 0;
    let renderHeight = 0;
    let renderScale = 0;
    let fieldColor = '';
    let activeType = previewStateRef.current.type;
    let activeDemoMode = previewStateRef.current.demoMode;
    let definition = signalRegistry.require(activeType);
    let shield = getSignalCapability(definition, 'shield');
    let split = getSignalCapability(definition, 'split-on-death');
    let aura = getSignalCapability(definition, 'tower-suppression-aura');
    let shieldCycle = createArchiveShieldCycle();
    let shieldColor = shield ? hexToRgb(shield.color) : null;
    const shieldVisualState = { charge: 1, radiusScale: 1, hitStrength: 0 };
    const shieldDistortion: ShieldDistortion = {
      centerX: 0,
      centerY: 0,
      radius: 0,
      radiusScale: 1,
      active: true,
      sides: 6,
      rotation: 0,
      hitStrength: 0,
      color: [0.27, 0.72, 1],
      rippleAge: Number.POSITIVE_INFINITY,
      time: 0,
    };
    const shieldDistortions: readonly ShieldDistortion[] = [shieldDistortion];
    const splitDistortion: SplitDistortion = {
      centerX: 0,
      centerY: 0,
      radius: 0,
      phase: 0,
      color: hexToRgb('#73e7f2'),
    };
    const signalBodyOptions = { type: activeType, time: 0, radius: definition.stats.radius, phase: 0 };
    const towerVisualOptions = {
      color: '#6c5ce7',
      energyRatio: 0.5,
      level: 1,
      rotation: 0,
      programHasProjectile: true,
    };

    const spawnFractureEffect = (): void => {
      if (activeDemoMode?.specimen.kind !== 'split-result' || !split) return;
      effects.spawn(GAME_EFFECT_IDS.fractureSplitRipple, {
        position: { x: 0, y: 0 },
        color: split.effectColor,
      });
    };
    spawnFractureEffect();

    const resetPreviewState = (): void => {
      const next = previewStateRef.current;
      activeType = next.type;
      activeDemoMode = next.demoMode;
      definition = signalRegistry.require(activeType);
      shield = getSignalCapability(definition, 'shield');
      split = getSignalCapability(definition, 'split-on-death');
      aura = getSignalCapability(definition, 'tower-suppression-aura');
      shieldColor = shield ? hexToRgb(shield.color) : null;
      shieldCycle = createArchiveShieldCycle();
      elapsed = 0;
      lastTime = performance.now();
      fieldColor = '';
      effects.clear();
      spawnFractureEffect();
    };

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
      const next = previewStateRef.current;
      if (
        next.type !== activeType
        || next.demoMode?.id !== activeDemoMode?.id
      ) resetPreviewState();

      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += delta;
      effects.update(delta);
      if (shield) updateCrownShield(delta);

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
        field.width = scene.width;
        field.height = scene.height;
        fieldColor = '';
      }
      if (fieldColor !== definition.visual.color) {
        fieldCtx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        drawArchiveField(fieldCtx, renderWidth, renderHeight, definition.visual.color);
        fieldColor = definition.visual.color;
      }
      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;
      const worldScale = Math.min(cssWidth, cssHeight) / PREVIEW_WORLD_SIZE;
      sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
      sceneCtx.drawImage(field, 0, 0);
      sceneCtx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      sceneCtx.save();
      sceneCtx.translate(centerX, centerY);
      sceneCtx.scale(worldScale, worldScale);
      const bloomCtx = pipeline?.beginFrame(centerX, centerY, worldScale);

      effects.render(sceneCtx, 'ground', bloomCtx);
      effects.render(sceneCtx, 'under-projectile', bloomCtx);
      effects.render(sceneCtx, 'projectile', bloomCtx);

      const showingSuppression = activeDemoMode?.specimen.kind === 'tower-under-aura' && Boolean(aura);
      if (showingSuppression && aura) {
        drawSuppressionSource(sceneCtx, SUPPRESSION_SOURCE, definition.stats.radius, aura, elapsed, 7, false);
        if (bloomCtx) {
          drawSuppressionSource(bloomCtx, SUPPRESSION_SOURCE, definition.stats.radius, aura, elapsed, 7, true);
        }
        sceneCtx.save();
        sceneCtx.translate(SUPPRESSION_TARGET.x, SUPPRESSION_TARGET.y);
        towerVisualOptions.energyRatio = 0.5 + Math.sin(elapsed * 0.7) * 0.035;
        towerVisualOptions.rotation = Math.atan2(
          SUPPRESSION_SOURCE.y - SUPPRESSION_TARGET.y,
          SUPPRESSION_SOURCE.x - SUPPRESSION_TARGET.x,
        );
        drawTowerBody(sceneCtx, towerVisualOptions);
        sceneCtx.restore();
      }

      const projectileProgress = shield
        ? archiveShieldProjectileProgress(shieldCycle)
        : null;
      const projectileVisible = projectileProgress === null ? 'false' : 'true';
      if (canvas.dataset.projectileVisible !== projectileVisible) canvas.dataset.projectileVisible = projectileVisible;
      if (projectileProgress !== null && shield) {
        drawShieldProjectile(sceneCtx, bloomCtx, projectileProgress, shield.radius * shieldCycle.radiusScale);
      }

      signalBodyOptions.type = activeType;
      signalBodyOptions.time = elapsed;
      if (activeDemoMode?.specimen.kind === 'split-result' && split) {
        if (elapsed >= split.delay) {
          const radius = definition.stats.radius * split.radiusScale;
          signalBodyOptions.radius = radius;
          for (let index = 0; index < split.count; index += 1) {
            const offset = index - (split.count - 1) / 2;
            sceneCtx.save();
            sceneCtx.translate(offset * 34, Math.abs(offset) * 11);
            signalBodyOptions.phase = index * 1.7;
            drawSignalBody(sceneCtx, signalBodyOptions);
            sceneCtx.restore();
          }
        }
      } else {
        sceneCtx.save();
        if (showingSuppression) sceneCtx.translate(SUPPRESSION_SOURCE.x, SUPPRESSION_SOURCE.y);
        signalBodyOptions.radius = definition.stats.radius;
        signalBodyOptions.phase = 0;
        drawSignalBody(sceneCtx, signalBodyOptions);
        sceneCtx.restore();
      }

      if (shield) {
        shieldVisualState.charge = shieldCycle.active ? 1 : 0;
        shieldVisualState.radiusScale = shieldCycle.radiusScale;
        shieldVisualState.hitStrength = shieldCycle.hitStrength;
        drawSignalShield(sceneCtx, shield, shieldVisualState);
      }
      if (showingSuppression && aura) {
        drawSuppressionLink(sceneCtx, SUPPRESSION_SOURCE, SUPPRESSION_TARGET, aura, elapsed, 7, 1, false);
        if (bloomCtx) {
          drawSuppressionLink(bloomCtx, SUPPRESSION_SOURCE, SUPPRESSION_TARGET, aura, elapsed, 7, 1, true);
        }
      }
      effects.render(sceneCtx, 'air', bloomCtx);
      effects.render(sceneCtx, 'overlay', bloomCtx);
      sceneCtx.restore();

      if (pipeline) {
        if (shield && shieldColor) {
          shieldDistortion.centerX = centerX * deviceScale;
          shieldDistortion.centerY = (cssHeight - centerY) * deviceScale;
          shieldDistortion.radius = shield.radius * worldScale * deviceScale;
          shieldDistortion.radiusScale = shieldCycle.radiusScale;
          shieldDistortion.active = shieldCycle.active;
          shieldDistortion.sides = shield.sides;
          shieldDistortion.rotation = -shield.rotation;
          shieldDistortion.hitStrength = shieldCycle.hitStrength;
          shieldDistortion.color = shieldColor;
          shieldDistortion.rippleAge = shieldCycle.rippleAge;
          shieldDistortion.time = elapsed;
        }
        const splitActive = activeDemoMode?.specimen.kind === 'split-result'
          && split !== undefined
          && elapsed < split.rippleDuration;
        if (splitActive && split) {
          splitDistortion.centerX = centerX * deviceScale;
          splitDistortion.centerY = (cssHeight - centerY) * deviceScale;
          splitDistortion.radius = 120 * worldScale * deviceScale;
          splitDistortion.phase = elapsed / split.rippleDuration;
        }
        pipeline.render(
          scene,
          shield ? shieldDistortions : NO_SHIELDS,
          splitActive ? splitDistortion : null,
          NO_SINGULARITIES,
          elapsed,
        );
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
  }, []);

  return <canvas
    ref={canvasRef}
    width="640"
    height="640"
    className="signal-archive-specimen"
    role="img"
    aria-label={label}
    data-specimen-count={demoMode?.specimen.kind === 'split-result' ? String(getSignalCapability(signalRegistry.require(type), 'split-on-death')?.count ?? 1) : '1'}
    data-has-shield={getSignalCapability(signalRegistry.require(type), 'shield') ? 'true' : 'false'}
    data-suppressed-tower={demoMode?.specimen.kind === 'tower-under-aura' ? 'true' : 'false'}
  />;
}
