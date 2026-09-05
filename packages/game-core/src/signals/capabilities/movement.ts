import type { PulseMovementCapability } from '../types';

export function sinePulseMean(power: number): number {
  const integerPower = Math.max(1, Math.round(power));
  let centralBinomial = 1;
  for (let index = 1; index <= integerPower; index += 1) {
    centralBinomial *= (integerPower + index) / index;
  }
  return centralBinomial / 4 ** integerPower;
}

export function pulseRestSpeedMultiplier(movement: PulseMovementCapability): number {
  const pulseMean = sinePulseMean(movement.wavePower);
  return (1 - movement.peakSpeedMultiplier * pulseMean) / (1 - pulseMean);
}

export function signalMovementSpeedMultiplier(
  movement: PulseMovementCapability | undefined,
  phase: number,
): number {
  if (!movement) return 1;
  const normalizedPhase = ((phase % movement.cycle) + movement.cycle) % movement.cycle;
  const wave = (1 + Math.sin(normalizedPhase / movement.cycle * Math.PI * 2 + Math.PI / 2)) / 2;
  const pulse = wave ** Math.max(1, Math.round(movement.wavePower));
  const restSpeedMultiplier = pulseRestSpeedMultiplier(movement);
  return restSpeedMultiplier + (movement.peakSpeedMultiplier - restSpeedMultiplier) * pulse;
}
