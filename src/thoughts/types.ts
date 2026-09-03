import type { CombatEvent } from '../game/combat-events';
import type { CombatSceneModel, ScenarioSignalPosition } from '../game/combat-runtime';
import type { ModuleId, ProgramDiagnosticCode, SignalId } from '../game/types';
import type { ModuleKind } from '../modules/types';

export type ThoughtChapter = ModuleKind;
export type ThoughtFlow = 'compile' | 'cast' | 'impact' | 'payload' | 'trail' | 'focus' | 'observe';
export type ThoughtEase = 'linear' | 'smooth' | 'ease-in' | 'ease-out';
export type ThoughtLoadoutMode = 'hidden' | 'dialog' | 'dialog-leaving' | 'compact' | 'compact-leaving';
export type ThoughtLoadoutPlacement = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export interface ThoughtLoadoutReplacement {
  readonly towerIndex: number;
  readonly slot: number;
  readonly from: ModuleId;
  readonly to: ModuleId;
}
export interface ThoughtLoadoutTarget {
  readonly towerIndex: number;
  readonly placement: ThoughtLoadoutPlacement;
}
export type ThoughtOverlayTarget =
  | 'tower'
  | 'signal'
  | { readonly slot: number; readonly towerIndex?: number }
  | { readonly towerIndex: number }
  | { readonly signalRef: string }
  | { readonly projectileRef: string }
  | { readonly projectileGroupRef: string }
  | { readonly trailRef: string; readonly anchor: 'start' | 'middle' | 'end' };

export type ThoughtOverlay =
  | { readonly type: 'loadout'; readonly target: 'tower' | { readonly towerIndex: number }; readonly placement?: ThoughtLoadoutPlacement }
  | { readonly type: 'loadouts'; readonly targets: readonly ThoughtLoadoutTarget[] }
  | { readonly type: 'caption'; readonly textKey: string; readonly target: ThoughtOverlayTarget };

export interface ThoughtSceneValues {
  readonly pathProgress: number;
  readonly towerPadOpacity: number;
  readonly towerOpacity: number;
  readonly signalOpacity: number;
  readonly simulationRate: number;
  readonly towerRotation?: number;
  readonly towerPadOpacities?: readonly number[];
  readonly towerOpacities?: readonly number[];
  readonly towerRotations?: readonly number[];
}

export type ThoughtSubject = { readonly type: 'module'; readonly moduleId: ModuleId };

export type ThoughtAction =
  | { readonly type: 'setup'; readonly slots: readonly ModuleId[] }
  | {
    readonly type: 'setup-towers';
    readonly loadouts: readonly { readonly towerIndex: number; readonly slots: readonly ModuleId[] }[];
  }
  | { readonly type: 'spawn-signal'; readonly signal: SignalId; readonly position?: ScenarioSignalPosition; readonly captureAs?: string }
  | { readonly type: 'set-tower-casting'; readonly enabled: boolean; readonly towerIndex?: number }
  | { readonly type: 'delete-signals' }
  | { readonly type: 'compile' };

export interface ThoughtEventMatcher {
  readonly type: CombatEvent['type'];
  readonly moduleId?: ModuleId;
  readonly captureAs?: string;
  readonly occurrence?: number;
}

export interface ThoughtSignalStateRequirement {
  readonly signalRef: string;
  readonly alive?: boolean;
  readonly slowed?: boolean;
  readonly statusId?: string;
}

export interface ThoughtProjectileStateRequirement {
  readonly projectileRef: string;
  readonly alive?: boolean;
  readonly minimumTravelDistance?: number;
}

export interface ThoughtCue {
  readonly id: string;
  readonly actions?: readonly ThoughtAction[];
  readonly duration?: number;
  readonly waitFor?: ThoughtEventMatcher;
  readonly waitForClear?: boolean;
  readonly waitForSignalsPastNode?: string;
  readonly waitForTowerEnergy?: boolean;
  readonly waitForSignalStates?: readonly ThoughtSignalStateRequirement[];
  readonly waitForProjectileStates?: readonly ThoughtProjectileStateRequirement[];
  readonly timeout?: number;
  readonly transition?: Partial<ThoughtSceneValues>;
  readonly transitionDuration?: number;
  readonly ease?: ThoughtEase;
  readonly overlay?: ThoughtOverlay;
  readonly sectionTitleKey?: string;
  readonly loadoutMode?: ThoughtLoadoutMode;
  readonly loadoutVisibleSlots?: number;
  readonly loadoutVisibleRange?: { readonly start: number; readonly count: number };
  readonly animateLoadoutChanges?: boolean;
  readonly placementBurst?: boolean;
  readonly placementBurstTowerIndex?: number;
  readonly highlightSlots?: readonly number[];
  readonly requireSignalState?: ThoughtSignalStateRequirement;
  readonly timelineWait?: boolean;
}

export interface ThoughtBeat {
  readonly id: string;
  readonly captionKey: string;
  readonly flow: ThoughtFlow;
  readonly timelineDuration: number;
  readonly actions?: readonly ThoughtAction[];
  readonly duration?: number;
  readonly waitFor?: ThoughtEventMatcher;
  readonly timeout?: number;
  readonly highlightSlots?: readonly number[];
  readonly comparisonKey?: string;
  readonly cues?: readonly ThoughtCue[];
}

export interface ThoughtDefinition {
  readonly id: string;
  readonly chapter: ThoughtChapter;
  readonly subject: ThoughtSubject;
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly accent: string;
  readonly relatedModuleIds: readonly ModuleId[];
  readonly relatedDiagnostics?: readonly ProgramDiagnosticCode[];
  readonly seed: number;
  readonly scene?: CombatSceneModel;
  readonly initialScene?: Partial<ThoughtSceneValues>;
  readonly beats: readonly ThoughtBeat[];
}

export type ThoughtPlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'error';

export interface ThoughtPlayerSnapshot {
  readonly status: ThoughtPlaybackStatus;
  readonly beatIndex: number;
  readonly beatCount: number;
  readonly speed: 0.5 | 1 | 2;
  readonly captionKey: string;
  readonly slots: readonly ModuleId[];
  readonly highlightSlots: readonly number[];
  readonly comparisonKey?: string;
  readonly flow: ThoughtFlow;
  readonly cueId: string;
  readonly cueDuration: number;
  readonly overlay?: ThoughtOverlay;
  readonly sectionTitleKey?: string;
  readonly loadoutMode: ThoughtLoadoutMode;
  readonly loadoutPlacement: ThoughtLoadoutPlacement;
  readonly loadoutTargets: readonly ThoughtLoadoutTarget[];
  readonly loadoutVisibleSlots?: number;
  readonly loadoutVisibleRange?: { readonly start: number; readonly count: number };
  readonly loadoutReplacements: readonly ThoughtLoadoutReplacement[];
  readonly placementBurst: boolean;
  readonly placementBurstTowerIndex: number;
  readonly error?: string;
}
