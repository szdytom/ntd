import type { ModuleId, ShotBlueprint, TowerProgram, TriggerSpec } from '../game/types';
import type { ModuleRegistry } from './registry';
import type { NextShotPatch, ProjectileSpec } from './types';

interface PendingState {
  damageMultiplier: number;
  speedMultiplier: number;
  count: number;
  spread: number;
  slow: number;
  slowDuration: number;
  repeats: number;
  repeatDelay: number;
  seeking: number;
  bonusPierce: number;
  sizeMultiplier: number;
  splashBonus: number;
  energyMultiplier: number;
  energy: number;
  moduleIds: ModuleId[];
  moduleNames: string[];
  trigger?: TriggerSpec;
}

interface PayloadCapture {
  shot: ShotBlueprint;
  remaining: number;
}

const freshPending = (): PendingState => ({
  damageMultiplier: 1,
  speedMultiplier: 1,
  count: 1,
  spread: 0,
  slow: 0,
  slowDuration: 1.6,
  repeats: 1,
  repeatDelay: 0,
  seeking: 0,
  bonusPierce: 0,
  sizeMultiplier: 1,
  splashBonus: 0,
  energyMultiplier: 1,
  energy: 0,
  moduleIds: [],
  moduleNames: [],
});

export function compileProgram(slots: Array<ModuleId | null>, registry: ModuleRegistry): TowerProgram {
  const shots: ShotBlueprint[] = [];
  const warnings: string[] = [];
  let pending = freshPending();
  const captureStack: PayloadCapture[] = [];
  let wraps = 0;

  const processModule = (moduleId: ModuleId | null): void => {
    if (!moduleId) return;
    const definition = registry.get(moduleId);
    if (!definition) {
      warnings.push(`未注册模块 ${moduleId}`);
      return;
    }

    const modifyNext = (patch: NextShotPatch): void => {
      pending.damageMultiplier *= patch.damageMultiplier ?? 1;
      pending.speedMultiplier *= patch.speedMultiplier ?? 1;
      if (patch.count !== undefined) pending.count = Math.max(pending.count, patch.count);
      if (patch.spread !== undefined) pending.spread = Math.max(pending.spread, patch.spread);
      if (patch.slow !== undefined) pending.slow = Math.max(pending.slow, patch.slow);
      if (patch.slowDuration !== undefined) pending.slowDuration = Math.max(pending.slowDuration, patch.slowDuration);
      if (patch.repeats !== undefined) pending.repeats = Math.max(pending.repeats, patch.repeats);
      if (patch.repeatDelay !== undefined) pending.repeatDelay = Math.max(pending.repeatDelay, patch.repeatDelay);
      if (patch.seeking !== undefined) pending.seeking = Math.max(pending.seeking, patch.seeking);
      pending.bonusPierce += patch.bonusPierce ?? 0;
      pending.sizeMultiplier *= patch.sizeMultiplier ?? 1;
      pending.splashBonus += patch.splashBonus ?? 0;
      pending.energyMultiplier *= patch.energyMultiplier ?? 1;
    };

    const emitProjectile = (spec: ProjectileSpec): void => {
      const shot: ShotBlueprint = {
        source: moduleId,
        modules: [...pending.moduleIds, moduleId],
        damage: Math.round(spec.damage * pending.damageMultiplier),
        speed: spec.speed * pending.speedMultiplier,
        count: pending.count,
        spread: pending.spread,
        size: spec.size * pending.sizeMultiplier,
        color: definition.meta.color,
        pierce: (spec.pierce ?? 0) + pending.bonusPierce,
        slow: pending.slow,
        slowDuration: pending.slowDuration,
        splash: (spec.splash ?? 0) + pending.splashBonus,
        seeking: pending.seeking,
        repeats: pending.repeats,
        repeatDelay: pending.repeatDelay,
        energyCost: Math.max(1, Math.round((definition.meta.energy + pending.energy) * pending.energyMultiplier)),
        lifetime: spec.lifetime ?? 1.7,
        static: spec.static,
        trigger: pending.trigger,
        payload: [],
      };

      const parent = captureStack[captureStack.length - 1];
      if (definition.kind === 'static' && !parent) {
        warnings.push(`静态投射物“${definition.meta.shortName}”必须作为触发载荷，不能直接施放`);
        pending = freshPending();
        return;
      }
      if (parent) {
        parent.shot.payload.push(shot);
        parent.remaining -= 1;
        if (parent.remaining <= 0) captureStack.pop();
      } else {
        shots.push(shot);
      }
      if (shot.trigger && shot.trigger.payloadCount > 0) {
        captureStack.push({ shot, remaining: shot.trigger.payloadCount });
      }
      pending = freshPending();
    };

    const wrapNext = (trigger: TriggerSpec): void => {
      pending.trigger = { ...trigger };
    };

    if (definition.kind === 'modifier' || definition.kind === 'trail' || definition.kind === 'logic') {
      pending.energy += definition.meta.energy;
      pending.moduleIds.push(moduleId);
      pending.moduleNames.push(definition.meta.shortName);
    }
    definition.compile({ moduleId, modifyNext, wrapNext, emitProjectile });
  };

  for (const moduleId of slots) {
    processModule(moduleId);
  }

  const hasUnresolvedDraw = (): boolean => pending.moduleIds.length > 0 || captureStack.length > 0;
  if (shots.length > 0 && hasUnresolvedDraw()) {
    wraps = 1;
    for (const moduleId of slots) {
      processModule(moduleId);
      if (!hasUnresolvedDraw()) break;
    }
  }

  if (pending.moduleNames.length > 0) {
    warnings.push(wraps > 0
      ? `${pending.moduleNames.join(' + ')} 回绕一周后仍没有弹射物，暂时不会生效`
      : `${pending.moduleNames.join(' + ')} 后没有弹射物，暂时不会生效`);
  }
  if (shots.length === 0) warnings.push('缺少可直接施放的弹射物模块：这座塔不会攻击');
  for (const capture of captureStack) {
    const carrier = registry.get(capture.shot.source)?.meta.shortName ?? capture.shot.source;
    warnings.push(`${carrier} 的触发器${wraps > 0 ? '回绕后仍' : ''}缺少 ${capture.remaining} 个载荷`);
  }

  const energyOf = (shot: ShotBlueprint): number => shot.energyCost + shot.payload.reduce((sum, payload) => sum + energyOf(payload), 0);
  const countOf = (shot: ShotBlueprint): number => shot.count * shot.repeats + shot.payload.reduce((sum, payload) => sum + countOf(payload), 0);
  const triggerCount = (shot: ShotBlueprint): number => (shot.trigger ? 1 : 0) + shot.payload.reduce((sum, payload) => sum + triggerCount(payload), 0);
  const energyCost = shots.reduce((sum, shot) => sum + energyOf(shot), 0);
  const projectileCount = shots.reduce((sum, shot) => sum + countOf(shot), 0);
  const triggers = shots.reduce((sum, shot) => sum + triggerCount(shot), 0);
  return {
    shots,
    energyCost,
    wraps,
    summary: shots.length === 0
      ? '空程序'
      : `${shots.length} 段施法 · ${energyCost}⚡/轮 · ${projectileCount} 弹体${triggers > 0 ? ` · ${triggers} 触发` : ''}${wraps > 0 ? ' · ↻ 回绕' : ''}`,
    warnings,
  };
}
