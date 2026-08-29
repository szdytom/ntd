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
  splashSet?: number;
  energyMultiplier: number;
  energyRefundMultiplier: number;
  focusConversion?: {
    damagePerCharge: number;
    speedPerCharge: number;
  };
  condenseSplash?: {
    damagePerRadius: number;
  };
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
  energyRefundMultiplier: 0,
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
        message: `Unregistered module: ${moduleId}`,
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
      if (patch.repeats !== undefined) pending.repeats *= Math.max(1, Math.round(patch.repeats));
      if (patch.repeatDelay !== undefined) pending.repeatDelay = Math.max(pending.repeatDelay, patch.repeatDelay);
      if (patch.seeking !== undefined) pending.seeking = Math.max(pending.seeking, patch.seeking);
      pending.bonusPierce += patch.bonusPierce ?? 0;
      pending.sizeMultiplier *= patch.sizeMultiplier ?? 1;
      pending.splashBonus += patch.splashBonus ?? 0;
      if (patch.splashSet !== undefined) pending.splashSet = Math.max(0, patch.splashSet);
      pending.energyMultiplier *= patch.energyMultiplier ?? 1;
      pending.energyRefundMultiplier += patch.energyRefundMultiplier ?? 0;
      if (patch.focusConversion) {
        pending.focusConversion = {
          damagePerCharge: (pending.focusConversion?.damagePerCharge ?? 0) + patch.focusConversion.damagePerCharge,
          speedPerCharge: (pending.focusConversion?.speedPerCharge ?? 0) + patch.focusConversion.speedPerCharge,
        };
      }
      if (patch.condenseSplash) {
        pending.condenseSplash = {
          damagePerRadius: (pending.condenseSplash?.damagePerRadius ?? 0) + patch.condenseSplash.damagePerRadius,
        };
      }
    };

    const emitProjectile = (spec: ProjectileSpec): void => {
      let damageMultiplier = pending.damageMultiplier;
      let speedMultiplier = pending.speedMultiplier;
      let count = pending.count;
      let spread = pending.spread;
      let pierce = (spec.pierce ?? 0) + pending.bonusPierce;
      let repeats = pending.repeats;
      let repeatDelay = pending.repeatDelay;
      let splash = (spec.splash ?? 0) + pending.splashBonus;
      if (pending.focusConversion) {
        const charge = Math.max(0, pierce) + Math.max(0, count - 1) + Math.max(0, repeats - 1);
        damageMultiplier *= 1 + charge * pending.focusConversion.damagePerCharge;
        speedMultiplier *= 1 + charge * pending.focusConversion.speedPerCharge;
        count = 1;
        spread = 0;
        pierce = 0;
        repeats = 1;
        repeatDelay = 0;
      }
      if (pending.condenseSplash) {
        damageMultiplier *= 1 + Math.max(0, splash) * pending.condenseSplash.damagePerRadius;
      }
      if (pending.splashSet !== undefined) splash = pending.splashSet;
      const shot: ShotBlueprint = {
        source: moduleId,
        modules: [...pending.moduleIds, moduleId],
        damage: Math.round(spec.damage * damageMultiplier),
        speed: spec.speed * speedMultiplier,
        count,
        spread,
        size: spec.size * pending.sizeMultiplier,
        color: definition.meta.color,
        pierce,
        slow: pending.slow,
        slowDuration: pending.slowDuration,
        splash,
        seeking: pending.seeking,
        repeats,
        repeatDelay,
        energyRefundMultiplier: pending.energyRefundMultiplier,
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
          message: `Static projectile "${definition.meta.shortName}" must be a trigger payload and cannot be cast directly`,
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
          message: `${pending.triggerModuleName ?? pending.triggerModuleId} and ${definition.meta.shortName} cannot wrap the same projectile; using the nearer ${definition.meta.shortName}`,
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
        ? `${pending.moduleNames.join(' + ')} still has no projectile after wrapping and will not take effect`
        : `${pending.moduleNames.join(' + ')} has no following projectile and will not take effect`,
    });
  }
  if (shots.length === 0) {
    diagnose({
      code: 'missing-projectile',
      severity: 'error',
      message: 'No directly castable projectile is present, so this tower cannot attack',
    });
  }
  for (const capture of captureStack) {
    const carrier = registry.get(capture.shot.source)?.meta.shortName ?? capture.shot.source;
    diagnose({
      code: 'missing-payload',
      severity: 'error',
      message: `${carrier} trigger ${wraps > 0 ? 'still ' : ''}needs ${capture.remaining} payloads`,
      moduleId: capture.shot.source,
    });
  }

  const energyOf = (shot: ShotBlueprint): number => shot.energyCost + shot.payload.reduce((sum, payload) => sum + energyOf(payload), 0);
  const countOf = (shot: ShotBlueprint): number => {
    const ownInstances = shot.count * shot.repeats;
    const payloadInstances = shot.payload.reduce((sum, payload) => sum + countOf(payload), 0);
    const payloadReleases = shot.trigger ? 1 : 0;
    return ownInstances + ownInstances * payloadReleases * payloadInstances;
  };
  const triggerCount = (shot: ShotBlueprint): number => {
    const ownTriggers = shot.trigger ? shot.count * shot.repeats : 0;
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
      ? 'Empty program'
      : `${shots.length} casts · ${energyCost}⚡/cycle · ${projectileCount} projectiles${triggers > 0 ? ` · ${triggers} triggers` : ''}${wraps > 0 ? ' · ↻ wrap' : ''}`,
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
