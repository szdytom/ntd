import type { SignalId, SignalVariantId } from '../signals';
export type { SignalId, SignalVariantId } from '../signals';

export interface Point {
  x: number;
  y: number;
}

export type ModuleId = string;
export type GameMode = 'standard' | 'creative';
export type DifficultyId = 'relaxed' | 'easy' | 'normal' | 'hard' | 'extreme';

export type TargetingMode =
  | 'core-nearest'
  | 'core-farthest'
  | 'hp-lowest'
  | 'hp-highest'
  | 'tower-nearest'
  | 'tower-farthest'
  | 'density-highest'
  | 'density-lowest';

export interface ShotBlueprint {
  source: ModuleId;
  modules: ModuleId[];
  damage: number;
  /** Final multiplier applied to authored damage, reused by attached damage systems. */
  damageMultiplier: number;
  speed: number;
  count: number;
  spread: number;
  size: number;
  color: string;
  pierce: number;
  slow: number;
  slowDuration: number;
  splash: number;
  seeking: number;
  repeats: number;
  repeatDelay: number;
  /** Additional targets reached sequentially after the primary hit. */
  chainTargets?: number;
  energyRefundMultiplier: number;
  energyCost: number;
  lifetime: number;
  collision: 'signal' | 'none';
  trajectory: 'steerable' | 'fixed';
  aim: 'intercept' | 'direct';
  boundary: 'margin' | 'world';
  static?: StaticProjectileSpec;
  trigger?: TriggerSpec;
  payload: ShotBlueprint[];
}

export type TriggerType = 'impact' | 'timer' | 'expiration' | 'terrain';

export interface TriggerSpec {
  type: TriggerType;
  payloadCount: number;
  delay?: number;
  crossingTicks?: number;
}

export interface StaticProjectileSpec {
  duration: number;
  armTime: number;
  triggerRadius: number;
  cooldown: number;
  maxTriggers: number;
  gravity?: {
    pull: number;
    radius: number;
  };
}

export interface TowerProgram {
  shots: ShotBlueprint[];
  energyCost: number;
  wraps: number;
  summary: string;
  warnings: string[];
  diagnostics: ProgramDiagnostic[];
}

export type ProgramDiagnosticCode =
  | 'unknown-module'
  | 'static-at-root'
  | 'trigger-conflict'
  | 'missing-projectile'
  | 'unresolved-modifier'
  | 'missing-payload'
  | 'ineffective-combination';

export interface ProgramDiagnostic {
  code: ProgramDiagnosticCode;
  severity: 'warning' | 'error';
  message: string;
  moduleId?: ModuleId;
  relatedModuleId?: ModuleId;
}

export interface TowerStatAllocation {
  budget: number;
  capacity: number;
  regeneration: number;
  cooldown: number;
  slots: number;
  range: number;
}

export interface Tower {
  id: number;
  padIndex: number;
  position: Point;
  rotation: number;
  energy: number;
  maxEnergy: number;
  energyRegen: number;
  cooldown: number;
  cooldownLeft: number;
  range: number;
  targeting: TargetingMode;
  level: number;
  slots: Array<ModuleId | null>;
  flash: number;
  targetId: number | null;
}

export interface Signal {
  id: number;
  type: SignalId;
  variantId: SignalVariantId;
  routeId: string;
  progress: number;
  distance: number;
  position: Point;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  movementPhase?: number;
  reward: number;
  coreDamage: number;
  radius: number;
  slowFactor: number;
  slowTime: number;
  fullHealTimer?: number;
  hitFlash: number;
  shield: number;
  maxShield: number;
  shieldHitFlash: number;
  shieldRadiusScale: number;
  shieldRippleAge: number;
  statuses: SignalStatus[];
  dead: boolean;
}

export interface SignalStatus {
  id: string;
  remaining: number;
  duration: number;
  interval: number;
  tickTimer: number;
  particleTimer: number;
  damage: number;
  color: string;
  particle?: StatusParticleSpec;
}

export interface StatusParticleSpec {
  effectId: string;
  interval: number;
}

export interface SplitRift {
  position: Point;
  age: number;
  duration: number;
}

export interface SpaceRiftVisual {
  type: 'diamond';
  center: Point;
  radius: number;
}

export interface SpaceRift {
  id: number;
  key: string;
  points: Point[];
  width: number;
  damagePerSecond: number;
  settlementInterval: number;
  modifierInterval: number;
  effectInterval: number;
  color: string;
  source: Projectile;
  contacts: Map<number, SpaceRiftContact>;
  remaining: number;
  duration: number;
  visual?: SpaceRiftVisual;
  hitEffectId?: string;
}

