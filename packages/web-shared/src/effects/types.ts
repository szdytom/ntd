import type { Point } from '@prism-bastion/game-core/game/types';

export type EffectLayer = 'ground' | 'under-projectile' | 'projectile' | 'air' | 'overlay';

export interface EffectSpawnOptions<TData = unknown> {
  position: Point;
  rotation?: number;
  color?: string;
  data?: TData;
  lifetimeScale?: number;
}

export interface EffectFrame<TData = unknown> {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly color: string;
  readonly data: TData;
  readonly time: number;
  readonly lifetime: number;
  readonly fin: number;
  readonly fout: number;
  readonly slope: number;
  easeIn(power?: number): number;
  easeOut(power?: number): number;
  random(index: number, min?: number, max?: number): number;
  randomSign(index: number): number;
}

export interface EffectDefinition<TData = unknown> {
  readonly id: string;
  readonly lifetime: number;
  readonly layer?: EffectLayer;
  /** Emission strength for the dedicated bloom pass. False excludes the effect. */
  readonly bloom?: number | false;
  readonly render: (frame: EffectFrame<TData>, painter: EffectPainter) => void;
}

export interface EffectPainter {
  readonly ctx: CanvasRenderingContext2D;
  circle(x: number, y: number, radius: number, color: string, alpha?: number): void;
  ring(x: number, y: number, radius: number, stroke: number, color: string, alpha?: number): void;
  line(x1: number, y1: number, x2: number, y2: number, stroke: number, color: string, alpha?: number): void;
  lineAngle(x: number, y: number, angle: number, length: number, stroke: number, color: string, alpha?: number): void;
  polygon(x: number, y: number, radius: number, sides: number, rotation: number, color: string, alpha?: number, stroke?: number): void;
  triangle(x: number, y: number, width: number, length: number, rotation: number, color: string, alpha?: number): void;
  light(x: number, y: number, radius: number, color: string, alpha?: number): void;
}

export interface EffectInstance {
  definition: EffectDefinition<unknown>;
  id: number;
  position: Point;
  rotation: number;
  color: string;
  data: unknown;
  time: number;
  lifetime: number;
}
