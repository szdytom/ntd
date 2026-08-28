import type { EffectEngine } from '../effects/engine';
import type { ModuleId, TowerProgram } from '../game/types';
import { compileProgram } from './compiler';
import type { ModuleDefinition, ModuleEffectContext, ProjectileRenderContext } from './types';

export class ModuleRegistry {
  private definitions = new Map<ModuleId, ModuleDefinition>();
  private compileCache = new Map<string, TowerProgram>();

  register(definition: ModuleDefinition): this {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Module already registered: ${definition.id}`);
    }
    this.definitions.set(definition.id, definition);
    this.compileCache.clear();
    return this;
  }

  get(id: ModuleId): ModuleDefinition | undefined {
    return this.definitions.get(id);
  }

  require(id: ModuleId): ModuleDefinition {
    const definition = this.get(id);
    if (!definition) throw new Error(`Unknown module: ${id}`);
    return definition;
  }

  list(): ModuleDefinition[] {
    return [...this.definitions.values()];
  }

  compile(slots: Array<ModuleId | null>): TowerProgram {
    const key = JSON.stringify(slots);
    const cached = this.compileCache.get(key);
    if (cached) return cached;
    const program = compileProgram(slots, this);
    if (this.compileCache.size >= 512) {
      const oldest = this.compileCache.keys().next().value;
      if (oldest !== undefined) this.compileCache.delete(oldest);
    }
    this.compileCache.set(key, program);
    return program;
  }

  registerEffects(engine: EffectEngine): void {
    for (const definition of this.definitions.values()) {
      for (const effect of definition.effects ?? []) engine.register(effect);
    }
  }

  dispatch(
    hook: 'onCast' | 'onHit' | 'onTrail' | 'onDeploy' | 'onTrigger',
    moduleIds: readonly ModuleId[],
    context: ModuleEffectContext,
  ): void {
    for (const id of moduleIds) this.definitions.get(id)?.[hook]?.(context);
  }

  renderProjectile(moduleIds: readonly ModuleId[], context: ProjectileRenderContext): void {
    const source = context.projectile.shot.source;
    this.definitions.get(source)?.renderProjectile?.(context);
    for (const id of moduleIds) {
      if (id !== source) this.definitions.get(id)?.renderProjectile?.(context);
    }
  }
}
