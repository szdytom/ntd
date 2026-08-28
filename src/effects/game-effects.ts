import { coneSparks, shockwave } from './factories';
import type { EffectDefinition } from './types';

interface ShieldEffectData {
  radius: number;
  sides: number;
}

function shieldData(data: unknown): ShieldEffectData {
  const value = data as Partial<ShieldEffectData> | undefined;
  return {
    radius: Math.max(12, value?.radius ?? 44),
    sides: Math.max(3, Math.round(value?.sides ?? 6)),
  };
}

export const gameEffects: readonly EffectDefinition[] = [
  shockwave({ id: 'game:tower-build-ring', lifetime: 0.5, radius: 54, stroke: 3, sides: 6, layer: 'ground' }),
  coneSparks({ id: 'game:tower-build-sparks', lifetime: 0.48, count: 18, distance: 72, length: 10, stroke: 2 }),
  shockwave({ id: 'game:enemy-pop-ring', lifetime: 0.28, radius: 32, stroke: 2.5, sides: 6 }),
  coneSparks({ id: 'game:enemy-pop-sparks', lifetime: 0.42, count: 12, distance: 54, length: 9, stroke: 2 }),
  {
    id: 'game:fracture-split-ripple',
    lifetime: 0.46,
    layer: 'overlay',
    bloom: 1,
    render: (frame, painter) => {
      const radius = 8 + frame.easeOut(3) * 112;
      painter.light(frame.x, frame.y, 42 + frame.slope * 92, '#dffcff', frame.slope * 0.42);
      painter.ring(frame.x, frame.y, radius, 1 + frame.slope * 5, frame.color, frame.slope * 0.94);
      painter.ring(frame.x, frame.y, radius * 0.72, 0.8 + frame.slope * 2.8, '#ffffff', frame.slope * 0.72);
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4 + frame.random(index, -0.18, 0.18);
        painter.lineAngle(
          frame.x + Math.cos(angle) * radius * 0.86,
          frame.y + Math.sin(angle) * radius * 0.86,
          angle,
          7 + frame.slope * 14,
          0.6 + frame.slope * 2.2,
          index % 2 === 0 ? '#ffffff' : frame.color,
          frame.slope,
        );
      }
    },
  },
  {
    id: 'game:shield-hit',
    lifetime: 0.2,
    layer: 'air',
    bloom: 0.95,
    render: (frame, painter) => {
      const { radius } = shieldData(frame.data);
      painter.light(frame.x, frame.y, radius * 1.35, frame.color, frame.fout * 0.3);
    },
  },
  {
    id: 'game:shield-break',
    lifetime: 0.66,
    layer: 'air',
    bloom: 1,
    render: (frame, painter) => {
      const { radius, sides } = shieldData(frame.data);
      const expanded = radius * (1 + frame.easeOut(3) * 0.42);
      painter.polygon(
        frame.x,
        frame.y,
        expanded,
        sides,
        frame.rotation + frame.fin * 0.24,
        frame.color,
        frame.fout,
        0.5 + frame.fout * 5,
      );
      for (let index = 0; index < sides * 2; index += 1) {
        const angle = frame.rotation + index * Math.PI * 2 / (sides * 2) + frame.random(index, -0.08, 0.08);
        const travel = radius * (0.82 + frame.easeOut(2) * frame.random(index + 30, 0.45, 1));
        painter.lineAngle(
          frame.x + Math.cos(angle) * travel,
          frame.y + Math.sin(angle) * travel,
          angle,
          frame.random(index + 60, 8, 18) * frame.fout,
          0.5 + frame.fout * 2.5,
          index % 3 === 0 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
      painter.light(frame.x, frame.y, expanded * 1.45, frame.color, frame.fout * 0.42);
    },
  },
  {
    id: 'game:shield-restore',
    lifetime: 0.52,
    layer: 'air',
    bloom: 0.82,
    render: (frame, painter) => {
      const { radius, sides } = shieldData(frame.data);
      const scale = 0.35 + frame.easeOut(3) * 0.65;
      painter.polygon(
        frame.x,
        frame.y,
        radius * scale,
        sides,
        frame.rotation - frame.fout * 0.18,
        frame.color,
        frame.slope,
        0.5 + frame.slope * 3.5,
      );
      painter.light(frame.x, frame.y, radius * 1.3, frame.color, frame.slope * 0.28);
    },
  },
  {
    id: 'game:core-hit',
    lifetime: 0.55,
    layer: 'overlay',
    render: (frame, painter) => {
      painter.ring(frame.x, frame.y, 8 + frame.easeOut(3) * 70, 5 * frame.fout, frame.color, frame.fout);
      for (let index = 0; index < 10; index += 1) {
        const angle = (index / 10) * Math.PI * 2 + frame.random(index, -0.12, 0.12);
        const radius = 15 + frame.easeOut(2) * frame.random(index + 20, 35, 70);
        painter.triangle(
          frame.x + Math.cos(angle) * radius,
          frame.y + Math.sin(angle) * radius,
          5 * frame.fout,
          15 * frame.fout,
          angle,
          index % 2 === 0 ? '#ffffff' : frame.color,
          frame.fout,
        );
      }
    },
  },
];
