import type { ModuleId, TowerProgram } from '../game/types';
import { compileProgram } from './compiler';
import { isIneffectiveCombination } from './compatibility';
import type {
  ModuleDefinition,
  ModuleEffectContext,
  ModuleTag,
  TargetEffectChannel,
} from './types';

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

  hasTag(id: ModuleId, tag: ModuleTag): boolean {
    return this.definitions.get(id)?.tags.includes(tag) ?? false;
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

  dispatch(
    hook: 'onCast' | 'onHit' | 'onTrail' | 'onDeploy' | 'onTrigger',
    moduleIds: readonly ModuleId[],
    context: ModuleEffectContext,
  ): void {
    for (const id of moduleIds) {
      const definition = this.definitions.get(id);
      if (!definition || !this.isEffectiveForShot(definition, context.shot.source)) continue;
      definition[hook]?.(context);
    }
  }

  dispatchTargetEffect(
    channel: TargetEffectChannel,
    moduleIds: readonly ModuleId[],
    context: ModuleEffectContext,
  ): void {
    for (const id of moduleIds) {
      const definition = this.definitions.get(id);
      if (!definition || !this.isEffectiveForShot(definition, context.shot.source)) continue;
      const effect = definition.targetEffect;
      if (effect?.channels.includes(channel)) effect.apply(context);
    }
  }

  private isEffectiveForShot(definition: ModuleDefinition, sourceId: ModuleId): boolean {
    if (definition.id === sourceId) return true;
    const source = this.definitions.get(sourceId);
    return !source || !isIneffectiveCombination(definition, source);
  }
}
