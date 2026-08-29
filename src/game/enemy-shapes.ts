export interface ShapePoint {
  x: number;
  y: number;
}

export const FRACTURE_SHAPE = {
  spikeCount: 4,
  coreRadiusScale: 0.72,
  spikeBaseRadiusScale: 0.56,
  spikeHalfWidthScale: 0.17,
  rotation: -Math.PI / 2,
} as const;

export function fractureSpikePoints(
  radius: number,
  angle: number,
  centerX = 0,
  centerY = 0,
): readonly [ShapePoint, ShapePoint, ShapePoint] {
  const radialX = Math.cos(angle);
  const radialY = Math.sin(angle);
  const tangentX = -radialY;
  const tangentY = radialX;
  const baseRadius = radius * FRACTURE_SHAPE.spikeBaseRadiusScale;
  const halfWidth = radius * FRACTURE_SHAPE.spikeHalfWidthScale;
  return [
    { x: centerX + radialX * radius, y: centerY + radialY * radius },
    {
      x: centerX + radialX * baseRadius + tangentX * halfWidth,
      y: centerY + radialY * baseRadius + tangentY * halfWidth,
    },
    {
      x: centerX + radialX * baseRadius - tangentX * halfWidth,
      y: centerY + radialY * baseRadius - tangentY * halfWidth,
    },
  ];
}

export function fractureSpikeAngles(): number[] {
  return Array.from({ length: FRACTURE_SHAPE.spikeCount }, (_, index) => (
    FRACTURE_SHAPE.rotation + index * Math.PI * 2 / FRACTURE_SHAPE.spikeCount
  ));
}
