import { clamp } from '../game/math';
import { CanvasEffectPainter, MirroredEffectPainter } from './painter';
import type { EffectDefinition, EffectFrame, EffectInstance, EffectLayer, EffectSpawnOptions } from './types';

const LAYERS: EffectLayer[] = ['ground', 'under-projectile', 'projectile', 'air', 'overlay'];
const DEFAULT_BLOOM: Record<EffectLayer, number> = {
  ground: 0.28,
  'under-projectile': 0.62,
  projectile: 0.9,
  air: 0.86,
  overlay: 0.82,
};

const hash = (seed: number): number => {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
};

export class EffectEngine {
  private definitions = new Map<string, EffectDefinition<unknown>>();
  private instances: EffectInstance[] = [];
  private nextId = 1;

  register<TData>(definition: EffectDefinition<TData>): this {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Effect already registered: ${definition.id}`);
    }
    this.definitions.set(definition.id, definition as EffectDefinition<unknown>);
    return this;
  }

  registerMany(definitions: readonly EffectDefinition[]): this {
    definitions.forEach((definition) => this.register(definition));
    return this;
  }

  spawn<TData>(id: string, options: EffectSpawnOptions<TData>): void {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown effect: ${id}`);
    const lifetime = Math.max(0.01, definition.lifetime * (options.lifetimeScale ?? 1));
    this.instances.push({
      definition,
      id: this.nextId++,
      position: { ...options.position },
      rotation: options.rotation ?? 0,
      color: options.color ?? '#ffffff',
      data: options.data,
      time: 0,
      lifetime,
    });
  }

  spawnMany<TData>(ids: readonly string[], options: EffectSpawnOptions<TData>): void {
    ids.forEach((id) => this.spawn(id, options));
  }

  update(delta: number): void {
    for (const instance of this.instances) instance.time += delta;
    this.instances = this.instances.filter((instance) => instance.time < instance.lifetime);
  }

  clear(): void {
    this.instances.length = 0;
  }

  render(ctx: CanvasRenderingContext2D, layer: EffectLayer, emissiveCtx?: CanvasRenderingContext2D): void {
    const scenePainter = new CanvasEffectPainter(ctx);
    for (const instance of this.instances) {
      if ((instance.definition.layer ?? 'air') !== layer) continue;
      ctx.save();
      const intensity = instance.definition.bloom === false
        ? 0
        : instance.definition.bloom ?? DEFAULT_BLOOM[layer];
      if (!emissiveCtx || intensity <= 0) {
        instance.definition.render(this.createFrame(instance), scenePainter);
        ctx.restore();
        continue;
      }
      emissiveCtx.save();
      emissiveCtx.globalCompositeOperation = 'lighter';
      const painter = new MirroredEffectPainter(
        scenePainter,
        new CanvasEffectPainter(emissiveCtx, intensity),
      );
      instance.definition.render(this.createFrame(instance), painter);
      emissiveCtx.restore();
      ctx.restore();
    }
  }

  private createFrame(instance: EffectInstance): EffectFrame {
    const fin = clamp(instance.time / instance.lifetime, 0, 1);
    return {
      id: instance.id,
      x: instance.position.x,
      y: instance.position.y,
      rotation: instance.rotation,
      color: instance.color,
      data: instance.data,
      time: instance.time,
      lifetime: instance.lifetime,
      fin,
      fout: 1 - fin,
      slope: Math.sin(fin * Math.PI),
      easeIn: (power = 2) => fin ** power,
      easeOut: (power = 2) => 1 - (1 - fin) ** power,
      random: (index, min = 0, max = 1) => min + hash(instance.id * 4099 + index * 131) * (max - min),
      randomSign: (index) => hash(instance.id * 4099 + index * 131) < 0.5 ? -1 : 1,
    };
  }

  static readonly layers = LAYERS;
}
