import type { ModuleId, ProgramDiagnosticCode } from '../game/types';
import { THOUGHT_CATALOG } from './catalog';
import type { ThoughtDefinition } from './types';

export class ThoughtRegistry {
  private readonly definitions = new Map<string, ThoughtDefinition>();
  private readonly byModule = new Map<ModuleId, ThoughtDefinition>();
  private readonly byDiagnostic = new Map<ProgramDiagnosticCode, ThoughtDefinition>();

  constructor(definitions: readonly ThoughtDefinition[]) {
    for (const definition of definitions) {
      if (this.definitions.has(definition.id)) throw new Error(`Duplicate thought: ${definition.id}`);
      if (definition.beats.length === 0) throw new Error(`Thought ${definition.id} requires at least one beat`);
      if (definition.scene) {
        const points = [
          ...definition.scene.path,
          definition.scene.tower,
          ...(definition.scene.towerPads ?? []),
          ...[...(definition.scene.graph?.nodes.values() ?? [])].map((node) => node.position),
        ];
        if (definition.scene.path.length < 2) throw new Error(`Thought ${definition.id} scene requires at least two path points`);
        if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
          throw new Error(`Thought ${definition.id} scene points must be finite`);
        }
        if (definition.scene.camera && (!Number.isFinite(definition.scene.camera.height) || definition.scene.camera.height <= 0)) {
          throw new Error(`Thought ${definition.id} scene camera requires a positive height`);
        }
        if (definition.scene.towerSlots !== undefined && (!Number.isInteger(definition.scene.towerSlots) || definition.scene.towerSlots <= 0)) {
          throw new Error(`Thought ${definition.id} scene requires a positive tower slot count`);
        }
      }
      this.definitions.set(definition.id, definition);
      const moduleId = definition.subject.moduleId;
      if (this.byModule.has(moduleId)) throw new Error(`Duplicate module thought: ${moduleId}`);
      this.byModule.set(moduleId, definition);
      for (const code of definition.relatedDiagnostics ?? []) {
        if (this.byDiagnostic.has(code)) throw new Error(`Duplicate diagnostic thought: ${code}`);
        this.byDiagnostic.set(code, definition);
      }
      const definitionCueIds = new Set<string>();
      for (const beat of definition.beats) {
        if (!Number.isFinite(beat.timelineDuration) || beat.timelineDuration <= 0) {
          throw new Error(`Thought ${definition.id} beat ${beat.id} requires a positive timeline duration`);
        }
        if (beat.waitFor && (!beat.timeout || beat.timeout <= 0)) {
          throw new Error(`Thought ${definition.id} beat ${beat.id} requires a positive timeout`);
        }
        if (!beat.cues) continue;
        if (beat.cues.length === 0) throw new Error(`Thought ${definition.id} beat ${beat.id} requires at least one cue`);
        const cueIds = new Set<string>();
        for (const cue of beat.cues) {
          if (cueIds.has(cue.id)) throw new Error(`Thought ${definition.id} beat ${beat.id} has duplicate cue ${cue.id}`);
          cueIds.add(cue.id);
          if (definitionCueIds.has(cue.id)) throw new Error(`Thought ${definition.id} has duplicate cue ${cue.id}`);
          definitionCueIds.add(cue.id);
          const waitsForState = cue.waitFor || cue.waitForClear || cue.waitForSignalsPastNode || cue.waitForTowerEnergy || cue.waitForSignalStates || cue.waitForProjectileStates;
          if (cue.duration === undefined && !waitsForState) {
            throw new Error(`Thought ${definition.id} cue ${cue.id} requires a duration or wait`);
          }
          if (cue.duration !== undefined && (!Number.isFinite(cue.duration) || cue.duration <= 0)) {
            throw new Error(`Thought ${definition.id} cue ${cue.id} requires a positive duration`);
          }
          if (waitsForState && (!cue.timeout || cue.timeout <= 0)) {
            throw new Error(`Thought ${definition.id} cue ${cue.id} requires a positive timeout`);
          }
          if (cue.waitForSignalsPastNode && !definition.scene?.graph?.nodes.has(cue.waitForSignalsPastNode)) {
            throw new Error(`Thought ${definition.id} cue ${cue.id} requires an existing route node`);
          }
          if (cue.waitFor?.occurrence !== undefined && (!Number.isInteger(cue.waitFor.occurrence) || cue.waitFor.occurrence <= 0)) {
            throw new Error(`Thought ${definition.id} cue ${cue.id} requires a positive event occurrence`);
          }
          if (cue.loadoutVisibleRange && (
            !Number.isInteger(cue.loadoutVisibleRange.start)
            || cue.loadoutVisibleRange.start < 0
            || !Number.isInteger(cue.loadoutVisibleRange.count)
            || cue.loadoutVisibleRange.count < 0
          )) {
            throw new Error(`Thought ${definition.id} cue ${cue.id} requires a valid loadout range`);
          }
        }
      }
    }
  }

  list(): readonly ThoughtDefinition[] {
    return [...this.definitions.values()];
  }

  require(id: string): ThoughtDefinition {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown thought: ${id}`);
    return definition;
  }

  forModule(moduleId: ModuleId): ThoughtDefinition | undefined {
    return this.byModule.get(moduleId);
  }

  forDiagnostic(code: ProgramDiagnosticCode): ThoughtDefinition | undefined {
    return this.byDiagnostic.get(code);
  }
}

export const thoughtRegistry = new ThoughtRegistry(THOUGHT_CATALOG);
