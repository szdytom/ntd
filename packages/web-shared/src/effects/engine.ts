import { clamp } from '@prism-bastion/game-core/game/math';
import { CanvasEffectPainter, MirroredEffectPainter } from './painter';
import type {
  EffectDefinition,
  EffectFrame,
  EffectInstance,
  EffectLayer,
  EffectPainter,
  EffectSpawnOptions,
} from './types';

const LAYERS: EffectLayer[] = ['ground', 'under-projectile', 'projectile', 'air', 'overlay'];
const DEFAULT_BLOOM: Record<EffectLayer, number> = {
  ground: 0.28,
  'under-projectile': 0.62,
  projectile: 0.9,
  air: 0.86,
  overlay: 0.82,
};
const MAX_RECYCLED_EFFECTS = 2_048;

const hash = (seed: number): number => {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
};

class ReusableEffectFrame implements EffectFrame {
  id = 0;
  x = 0;
  y = 0;
  rotation = 0;
  color = '#ffffff';
  data: unknown = undefined;
  time = 0;
  lifetime = 1;
  fin = 0;
  fout = 1;
  slope = 0;

  load(instance: EffectInstance): this {
    this.id = instance.id;
    this.x = instance.position.x;
    this.y = instance.position.y;
    this.rotation = instance.rotation;
    this.color = instance.color;
    this.data = instance.data;
    this.time = instance.time;
    this.lifetime = instance.lifetime;
    this.fin = clamp(instance.time / instance.lifetime, 0, 1);
    this.fout = 1 - this.fin;
    this.slope = Math.sin(this.fin * Math.PI);
    return this;
  }

  easeIn(power = 2): number {
    return this.fin ** power;
  }

  easeOut(power = 2): number {
    return 1 - (1 - this.fin) ** power;
  }

  random(index: number, min = 0, max = 1): number {
    return min + hash(this.id * 4099 + index * 131) * (max - min);
  }

  randomSign(index: number): number {
    return hash(this.id * 4099 + index * 131) < 0.5 ? -1 : 1;
  }
}

export class EffectEngine {
  private definitions = new Map<string, EffectDefinition<unknown>>();
  private instances: EffectInstance[] = [];
  private readonly recycledInstances: EffectInstance[] = [];
  private nextId = 1;
  private readonly frame = new ReusableEffectFrame();
  private sceneContext: CanvasRenderingContext2D | null = null;
  private scenePainter: CanvasEffectPainter | null = null;
  private emissiveContext: CanvasRenderingContext2D | null = null;
  private emissivePainter: CanvasEffectPainter | null = null;
  private mirroredPainter: MirroredEffectPainter | null = null;

  register<TData>(definition: EffectDefinition<TData>): this {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Effect already registered: ${definition.id}`);
    }
    this.definitions.set(definition.id, definition as EffectDefinition<unknown>);
    return this;
  }

  registerMany(definitions: readonly EffectDefinition[]): this {
    for (const definition of definitions) this.register(definition);
    return this;
  }

  spawn<TData>(id: string, options: EffectSpawnOptions<TData>): void {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown effect: ${id}`);
    const lifetime = Math.max(0.01, definition.lifetime * (options.lifetimeScale ?? 1));
    const recycled = this.recycledInstances.pop();
    if (recycled) {
      recycled.definition = definition;
      recycled.id = this.nextId++;
      recycled.position.x = options.position.x;
      recycled.position.y = options.position.y;
      recycled.rotation = options.rotation ?? 0;
      recycled.color = options.color ?? '#ffffff';
      recycled.data = options.data;
      recycled.time = 0;
      recycled.lifetime = lifetime;
      this.instances.push(recycled);
      return;
    }
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
    for (const id of ids) this.spawn(id, options);
  }

  update(delta: number): void {
    let aliveCount = 0;
    for (const instance of this.instances) {
      instance.time += delta;
      if (instance.time >= instance.lifetime) {
        this.recycle(instance);
        continue;
      }
      this.instances[aliveCount] = instance;
      aliveCount += 1;
    }
    this.instances.length = aliveCount;
  }

  clear(): void {
    for (const instance of this.instances) this.recycle(instance);
    this.instances.length = 0;
  }

  render(ctx: CanvasRenderingContext2D, layer: EffectLayer, emissiveCtx?: CanvasRenderingContext2D): void {
    let scenePainter: CanvasEffectPainter | null = null;
    for (const instance of this.instances) {
      if ((instance.definition.layer ?? 'air') !== layer) continue;
      scenePainter ??= this.getScenePainter(ctx);
      ctx.save();
      const intensity = instance.definition.bloom === false
        ? 0
        : instance.definition.bloom ?? DEFAULT_BLOOM[layer];
      if (!emissiveCtx || intensity <= 0) {
        instance.definition.render(this.frame.load(instance), scenePainter);
        ctx.restore();
        continue;
      }
      emissiveCtx.save();
      emissiveCtx.globalCompositeOperation = 'lighter';
      const emissivePainter = this.getEmissivePainter(emissiveCtx, intensity);
      const painter = this.getMirroredPainter(scenePainter, emissivePainter);
      instance.definition.render(this.frame.load(instance), painter);
      emissiveCtx.restore();
      ctx.restore();
    }
  }

  private getScenePainter(ctx: CanvasRenderingContext2D): CanvasEffectPainter {
    if (ctx !== this.sceneContext || !this.scenePainter) {
      this.sceneContext = ctx;
      this.scenePainter = new CanvasEffectPainter(ctx);
    }
    return this.scenePainter;
  }

  private getEmissivePainter(ctx: CanvasRenderingContext2D, intensity: number): CanvasEffectPainter {
    if (ctx !== this.emissiveContext || !this.emissivePainter) {
      this.emissiveContext = ctx;
      this.emissivePainter = new CanvasEffectPainter(ctx, intensity);
    } else this.emissivePainter.setIntensity(intensity);
    return this.emissivePainter;
  }

  private getMirroredPainter(scene: EffectPainter, emissive: EffectPainter): MirroredEffectPainter {
    if (!this.mirroredPainter) this.mirroredPainter = new MirroredEffectPainter(scene, emissive);
    else this.mirroredPainter.setPainters(scene, emissive);
    return this.mirroredPainter;
  }

  private recycle(instance: EffectInstance): void {
    if (this.recycledInstances.length >= MAX_RECYCLED_EFFECTS) return;
    instance.data = undefined;
    this.recycledInstances.push(instance);
  }

  static readonly layers = LAYERS;
}