export interface SpaceRiftContact {
  pendingDamage: number;
  pendingDuration: number;
  pendingModifierDamage: number;
  settlementTimer: number;
  modifierTimer: number;
  effectTimer: number;
  lastPosition: Point;
}

export interface Projectile {
  id: number;
  towerId: number;
  position: Point;
  velocity: Point;
  targetId: number | null;
  damage: number;
  speed: number;
  radius: number;
  color: string;
  life: number;
  pierce: number;
  slow: number;
  splash: number;
  seeking: number;
  modules: ModuleId[];
  shot: ShotBlueprint;
  energyRefundBudget?: EnergyRefundBudget;
  trailTimer: number;
  moduleState: Record<string, unknown>;
  behavior: 'linear' | 'static';
  age: number;
  triggered: boolean;
  triggerCooldown: number;
  triggerCount: number;
  trail: Point[];
}

export interface EnergyRefundBudget {
  remaining: number;
}

export interface FloatingText {
  position: Point;
  text: string;
  color: string;
  life: number;
}

export interface ScheduledCast {
  towerId: number;
  blueprint: ShotBlueprint;
  targetId: number;
  delay: number;
  origin?: Point;
  energyRefundBudget?: EnergyRefundBudget;
}

export type GameStatus = 'planning' | 'wave' | 'reward' | 'won' | 'lost';

export interface ModuleDraftSnapshot {
  round: number;
  totalRounds: number;
  choices: ModuleId[];
  boosted: boolean;
  canAbandon: boolean;
  abandonsRemaining: number;
}

export interface CreativeSetup {
  healthScale: number;
  speedScale: number;
  coreStability: number;
  waveCount: number;
}

export interface GameSnapshot {
  status: GameStatus;
  mode: GameMode;
  levelId: string;
  levelName: string;
  wave: number;
  maxWaves: number;
  core: number;
  maxCore: number;
  shards: number;
  score: number;
  signalsAlive: number;
  waveQueue: number;
  waveSignalCounts: Readonly<Partial<Record<SignalId, number>>>;
  selectedTowerId: number | null;
  speed: number;
  paused: boolean;
  draft: ModuleDraftSnapshot | null;
}

export interface ModuleInventorySnapshot {
  total: number;
  installed: number;
  available: number;
}

export interface GameViewSnapshot {
  revision: number;
  game: GameSnapshot;
  towers: readonly Tower[];
  selectedTower: Tower | null;
  selectedProgram: TowerProgram | null;
  creativeSetup: CreativeSetup;
  moduleInventory: Readonly<Record<ModuleId, ModuleInventorySnapshot>>;
}

export interface SignalOutcomeTally {
  spawned: number;
  defeated: number;
  leaked: number;
  remaining: number;
  queued: number;
  coreDamage: number;
}

export interface DefenseWaveReport {
  wave: number;
  signals: Readonly<Partial<Record<SignalVariantId, SignalOutcomeTally>>>;
}

export interface DefenseTowerReport {
  padIndex: number;
  level: number;
  targeting: TargetingMode;
  slots: readonly (ModuleId | null)[];
}

export interface DefenseInventoryEntry {
  moduleId: ModuleId;
  count: number;
}

export interface DefenseCompletedReport {
  runId: string;
  startedAt: number;
  endedAt: number;
  simulationSeconds: number;
  result: 'won' | 'lost';
  mode: GameMode;
  tutorial: boolean;
  levelId: string;
  difficultyId: DifficultyId;
  waveReached: number;
  maxWaves: number;
  score: number;
  core: number;
  maxCore: number;
  shards: number;
  waves: readonly DefenseWaveReport[];
  inventory: readonly DefenseInventoryEntry[];
  towers: readonly DefenseTowerReport[];
}

export type DefenseArchiveFact =
  | 'creative-signal-spawned'
  | 'second-tower-built'
  | 'module-order-changed'
  | 'wrapped-program-configured'
  | 'targeting-mode-configured'
  | 'tower-maxed'
  | 'trail-module-fired'
  | 'legendary-tower-configured'
  | 'five-kinds-configured';

export type GameEvent =
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'toast'; message: string; tone?: 'info' | 'good' | 'warn' }
  | { type: 'defense-archive-fact'; fact: DefenseArchiveFact }
  | { type: 'defense-completed'; report: DefenseCompletedReport };
