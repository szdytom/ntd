export interface DiamondRiftRadii {
  inner: number;
  outer: number;
}

export const resolveDiamondRiftRadii = (
  radius: number,
  width: number,
  collapse: number,
): DiamondRiftRadii => {
  const visibleWidth = Math.max(0, Math.min(1, collapse)) * width / Math.SQRT2;
  return {
    inner: Math.max(0, radius - visibleWidth),
    outer: radius + visibleWidth,
  };
};
