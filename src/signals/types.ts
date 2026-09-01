export interface SignalStats {
  health: number;
  speed: number;
  spawnDelay: number;
  reward: number;
  coreDamage: number;
  radius: number;
  boss?: boolean;
}

export interface PulseMovementCapability {
  kind: 'pulse-movement';
  cycle: number;
  peakSpeedMultiplier: number;
  wavePower: number;
}

export interface ShieldCapability {
  kind: 'shield';
  capacity: number;
  regen: number;
  cooldown: number;
  radius: number;
  sides: number;
  rotation: number;
  color: string;
}

export interface DamageCapCapability {
  kind: 'damage-cap';
  damageCap: number;
  continuousDamageCapPerSecond: number;
}

export interface FullHealAfterLullCapability {
  kind: 'full-heal-after-lull';
  delay: number;
}

export interface HealthRegenerationCapability {
  kind: 'health-regeneration';
  rate: number;
}

export interface SplitOnDeathCapability {
  kind: 'split-on-death';
  count: number;
  childVariantId: string;
  healthScale: number;
  speedScale: number;
  rewardScale: number;
  coreDamageScale: number;
  radiusScale: number;
  spacing: number;
  delay: number;
  rippleDuration: number;
  effectColor: string;
}

export interface TowerSuppressionCapability {
  kind: 'tower-suppression-aura';
  radius: number;
  cooldownMultiplier: number;
  energyRegenMultiplier: number;
  color: string;
  lightningColor: string;
  lightningCoreColor: string;
}

export type SignalCapability =
  | PulseMovementCapability
  | ShieldCapability
  | DamageCapCapability
  | FullHealAfterLullCapability
  | HealthRegenerationCapability
  | SplitOnDeathCapability
  | TowerSuppressionCapability;
export type SignalCapabilityKind = SignalCapability['kind'];
export type SignalCapabilityOf<Kind extends SignalCapabilityKind> = Extract<SignalCapability, { kind: Kind }>;

export type SignalGeometry = 'polygon' | 'surge' | 'fracture' | 'anvil' | 'ring' | 'hexagram';
export interface SignalVisualDefinition {
  color: string;
  geometry: SignalGeometry;
  sides: number;
  rotationOffset?: number;
  spin?: number;
  innerOutline?: boolean;
  crownOrbit?: boolean;
  orbitNodes?: number;
  labelContrast?: 'dark' | 'light';
  deathEffectScale?: number;
}

export interface SignalTextDefinition {
  nameKey: string;
  roleKey: string;
  descriptionKey: string;
  counterKey: string;
}

export interface SignalVariantDefinition {
  id: string;
  text: Pick<SignalTextDefinition, 'nameKey' | 'roleKey' | 'descriptionKey'>;
}

export interface SignalArchiveAbilityDefinition {
  labelKey: string;
  detailKey: string;
  values?: Readonly<Record<string, string | number>>;
}

export type SignalArchiveSpecimen =
  | { kind: 'split-result'; capability: 'split-on-death' }
  | { kind: 'tower-under-aura'; capability: 'tower-suppression-aura' };

export interface SignalArchiveDemoMode {
  id: string;
  actionKey: string;
  restoreKey: string;
  specimen: SignalArchiveSpecimen;
  profile: 'split-child' | 'suppressed-tower';
  text: Pick<SignalTextDefinition, 'nameKey' | 'roleKey' | 'descriptionKey'>;
}

export interface SignalArchiveDefinition {
  ability: SignalArchiveAbilityDefinition;
  demo?: {
    initialMode: 'base';
    modes: readonly SignalArchiveDemoMode[];
  };
}

export interface SignalDefinition<Id extends string = string> {
  id: Id;
  stats: SignalStats;
  text: SignalTextDefinition;
  visual: SignalVisualDefinition;
  capabilities: readonly SignalCapability[];
  variants?: readonly SignalVariantDefinition[];
  archive: SignalArchiveDefinition;
}

export function getSignalCapability<Kind extends SignalCapabilityKind>(
  definition: SignalDefinition,
  kind: Kind,
): SignalCapabilityOf<Kind> | undefined {
  return definition.capabilities.find((capability): capability is SignalCapabilityOf<Kind> => capability.kind === kind);
}
