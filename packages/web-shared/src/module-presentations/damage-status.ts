import type { EffectDefinition } from '../effects/types';
import type { ModulePresentation, ModuleIconComponent } from './types';

interface DamageStatusModifierOptions {
  readonly id: string; readonly icon: ModuleIconComponent; readonly color: string; readonly displayColor: string;
  readonly tint: string; readonly effects: readonly EffectDefinition[];
  readonly renderProjectile: NonNullable<ModulePresentation['renderProjectile']>;
}

export const createDamageStatusModifier = (options: DamageStatusModifierOptions): ModulePresentation => ({
  id: options.id, icon: options.icon,
  meta: { color: options.color, displayColor: options.displayColor, tint: options.tint },
  effects: options.effects,
  renderProjectile: options.renderProjectile,
});
