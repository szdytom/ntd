import type { ShieldCapability } from '../types';

export interface SignalShieldState {
  shield: number;
  maxShield: number;
  shieldHitFlash: number;
  shieldRadiusScale: number;
  shieldRippleAge: number;
}

export interface ShieldDamageResult {
  absorbed: number;
  healthDamage: number;
  broke: boolean;
}

export function createSignalShield(
  capability: ShieldCapability | undefined,
  healthScale: number,
): SignalShieldState {
  const maxShield = capability ? Math.round(capability.capacity * healthScale) : 0;
  return {
    shield: maxShield,
    maxShield,
    shieldHitFlash: 0,
    shieldRadiusScale: capability ? 0.15 : 0,
    shieldRippleAge: Number.POSITIVE_INFINITY,
  };
}

export function absorbSignalShieldDamage(
  signal: SignalShieldState,
  damage: number,
  capability: ShieldCapability | undefined,
): ShieldDamageResult {
  const safeDamage = Math.max(0, damage);
  if (!capability || signal.shield <= 0 || safeDamage <= 0) {
    return { absorbed: 0, healthDamage: safeDamage, broke: false };
  }
  const absorbed = Math.min(signal.shield, safeDamage);
  const healthDamage = safeDamage - absorbed;
  signal.shield -= absorbed;
  signal.shieldHitFlash = 1;
  signal.shieldRippleAge = 0;
  const broke = signal.shield <= 0.0001;
  if (broke) signal.shield = -capability.cooldown * capability.regen;
  return { absorbed, healthDamage, broke };
}

export function updateSignalShield(
  signal: SignalShieldState,
  capability: ShieldCapability | undefined,
  delta: number,
): boolean {
  if (!capability || signal.maxShield <= 0) return false;
  const wasOffline = signal.shield <= 0;
  signal.shield = Math.min(signal.maxShield, signal.shield + capability.regen * delta);
  const restored = wasOffline && signal.shield > 0;
  signal.shieldRadiusScale = signal.shield > 0
    ? signal.shieldRadiusScale + (1 - signal.shieldRadiusScale) * Math.min(1, delta * 7)
    : 0;
  return restored;
}

export function isInsideRegularShield(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
  radius: number,
  sides: number,
  rotation: number,
  padding = 0,
): boolean {
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance <= padding) return true;
  const sector = Math.PI * 2 / sides;
  const halfSector = sector / 2;
  const angle = Math.atan2(dy, dx) - rotation;
  const nearestVertex = ((angle + halfSector) % sector + sector) % sector - halfSector;
  const apothem = radius * Math.cos(halfSector);
  const boundary = apothem / Math.cos(halfSector - Math.abs(nearestVertex));
  return distance <= boundary + padding;
}
