export { DEFAULT_SIGNAL_ID, SIGNAL_DEFINITIONS, SIGNAL_IDS, signalRegistry } from './registry';
export type { SignalId, SignalVariantId } from './registry';
export { getSignalCapability } from './types';
export { limitSignalContinuousHealthDamage, limitSignalHealthDamage } from './capabilities/damage-cap';
export { pulseRestSpeedMultiplier, signalMovementSpeedMultiplier, sinePulseMean } from './capabilities/movement';
export { absorbSignalShieldDamage, createSignalShield, isInsideRegularShield, updateSignalShield } from './capabilities/shield';
export type {
  DamageCapCapability,
  PulseMovementCapability,
  ShieldCapability,
  SignalArchiveDemoMode,
  SignalCapability,
  SignalDefinition,
  SignalStats,
  SignalVisualDefinition,
  SplitOnDeathCapability,
  TowerSuppressionCapability,
} from './types';
