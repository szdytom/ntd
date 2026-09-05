import type { ComponentType } from 'react';
import type { EffectDefinition } from '../effects/types';
import type { ModuleId, Projectile } from '@prism-bastion/game-core/game/types';

export interface ModuleIconProps { className?: string }
export type ModuleIconComponent = ComponentType<ModuleIconProps>;
export interface ProjectileRenderContext { ctx: CanvasRenderingContext2D; projectile: Projectile }
export interface ModulePresentationMeta {
  readonly color: string;
  readonly displayColor: string;
  readonly tint: string;
}

/** Browser-only metadata and painters consumed by the presentation registry. */
export interface ModulePresentation {
  readonly id: ModuleId;
  readonly icon: ModuleIconComponent;
  readonly meta: ModulePresentationMeta;
  readonly effects?: readonly EffectDefinition[];
  readonly hideProjectile?: boolean;
  renderProjectile?(context: ProjectileRenderContext): void;
  renderProjectileBloom?(context: ProjectileRenderContext): void;
}
