import type { DifficultyId, ModuleId, SignalId, TargetingMode } from '@prism-bastion/game-core/game/types';

export const COOP_PROTOCOL_VERSION = 3;
export const COOP_PLAYER_IDS = ['p1', 'p2'] as const;
export type CoopPlayerId = (typeof COOP_PLAYER_IDS)[number];

export type CoopPhase =
  | 'lobby'
  | 'draft'
  | 'planning'
  | 'local-defense'
  | 'reinforcement'
  | 'ended';

export interface CoopTowerPlan {
  id: number;
  padIndex: number;
  maxEnergy: number;
  energyRegen: number;
  cooldown: number;
  range: number;
  targeting: TargetingMode;
  level: number;
  slots: Array<ModuleId | null>;
}

export interface CoopPlayerPlan {
  core: number;
  maxCore: number;
  shards: number;
  towers: CoopTowerPlan[];
  inventory: Record<ModuleId, number>;
  nextTowerId: number;
}

export type CoopPlanningCommand =
  | { type: 'place-tower'; padIndex: number }
  | { type: 'upgrade-tower'; towerId: number }
  | { type: 'set-targeting'; towerId: number; targeting: TargetingMode }
  | { type: 'install-module'; towerId: number; slotIndex: number; moduleId: ModuleId | null }
  | { type: 'swap-modules'; towerId: number; from: number; to: number }
  | { type: 'clear-loadout'; towerId: number };

export interface CoopDraftOffer {
  pick: number;
  totalPicks: number;
  choices: ModuleId[];
  canAbandon: boolean;
  boosted: boolean;
}

export interface CoopLeakedSignal {
  ordinal: number;
  type: SignalId;
  entrance: string;
}

export interface CoopCombatResult {
  phaseId: number;
  planHash: string;
  shardsEarned: number;
  leaks: CoopLeakedSignal[];
}

export interface CoopPlayerSnapshot {
  id: CoopPlayerId;
  name: string;
  connected: boolean;
  ready: boolean;
  eliminated: boolean;
  combatSubmitted: boolean;
  plan: CoopPlayerPlan;
  draftOffer: CoopDraftOffer | null;
  draftLocked: boolean;
  draftChoice: ModuleId | null | undefined;
}

export interface CoopRoomSnapshot {
  code: string;
  revision: number;
  phase: CoopPhase;
  phaseId: number;
  hostId: CoopPlayerId;
  levelId: string;
  difficultyId: DifficultyId;
  wave: number;
  maxWaves: number;
  players: CoopPlayerSnapshot[];
  pool: Record<ModuleId, number | 'unlimited'>;
  reinforcement: {
    defenderId: CoopPlayerId;
    ownerId: CoopPlayerId;
    signals: CoopLeakedSignal[];
  } | null;
  result: 'victory' | 'defeat' | 'disconnected' | 'desync' | null;
}

export interface CoopPhaseStart {
  type: 'phase-start';
  phaseId: number;
  kind: 'local-defense' | 'reinforcement';
  wave: number;
  actorId: CoopPlayerId;
  planHash: string;
  signals: CoopLeakedSignal[];
}

export type CoopClientMessage =
  | { type: 'create-room'; protocolVersion: number; name: string; levelId: string; difficultyId: DifficultyId }
  | { type: 'join-room'; protocolVersion: number; name: string; code: string }
  | { type: 'resume-room'; protocolVersion: number; code: string; token: string }
  | { type: 'plan-command'; expectedRevision: number; command: CoopPlanningCommand }
  | { type: 'transfer-shards'; expectedRevision: number; amount: number }
  | { type: 'set-ready'; expectedRevision: number; ready: boolean }
  | { type: 'draft-decision'; expectedRevision: number; choice: ModuleId | null }
  | { type: 'combat-result'; expectedRevision: number; result: CoopCombatResult }
  | { type: 'leave-room' };

export type CoopServerMessage =
  | { type: 'session'; playerId: CoopPlayerId; token: string; room: CoopRoomSnapshot }
  | { type: 'room'; room: CoopRoomSnapshot }
  | CoopPhaseStart
  | { type: 'shards-transferred'; fromId: CoopPlayerId; toId: CoopPlayerId; amount: number }
  | { type: 'rejected'; traceId?: string; reason: string; room?: CoopRoomSnapshot }
  | { type: 'room-ended'; reason: 'disconnected' | 'desync' | 'closed' };
