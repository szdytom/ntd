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

export const SURGE_SHAPE = {
  rearwardScale: 0.72,
  halfWidthScale: 0.78,
  notchScale: 0.36,
} as const;

export const ANVIL_SHAPE = {
  sides: 5,
  plateRadiusScale: 0.76,
  grooveStartRadiusScale: 0.43,
  grooveEndRadiusScale: 0.7,
  coreRadiusScale: 0.38,
} as const;

export function regularPolygonPoints(
  radius: number,
  sides: number,
  rotation: number,
  centerX = 0,
  centerY = 0,
): readonly ShapePoint[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + index * Math.PI * 2 / sides;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
}

export function surgeBodyPoints(radius: number): readonly [ShapePoint, ShapePoint, ShapePoint, ShapePoint] {
  return [
    { x: radius, y: 0 },
    { x: -radius * SURGE_SHAPE.rearwardScale, y: radius * SURGE_SHAPE.halfWidthScale },
    { x: -radius * SURGE_SHAPE.notchScale, y: 0 },
    { x: -radius * SURGE_SHAPE.rearwardScale, y: -radius * SURGE_SHAPE.halfWidthScale },
  ];
}

export function traceSurgeBody(ctx: CanvasRenderingContext2D, radius: number): void {
  const rearward = radius * SURGE_SHAPE.rearwardScale;
  const halfWidth = radius * SURGE_SHAPE.halfWidthScale;
  const notch = radius * SURGE_SHAPE.notchScale;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(-rearward, halfWidth);
  ctx.lineTo(-notch, 0);
  ctx.lineTo(-rearward, -halfWidth);
  ctx.closePath();
}

const FRACTURE_SPIKE_ANGLES: readonly number[] = Object.freeze(
  Array.from({ length: FRACTURE_SHAPE.spikeCount }, (_, index) => (
    FRACTURE_SHAPE.rotation + index * Math.PI * 2 / FRACTURE_SHAPE.spikeCount
  )),
);

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

export function fractureSpikeAngles(): readonly number[] {
  return FRACTURE_SPIKE_ANGLES;
}

export function traceFractureSpike(
  ctx: CanvasRenderingContext2D,
  radius: number,
  angle: number,
): void {
  const radialX = Math.cos(angle);
  const radialY = Math.sin(angle);
  const tangentX = -radialY;
  const tangentY = radialX;
  const baseRadius = radius * FRACTURE_SHAPE.spikeBaseRadiusScale;
  const halfWidth = radius * FRACTURE_SHAPE.spikeHalfWidthScale;
  ctx.beginPath();
  ctx.moveTo(radialX * radius, radialY * radius);
  ctx.lineTo(
    radialX * baseRadius + tangentX * halfWidth,
    radialY * baseRadius + tangentY * halfWidth,
  );
  ctx.lineTo(
    radialX * baseRadius - tangentX * halfWidth,
    radialY * baseRadius - tangentY * halfWidth,
  );
  ctx.closePath();
}
