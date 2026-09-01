export { DEFAULT_SIGNAL_ID, SIGNAL_DEFINITIONS, SIGNAL_IDS, signalRegistry } from './registry';
export type { SignalId, SignalVariantId } from './registry';
export { getSignalCapability } from './types';
export { limitSignalContinuousHealthDamage, limitSignalHealthDamage } from './capabilities/damage-cap';
export { resetSignalFullHealTimer, updateSignalFullHeal } from './capabilities/full-heal-after-lull';
export { pulseRestSpeedMultiplier, signalMovementSpeedMultiplier, sinePulseMean } from './capabilities/movement';
export { absorbSignalShieldDamage, createSignalShield, isInsideRegularShield, updateSignalShield } from './capabilities/shield';
export { MENDER_OUT_OF_COMBAT_HEAL_DELAY } from './mender';
export type {
  DamageCapCapability,
  FullHealAfterLullCapability,
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
