import type { VisualFeedbackSink } from '../visual-feedback';
import type {
  Signal,
  SignalStatusApplication,
  ModuleId,
  Point,
  Projectile,
  ShotBlueprint,
  SpaceRiftVisual,
  StaticProjectileSpec,
  Tower,
  TriggerSpec,
} from '../game/types';

export type ModuleKind = 'projectile' | 'static' | 'modifier' | 'trail' | 'logic';
export type ModuleTag =
  | 'area'
  | 'fixed-route'
  | 'projectile'
  | 'repeat'
  | 'reliable-trigger'
  | 'rift-space'
  | 'route'
  | 'static'
  | 'status'
  | 'trail'
  | 'trail-carrier'
  | 'trigger';
export type ModuleRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ModuleTextValues = Readonly<Record<string, string | number>>;
export interface ModuleMeta {
  /** Stable identity color used by combat rules and semantic visual cues. */
  color: string;
  energy: number;
  rarity: ModuleRarity;
  text?: {
    description?: ModuleTextValues;
    detail?: ModuleTextValues;
  };
}

export interface ProjectileSpec {
  damage: number;
  speed: number;
  size: number;
  pierce?: number;
  splash?: number;
  chainTargets?: number;
  lifetime?: number;
  static?: StaticProjectileSpec;
  collision?: 'signal' | 'none';
  trajectory?: 'steerable' | 'fixed';
  aim?: 'intercept' | 'direct';
  boundary?: 'margin' | 'world';
}

export interface NextShotPatch {
  damageMultiplier?: number;
  speedMultiplier?: number;
  count?: number;
  spread?: number;
  slow?: number;
  slowDuration?: number;
  repeats?: number;
  repeatDelay?: number;
  seeking?: number;
  bonusPierce?: number;
  sizeMultiplier?: number;
  splashBonus?: number;
  splashSet?: number;
  energyMultiplier?: number;
  energyRefundMultiplier?: number;
  focusConversion?: {
    damagePerCharge: number;
    speedPerCharge: number;
  };
  condenseSplash?: {
    damagePerRadius: number;
  };
}

export interface ModuleCompileContext {
  readonly moduleId: ModuleId;
  modifyNext(patch: NextShotPatch): void;
  wrapNext(trigger: TriggerSpec): void;
  emitProjectile(spec: ProjectileSpec): void;
}

export interface ModuleEffectContext {
  visuals: VisualFeedbackSink;
  position: Point;
  rotation: number;
  color: string;
  shot: ShotBlueprint;
  tower?: Tower;
  projectile?: Projectile;
  signal?: Signal;
  triggerTarget?: Signal;
  damageDealt?: number;
  targetEffectChannel?: TargetEffectChannel;
  combat: ModuleCombatApi;
}

export type StatusApplication = SignalStatusApplication;
export type TargetEffectChannel = 'damage' | 'static' | 'secondary-hit';

/**
 * Describes a modifier effect that follows every target affected by its carrier.
 * Carriers publish targets through ModuleCombatApi instead of knowing which
 * modifiers happen to be installed on them.
 */
export interface ModuleTargetEffect {
  readonly channels: readonly TargetEffectChannel[];
  apply(context: ModuleEffectContext): void;
}

export interface ModuleCombatApi {
  /** Unsorted, non-allocating; the returned array is reused and must not be retained. */
  nearbyEnemies(position: Point, radius: number, excludeIds?: readonly number[]): Signal[];
  nearestSignal(position: Point, radius: number, excludeIds?: readonly number[]): Signal | null;
  dealDamage(signal: Signal, damage: number, color: string, source: Projectile): number;
  affectTarget(signal: Signal, source: Projectile, channel: TargetEffectChannel): void;
  applySlow(signal: Signal, factor: number, duration: number): boolean;
  applyStatus(signal: Signal, status: StatusApplication): boolean;
  retarget(projectile: Projectile, signal: Signal): void;
  displace(signal: Signal, distanceDelta: number): void;
  extendRift(source: Projectile, key: string, position: Point, options: RiftOptions): void;
}

export interface RiftOptions {
  /** Time retained after the carrier expires. */
  duration: number;
  width: number;
  damagePerSecond: number;
  settlementInterval: number;
  modifierInterval: number;
  effectInterval: number;
  color: string;
  /** Keeps strongest-only overlap suppression within one trail family. */
  coverageGroup?: string;
  /** Expires old polyline points while the carrier is still active. */
  pointLifetime?: number;
  contactStatus?: StatusApplication;
  initialPosition?: Point;
  visual?: SpaceRiftVisual;
  jitter?: number;
  hitEffectId?: string;
}

export interface ModuleRuntimeDefinition {
  readonly id: ModuleId;
  readonly kind: ModuleKind;
  /** Self-declared capabilities used by data-driven compatibility rules. */
  readonly tags: readonly ModuleTag[];
  readonly meta: ModuleMeta;
  readonly targetEffect?: ModuleTargetEffect;
  compile(context: ModuleCompileContext): void;
  onCast?(context: ModuleEffectContext): void;
  onHit?(context: ModuleEffectContext): void;
  onTrail?(context: ModuleEffectContext): void;
  onDeploy?(context: ModuleEffectContext): void;
  onTrigger?(context: ModuleEffectContext): void;
}

/** @deprecated Use ModuleRuntimeDefinition. */
export type ModuleDefinition = ModuleRuntimeDefinition;
