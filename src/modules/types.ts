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
export type ModuleRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ModuleMeta {
  name: string;
  shortName: string;
  symbol: string;
  color: string;
  tint: string;
  energy: number;
  rarity: ModuleRarity;
  description: string;
  detail: string;
}

export interface ProjectileSpec {
  damage: number;
  speed: number;
  size: number;
  pierce?: number;
  splash?: number;
  lifetime?: number;
  static?: StaticProjectileSpec;
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
  combat: ModuleCombatApi;
}

export type StatusApplication = Omit<EnemyStatus, 'remaining' | 'tickTimer'>;

export interface ModuleCombatApi {
  nearbyEnemies(position: Point, radius: number, excludeIds?: readonly number[]): Enemy[];
  dealDamage(enemy: Enemy, damage: number, color: string, source?: Projectile): void;
  applyStatus(enemy: Enemy, status: StatusApplication): void;
  retarget(projectile: Projectile, enemy: Enemy): void;
  displace(enemy: Enemy, distanceDelta: number): void;
}

export interface ProjectileRenderContext {
  ctx: CanvasRenderingContext2D;
  projectile: Projectile;
}

export interface ModuleDefinition {
  readonly id: ModuleId;
  readonly kind: ModuleKind;
  readonly meta: ModuleMeta;
  readonly effects?: readonly EffectDefinition[];
  compile(context: ModuleCompileContext): void;
  renderProjectile?(context: ProjectileRenderContext): void;
  onCast?(context: ModuleEffectContext): void;
  onHit?(context: ModuleEffectContext): void;
  onTrail?(context: ModuleEffectContext): void;
  onDeploy?(context: ModuleEffectContext): void;
  onTrigger?(context: ModuleEffectContext): void;
}
