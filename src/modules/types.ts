import type { EffectDefinition } from '../effects/types';
import type { EffectEngine } from '../effects/engine';
import type {
  Enemy,
  EnemyStatus,
  ModuleId,
  Point,
  Projectile,
  ShotBlueprint,
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
  | 'rift-space'
  | 'route'
  | 'static'
  | 'status'
  | 'trail'
  | 'trigger';
export type ModuleRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type ModuleTextValues = Readonly<Record<string, string | number>>;

export interface ModuleMeta {
  name: string;
  shortName: string;
  symbol: string;
  color: string;
  tint: string;
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
  lifetime?: number;
  static?: StaticProjectileSpec;
  collision?: 'enemy' | 'none';
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
  effects: EffectEngine;
  position: Point;
  rotation: number;
  color: string;
  shot: ShotBlueprint;
  tower?: Tower;
  projectile?: Projectile;
  enemy?: Enemy;
  triggerTarget?: Enemy;
  damageDealt?: number;
  targetEffectChannel?: TargetEffectChannel;
  combat: ModuleCombatApi;
}

export type StatusApplication = Omit<EnemyStatus, 'remaining' | 'tickTimer' | 'particleTimer'>;
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
  nearbyEnemies(position: Point, radius: number, excludeIds?: readonly number[]): Enemy[];
  nearestEnemy(position: Point, radius: number, excludeIds?: readonly number[]): Enemy | null;
  dealDamage(enemy: Enemy, damage: number, color: string, source: Projectile): number;
  affectTarget(enemy: Enemy, source: Projectile, channel: TargetEffectChannel): void;
  applySlow(enemy: Enemy, factor: number, duration: number): boolean;
  applyStatus(enemy: Enemy, status: StatusApplication): boolean;
  retarget(projectile: Projectile, enemy: Enemy): void;
  displace(enemy: Enemy, distanceDelta: number): void;
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
  jitter?: number;
  hitEffectId?: string;
}

export interface ProjectileRenderContext {
  ctx: CanvasRenderingContext2D;
  projectile: Projectile;
}

export interface ModuleDefinition {
  readonly id: ModuleId;
  readonly kind: ModuleKind;
  /** Self-declared capabilities used by data-driven compatibility rules. */
  readonly tags: readonly ModuleTag[];
  readonly meta: ModuleMeta;
  readonly effects?: readonly EffectDefinition[];
  readonly targetEffect?: ModuleTargetEffect;
  compile(context: ModuleCompileContext): void;
  renderProjectile?(context: ProjectileRenderContext): void;
  renderProjectileBloom?(context: ProjectileRenderContext): void;
  onCast?(context: ModuleEffectContext): void;
  onHit?(context: ModuleEffectContext): void;
  onTrail?(context: ModuleEffectContext): void;
  onDeploy?(context: ModuleEffectContext): void;
  onTrigger?(context: ModuleEffectContext): void;
}
