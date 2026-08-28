import type {
  ModuleId,
  ProgramDiagnostic,
  ShotBlueprint,
  TowerProgram,
  TriggerSpec,
} from '../game/types';
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
  triggerModuleId?: ModuleId;
  triggerModuleName?: string;
  triggerEnergy: number;
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
  triggerEnergy: 0,
});

export function compileProgram(slots: Array<ModuleId | null>, registry: ModuleRegistry): TowerProgram {
  const shots: ShotBlueprint[] = [];
  const diagnostics: ProgramDiagnostic[] = [];
  const diagnose = (diagnostic: ProgramDiagnostic): void => {
    diagnostics.push(diagnostic);
  };
  let pending = freshPending();
  const captureStack: PayloadCapture[] = [];
  let wraps = 0;

  const processModule = (moduleId: ModuleId | null): void => {
    if (!moduleId) return;
    const definition = registry.get(moduleId);
    if (!definition) {
      diagnose({
        code: 'unknown-module',
        severity: 'error',
        message: `未注册模块 ${moduleId}`,
        moduleId,
      });
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
        ...(spec.static ? { static: spec.static } : {}),
        ...(pending.trigger ? { trigger: pending.trigger } : {}),
        payload: [],
      };

      const parent = captureStack[captureStack.length - 1];
      if (definition.kind === 'static' && !parent) {
        diagnose({
          code: 'static-at-root',
          severity: 'error',
          message: `静态投射物“${definition.meta.shortName}”必须作为触发载荷，不能直接施放`,
          moduleId,
        });
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
      if (pending.trigger && pending.triggerModuleId) {
        diagnose({
          code: 'trigger-conflict',
          severity: 'error',
          message: `${pending.triggerModuleName ?? pending.triggerModuleId} 与 ${definition.meta.shortName} 不能同时包裹同一枚弹射物；采用更靠近弹射物的 ${definition.meta.shortName}`,
          moduleId,
        });
        pending.energy -= pending.triggerEnergy;
        pending.moduleIds = pending.moduleIds.filter((id) => id !== pending.triggerModuleId);
        pending.moduleNames = pending.moduleNames.filter((name) => name !== pending.triggerModuleName);
      }
      pending.trigger = { ...trigger };
      pending.triggerModuleId = moduleId;
      pending.triggerModuleName = definition.meta.shortName;
      pending.triggerEnergy = definition.meta.energy;
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
    diagnose({
      code: 'unresolved-modifier',
      severity: 'error',
      message: wraps > 0
        ? `${pending.moduleNames.join(' + ')} 回绕一周后仍没有弹射物，暂时不会生效`
        : `${pending.moduleNames.join(' + ')} 后没有弹射物，暂时不会生效`,
    });
  }
  if (shots.length === 0) {
    diagnose({
      code: 'missing-projectile',
      severity: 'error',
      message: '缺少可直接施放的弹射物模块：这座塔不会攻击',
    });
  }
  for (const capture of captureStack) {
    const carrier = registry.get(capture.shot.source)?.meta.shortName ?? capture.shot.source;
    diagnose({
      code: 'missing-payload',
      severity: 'error',
      message: `${carrier} 的触发器${wraps > 0 ? '回绕后仍' : ''}缺少 ${capture.remaining} 个载荷`,
      moduleId: capture.shot.source,
    });
  }

  const energyOf = (shot: ShotBlueprint): number => shot.energyCost + shot.payload.reduce((sum, payload) => sum + energyOf(payload), 0);
  const countOf = (shot: ShotBlueprint): number => {
    const ownInstances = shot.count * shot.repeats;
    const payloadInstances = shot.payload.reduce((sum, payload) => sum + countOf(payload), 0);
    const payloadReleases = shot.static && shot.trigger?.type === 'proximity'
      ? shot.static.maxTriggers
      : shot.trigger ? 1 : 0;
    return ownInstances + ownInstances * payloadReleases * payloadInstances;
  };
  const triggerCount = (shot: ShotBlueprint): number => {
    const ownInstances = shot.count * shot.repeats;
    const ownTriggers = shot.trigger
      ? ownInstances * (shot.static && shot.trigger.type === 'proximity' ? shot.static.maxTriggers : 1)
      : 0;
    return ownTriggers + ownTriggers * shot.payload.reduce((sum, payload) => sum + triggerCount(payload), 0);
  };
  const energyCost = shots.reduce((sum, shot) => sum + energyOf(shot), 0);
  const projectileCount = shots.reduce((sum, shot) => sum + countOf(shot), 0);
  const triggers = shots.reduce((sum, shot) => sum + triggerCount(shot), 0);
  const program: TowerProgram = {
    shots,
    energyCost,
    wraps,
    summary: shots.length === 0
      ? '空程序'
      : `${shots.length} 段施法 · ${energyCost}⚡/轮 · ${projectileCount} 弹体${triggers > 0 ? ` · ${triggers} 触发` : ''}${wraps > 0 ? ' · ↻ 回绕' : ''}`,
    warnings: diagnostics.map((diagnostic) => diagnostic.message),
    diagnostics,
  };
  const freezeShot = (shot: ShotBlueprint): void => {
    shot.payload.forEach(freezeShot);
    Object.freeze(shot.modules);
    Object.freeze(shot.payload);
    Object.freeze(shot.trigger);
    Object.freeze(shot.static);
    Object.freeze(shot);
  };
  shots.forEach(freezeShot);
  Object.freeze(program.shots);
  Object.freeze(program.warnings);
  Object.freeze(program.diagnostics);
  return Object.freeze(program);
}
