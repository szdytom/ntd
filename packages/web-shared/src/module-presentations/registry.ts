import type { ModuleId } from '@prism-bastion/game-core/game/types';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';
import { isIneffectiveCombination } from '@prism-bastion/game-core/modules/compatibility';
import type { EffectEngine } from '../effects/engine';
import type { ModulePresentation, ProjectileRenderContext } from './types';

export class ModulePresentationRegistry {
  private readonly definitions = new Map<ModuleId, ModulePresentation>();
  private readonly runtimeDefinitions = createModuleRegistry();

  register(definition: ModulePresentation): this {
    if (this.definitions.has(definition.id)) throw new Error(`Module presentation already registered: ${definition.id}`);
    this.definitions.set(definition.id, definition);
    return this;
  }
  get(id: ModuleId): ModulePresentation | undefined { return this.definitions.get(id); }
  require(id: ModuleId): ModulePresentation {
    const definition = this.get(id);
    if (!definition) throw new Error(`Unknown module presentation: ${id}`);
    return definition;
  }
  list(): ModulePresentation[] { return [...this.definitions.values()]; }
  registerEffects(engine: EffectEngine): void {
    for (const definition of this.definitions.values()) {
      for (const effect of definition.effects ?? []) engine.register(effect);
    }
  }
  renderProjectile(moduleIds: readonly ModuleId[], context: ProjectileRenderContext): void {
    const source = context.projectile.shot.source;
    const sourceDefinition = this.get(source);
    if (sourceDefinition?.hideProjectile) return;
    sourceDefinition?.renderProjectile?.(context);
    for (const id of moduleIds) {
      const definition = this.get(id);
      if (id !== source && definition && this.isEffectiveForShot(definition, source)) definition.renderProjectile?.(context);
    }
  }
  renderProjectileBloom(moduleIds: readonly ModuleId[], context: ProjectileRenderContext): boolean {
    let rendered = false;
    const source = context.projectile.shot.source;
    const sourceDefinition = this.get(source);
    if (sourceDefinition?.hideProjectile) return true;
    if (sourceDefinition?.renderProjectileBloom) { sourceDefinition.renderProjectileBloom(context); rendered = true; }
    for (const id of moduleIds) {
      if (id === source) continue;
      const definition = this.get(id);
      if (!definition || !this.isEffectiveForShot(definition, source) || !definition.renderProjectileBloom) continue;
      definition.renderProjectileBloom(context); rendered = true;
    }
    return rendered;
  }
  private isEffectiveForShot(definition: ModulePresentation, sourceId: ModuleId): boolean {
    const source = this.runtimeDefinitions.get(sourceId);
    const subject = this.runtimeDefinitions.get(definition.id);
    return definition.id === sourceId || !source || !subject || !isIneffectiveCombination(subject, source);
  }
}
