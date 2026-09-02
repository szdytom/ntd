import type { GameMode } from './types';

export type SessionSetupPolicy = 'standard' | 'tutorial' | 'creative';
export type SessionInventoryPolicy = 'limited' | 'unlimited';
export type SessionRewardPolicy = 'draft' | 'none';
export type SessionEconomyPolicy = 'limited' | 'unlimited';
export type SessionWavePolicy = 'level' | 'configured';
export type SessionCorePolicy = 'standard' | 'configured';
export type SessionSignalScalingPolicy = 'level' | 'configured';
export type SessionScenarioControls = 'none' | 'creative';
export type SessionArchivePolicy = 'standard' | 'none';

export interface SessionRules {
  readonly setup: SessionSetupPolicy;
  readonly inventory: SessionInventoryPolicy;
  readonly rewards: SessionRewardPolicy;
  readonly economy: SessionEconomyPolicy;
  readonly waves: SessionWavePolicy;
  readonly core: SessionCorePolicy;
  readonly signalScaling: SessionSignalScalingPolicy;
  readonly scenarioControls: SessionScenarioControls;
  readonly archive: SessionArchivePolicy;
}

const STANDARD_RULES: SessionRules = Object.freeze({
  setup: 'standard',
  inventory: 'limited',
  rewards: 'draft',
  economy: 'limited',
  waves: 'level',
  core: 'standard',
  signalScaling: 'level',
  scenarioControls: 'none',
  archive: 'standard',
});

const TUTORIAL_RULES: SessionRules = Object.freeze({
  ...STANDARD_RULES,
  setup: 'tutorial',
  rewards: 'none',
});

const CREATIVE_RULES: SessionRules = Object.freeze({
  setup: 'creative',
  inventory: 'unlimited',
  rewards: 'none',
  economy: 'unlimited',
  waves: 'configured',
  core: 'configured',
  signalScaling: 'configured',
  scenarioControls: 'creative',
  archive: 'none',
});

export function getSessionRules(mode: GameMode, tutorial: boolean): SessionRules {
  if (mode === 'creative') return CREATIVE_RULES;
  return tutorial ? TUTORIAL_RULES : STANDARD_RULES;
}
