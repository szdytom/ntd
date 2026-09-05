import type { EffectDefinition, EffectLayer } from '../effects/types';

export const STARFIRE_COLOR = '#a855f7';
export const STARFIRE_ACCENT = '#ffd166';
export const STARFIRE_HOT_COLOR = '#fff4c2';
export const STARFIRE_PLASMA_COLOR = '#7c3aed';
export const STARFIRE_SMOKE_COLOR = '#352d45';
export const STARFIRE_TINT = '#f4e8ff';

interface StarfallParticlesOptions {
  id: string;
  lifetime?: number;
  layer?: EffectLayer;
  count: number;
  distanceMin: number;
  distanceMax: number;
  scale?: number;
  bloom?: number | false;
}

/** Seeded purple, gold, and white starfall fragments shared by Starfire modules. */
export const starfallParticles = (options: StarfallParticlesOptions): EffectDefinition => {
  const scale = options.scale ?? 1;
  return {
    id: options.id,
    lifetime: options.lifetime ?? 0.9,
    layer: options.layer ?? 'air',
    bloom: options.bloom ?? 1,
    render: (frame, painter) => {
      for (let index = 0; index < options.count; index += 1) {
        const angle = frame.random(index, 0, Math.PI * 2);
        const startRadius = frame.random(index + 30, options.distanceMin, options.distanceMax);
        const speed = frame.random(index + 60, 0.62, 1);
        const radius = 8 * scale + frame.easeOut(3) * startRadius * speed;
        const x = frame.x + Math.cos(angle) * radius;
        const y = frame.y + Math.sin(angle) * radius - frame.fin * frame.random(index + 90, 0, 12 * scale);
        if (index % 4 === 0) {
          painter.circle(
            x,
            y,
            (1.5 + frame.slope * frame.random(index + 120, 4, 8)) * scale,
            frame.fin < 0.54 ? STARFIRE_PLASMA_COLOR : STARFIRE_SMOKE_COLOR,
            frame.fout * 0.72,
          );
        } else {
          const particleColor = index % 3 === 0
            ? STARFIRE_PLASMA_COLOR
            : index % 3 === 1 ? STARFIRE_ACCENT : STARFIRE_COLOR;
          painter.lineAngle(
            x,
            y,
            angle,
            (4 + frame.random(index + 150, 10, 24) * frame.fout) * scale,
            (3.2 * frame.fout + 0.45) * scale,
            particleColor,
            frame.fout,
          );
          painter.circle(x, y, (1.7 + 2.8 * frame.fout) * scale, particleColor, frame.fout * 0.92);
        }
      }
    },
  };
};
