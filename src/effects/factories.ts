import type { EffectDefinition, EffectLayer } from './types';

interface SparkEffectOptions {
  id: string;
  lifetime?: number;
  layer?: EffectLayer;
  count: number;
  distance: number;
  cone?: number;
  length?: number;
  stroke?: number;
  bloom?: number | false;
}

export function coneSparks(options: SparkEffectOptions): EffectDefinition {
  return {
    id: options.id,
    lifetime: options.lifetime ?? 0.32,
    layer: options.layer ?? 'air',
    ...(options.bloom !== undefined ? { bloom: options.bloom } : {}),
    render: (frame, painter) => {
      for (let index = 0; index < options.count; index += 1) {
        const angle = frame.rotation + frame.random(index, -(options.cone ?? Math.PI), options.cone ?? Math.PI);
        const travel = frame.easeOut(3) * options.distance * frame.random(index + 50, 0.45, 1);
        const x = frame.x + Math.cos(angle) * travel;
        const y = frame.y + Math.sin(angle) * travel;
        painter.lineAngle(
          x,
          y,
          angle,
          (options.length ?? 8) * frame.slope * frame.random(index + 90, 0.6, 1.15),
          (options.stroke ?? 2) * frame.fout + 0.35,
          index % 3 === 0 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
    },
  };
}

interface ShockwaveOptions {
  id: string;
  lifetime?: number;
  layer?: EffectLayer;
  radius: number;
  stroke?: number;
  sides?: number;
  bloom?: number | false;
}

export function shockwave(options: ShockwaveOptions): EffectDefinition {
  return {
    id: options.id,
    lifetime: options.lifetime ?? 0.4,
    layer: options.layer ?? 'air',
    ...(options.bloom !== undefined ? { bloom: options.bloom } : {}),
    render: (frame, painter) => {
      const radius = 3 + frame.easeOut(3) * options.radius;
      const stroke = (options.stroke ?? 3) * frame.fout + 0.25;
      if (options.sides) {
        painter.polygon(frame.x, frame.y, radius, options.sides, frame.rotation + frame.fin * 0.4, frame.color, frame.fout, stroke);
      } else {
        painter.ring(frame.x, frame.y, radius, stroke, frame.color, frame.fout);
      }
      painter.light(frame.x, frame.y, radius * 1.35, frame.color, frame.fout * 0.18);
    },
  };
}

interface StatusOrbOptions {
  id: string;
  lifetime?: number;
  size?: number;
  hotColor?: string;
  bloom?: number | false;
}

export function statusOrbs(options: StatusOrbOptions): EffectDefinition {
  const size = options.size ?? 4;
  const hotColor = options.hotColor ?? '#fff3bf';
  return {
    id: options.id,
    lifetime: options.lifetime ?? 0.48,
    layer: 'air',
    bloom: options.bloom ?? 0.78,
    render: (frame, painter) => {
      const data = frame.data as { radius?: number } | undefined;
      const areaRadius = Math.max(1, data?.radius ?? 10);
      const angle = frame.random(0, 0, Math.PI * 2);
      const distance = Math.sqrt(frame.random(1)) * areaRadius * 0.9;
      const x = frame.x + Math.cos(angle) * distance;
      const y = frame.y + Math.sin(angle) * distance;
      const orbSize = size * (0.72 + frame.slope * 0.42) * frame.random(2, 0.78, 1.2);
      painter.circle(x, y, orbSize * 1.75, frame.color, frame.fout * 0.16);
      painter.circle(x, y, orbSize, frame.color, frame.fout * 0.42);
      painter.circle(x, y, orbSize * 0.38, hotColor, frame.fout * 0.58);
      painter.light(x, y, orbSize * 5.2, frame.color, frame.fout * 0.2);
    },
  };
}
