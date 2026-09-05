import type { ModuleId, ShotBlueprint, SignalId, TowerProgram } from './types';

export type CombatEvent =
  | { readonly type: 'program-compiled'; readonly towerId: number; readonly slots: readonly (ModuleId | null)[]; readonly program: TowerProgram }
  | { readonly type: 'tower-cast'; readonly towerId: number; readonly targetId: number | null; readonly shot: ShotBlueprint }
  | { readonly type: 'projectile-spawned'; readonly towerId: number; readonly projectileId: number; readonly shot: ShotBlueprint; readonly payload: boolean }
  | { readonly type: 'projectile-hit'; readonly projectileId: number; readonly signalId: number; readonly damage: number; readonly shot: ShotBlueprint }
  | { readonly type: 'projectile-absorbed'; readonly projectileId: number; readonly signalId: number; readonly shot: ShotBlueprint }
  | { readonly type: 'secondary-hit'; readonly projectileId: number; readonly signalId: number; readonly shot: ShotBlueprint }
  | { readonly type: 'trigger-fired'; readonly projectileId: number; readonly signalId: number | null; readonly trigger: NonNullable<ShotBlueprint['trigger']>; readonly shot: ShotBlueprint }
  | { readonly type: 'payload-deployed'; readonly parentProjectileId: number; readonly projectileId: number; readonly shot: ShotBlueprint }
  | { readonly type: 'status-applied'; readonly signalId: number; readonly statusId: string; readonly duration: number }
  | { readonly type: 'signal-slowed'; readonly signalId: number; readonly factor: number; readonly duration: number }
  | { readonly type: 'signal-spawned'; readonly signalId: number; readonly signalType: SignalId }
  | { readonly type: 'signal-damaged'; readonly signalId: number; readonly damage: number; readonly remainingHealth: number }
  | { readonly type: 'signal-defeated'; readonly signalId: number; readonly signalType: SignalId }
  | { readonly type: 'signal-leaked'; readonly signalId: number; readonly signalType: SignalId; readonly coreDamage: number }
  | { readonly type: 'tower-energy-changed'; readonly towerId: number; readonly before: number; readonly after: number; readonly reason: 'cast' | 'refund' };

export type CombatEventListener = (event: CombatEvent) => void;
