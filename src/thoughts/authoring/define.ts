import type { CombatSceneModel } from '../../game/combat-runtime';
import type { ModuleId, ProgramDiagnosticCode } from '../../game/types';
import type { ModuleDefinition } from '../../modules/types';
import type { ThoughtBeat, ThoughtDefinition, ThoughtSceneValues } from '../types';

export interface ThoughtSceneContext {
  readonly thoughtId: string;
  readonly accent: string;
}

export type ThoughtSceneFactory = (context: ThoughtSceneContext) => CombatSceneModel;

export interface ModuleThoughtOptions {
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly seed: number;
  readonly beats: readonly ThoughtBeat[];
  readonly accent?: string;
  readonly scene?: CombatSceneModel | ThoughtSceneFactory;
  readonly initialScene?: Partial<ThoughtSceneValues>;
  readonly searchModuleIds?: readonly ModuleId[];
  readonly relatedDiagnostics?: readonly ProgramDiagnosticCode[];
}

const modulesUsedBy = (beats: readonly ThoughtBeat[]): readonly ModuleId[] => {
  const moduleIds = new Set<ModuleId>();
  for (const beat of beats) {
    const actions = [
      ...(beat.actions ?? []),
      ...(beat.cues?.flatMap((cue) => cue.actions ?? []) ?? []),
    ];
    for (const action of actions) {
      if (action.type === 'setup') action.slots.forEach((moduleId) => moduleIds.add(moduleId));
      if (action.type === 'setup-towers') {
        action.loadouts.forEach((loadout) => loadout.slots.forEach((moduleId) => moduleIds.add(moduleId)));
      }
      if (action.type === 'compile' || action.type === 'set-tower-casting' || action.type === 'spawn-signal') continue;
    }
  }
  return [...moduleIds];
};

export const defineModuleThought = (
  module: ModuleDefinition,
  options: ModuleThoughtOptions,
): ThoughtDefinition => {
  const accent = options.accent ?? module.meta.color;
  const relatedModuleIds = new Set<ModuleId>([
    module.id,
    ...modulesUsedBy(options.beats),
    ...(options.searchModuleIds ?? []),
  ]);
  const scene = typeof options.scene === 'function'
    ? options.scene({ thoughtId: module.id, accent })
    : options.scene;

  return {
    id: module.id,
    chapter: module.kind,
    subject: { type: 'module', moduleId: module.id },
    titleKey: options.titleKey,
    summaryKey: options.summaryKey,
    accent,
    relatedModuleIds: [...relatedModuleIds],
    seed: options.seed,
    beats: options.beats,
    ...(options.relatedDiagnostics ? { relatedDiagnostics: options.relatedDiagnostics } : {}),
    ...(scene ? { scene } : {}),
    ...(options.initialScene ? { initialScene: options.initialScene } : {}),
  };
};
