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
  energyRefundMultiplier: number;
  energyCost: number;
  lifetime: number;
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
  | 'missing-payload';

export interface ProgramDiagnostic {
  code: ProgramDiagnosticCode;
  severity: 'warning' | 'error';
  message: string;
  moduleId?: ModuleId;
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

export type EnemyType = 'spark' | 'surge' | 'kite' | 'block' | 'hex' | 'crown' | 'fracture' | 'anvil' | 'radiant';

export interface Enemy {
  id: number;
  type: EnemyType;
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
  splitGeneration: number;
  slowFactor: number;
  slowTime: number;
  hitFlash: number;
  shield: number;
  maxShield: number;
  shieldHitFlash: number;
  shieldRadiusScale: number;
  shieldRippleAge: number;
  statuses: EnemyStatus[];
  dead: boolean;
}

export interface EnemyStatus {
  id: string;
  remaining: number;
  duration: number;
  interval: number;
  tickTimer: number;
  damage: number;
  color: string;
}

export interface SplitRift {
  position: Point;
  age: number;
  duration: number;
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
  trailTimer: number;
  moduleState: Record<string, unknown>;
  behavior: 'linear' | 'static';
  age: number;
  triggered: boolean;
  triggerCooldown: number;
  triggerCount: number;
  trail: Point[];
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
}

export type GameStatus = 'planning' | 'wave' | 'reward' | 'won' | 'lost';

export interface ModuleDraftSnapshot {
  round: number;
  totalRounds: number;
  choices: ModuleId[];
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
  enemiesAlive: number;
  waveQueue: number;
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

export type GameEvent =
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'toast'; message: string; tone?: 'info' | 'good' | 'warn' };
