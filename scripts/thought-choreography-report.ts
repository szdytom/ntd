import type { ModuleId } from '@prism-bastion/game-core/game/types';
import type {
  ThoughtCue,
  ThoughtDefinition,
  ThoughtLoadoutMode,
  ThoughtLoadoutTarget,
} from '@prism-bastion/web-shared/thoughts/types';

const storedValues = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
  },
});

const { FIXED_SIMULATION_STEP } = await import('@prism-bastion/game-core/game/engine');
const { thoughtRegistry, ThoughtSceneDirector } = await import('@prism-bastion/web-shared/thoughts');

type WarningKind = 'fade-targetable' | 'missing-resolution' | 'unfinished-ending' | 'loadout-continuity';

interface ChoreographyWarning {
  readonly kind: WarningKind;
  readonly location: string;
  readonly message: string;
}

const cuesFor = (definition: ThoughtDefinition): readonly ThoughtCue[] => (
  definition.beats.flatMap((beat) => beat.cues ?? [])
);

const isResolutionWait = (cue: ThoughtCue): boolean => (
  cue.waitForClear === true
  || cue.waitForSignalsOutOfRange === true
  || cue.waitForSignalsPastNode !== undefined
  || cue.waitFor?.type === 'signal-defeated'
  || cue.waitFor?.type === 'signal-leaked'
  || (cue.waitForSignalStates?.length !== 0
    && cue.waitForSignalStates?.every((requirement) => requirement.alive === false) === true)
);

const maximumDirectorSteps = (definition: ThoughtDefinition): number => {
  const seconds = definition.beats.reduce((total, beat) => {
    if (!beat.cues) return total + Math.max(beat.duration ?? 0, beat.timeout ?? 0, beat.timelineDuration);
    return total + beat.cues.reduce((cueTotal, cue) => (
      cueTotal + Math.max(cue.duration ?? 0, cue.timeout ?? 0)
    ), 0);
  }, 0);
  return Math.ceil(seconds / FIXED_SIMULATION_STEP) + 1;
};

const inspectRuntimeFades = (definition: ThoughtDefinition): readonly ChoreographyWarning[] => {
  const warnings: ChoreographyWarning[] = [];
  const cues = new Map(cuesFor(definition).map((cue) => [cue.id, cue]));
  const director = new ThoughtSceneDirector(definition);
  let previousLocation = '';

  for (let step = 0; step < maximumDirectorSteps(definition); step += 1) {
    const snapshot = director.getSnapshot();
    if (snapshot.status === 'completed') break;
    if (snapshot.status === 'error') {
      warnings.push({
        kind: 'fade-targetable',
        location: definition.id,
        message: `replay could not complete: ${snapshot.error ?? 'unknown error'}`,
      });
      break;
    }

    const location = `${snapshot.beatIndex}:${snapshot.cueId}`;
    if (location !== previousLocation) {
      previousLocation = location;
      const cue = cues.get(snapshot.cueId);
      const presentation = director.getRenderPresentation();
      if (cue?.transition?.signalOpacity === 0 && presentation.signalOpacity > 0) {
        const targetableCount = director.runtime.engine.signals.filter((signal) => (
          !signal.dead && director.runtime.engine.towers.some((tower) => (
            Math.hypot(
              signal.position.x - tower.position.x,
              signal.position.y - tower.position.y,
            ) <= tower.range
          ))
        )).length;
        if (targetableCount > 0) {
          const beat = definition.beats[snapshot.beatIndex];
          warnings.push({
            kind: 'fade-targetable',
            location: `${definition.id}/${beat?.id ?? snapshot.beatIndex}/${cue.id}`,
            message: `${targetableCount} targetable signal(s) remain when fade-out starts`,
          });
        }
      }
    }

    director.update(FIXED_SIMULATION_STEP);
  }

  director.dispose();
  return warnings;
};

const inspectResolutionStructure = (definition: ThoughtDefinition): readonly ChoreographyWarning[] => {
  const warnings: ChoreographyWarning[] = [];
  let effectiveOpacity = definition.initialScene?.signalOpacity ?? 1;
  let unresolvedSignals = false;

  for (const beat of definition.beats) {
    for (const cue of beat.cues ?? []) {
      if (isResolutionWait(cue)) unresolvedSignals = false;

      const fadesVisibleSignals = cue.transition?.signalOpacity === 0 && effectiveOpacity > 0;
      const resetsSignals = cue.actions?.some((action) => (
        action.type === 'delete-signals' || action.type === 'setup' || action.type === 'setup-towers'
      )) ?? false;
      if (unresolvedSignals && (fadesVisibleSignals || resetsSignals)) {
        warnings.push({
          kind: 'missing-resolution',
          location: `${definition.id}/${beat.id}/${cue.id}`,
          message: 'signal fade or reset follows a spawn without a recognized resolution wait',
        });
      }

      if (resetsSignals) unresolvedSignals = false;
      if (cue.actions?.some((action) => action.type === 'spawn-signal')) unresolvedSignals = true;
      if (cue.transition?.signalOpacity !== undefined) effectiveOpacity = cue.transition.signalOpacity;
    }
  }

  return warnings;
};

const inspectEnding = (definition: ThoughtDefinition): readonly ChoreographyWarning[] => {
  const finalBeat = definition.beats.at(-1);
  if (!finalBeat || finalBeat.cues?.some(isResolutionWait)) return [];
  return [{
    kind: 'unfinished-ending',
    location: `${definition.id}/${finalBeat.id}`,
    message: 'final beat has no recognized signal resolution wait',
  }];
};

interface LoadoutPresentation {
  readonly location: string;
  readonly modules: readonly ModuleId[];
  readonly animateChanges: boolean;
}

interface LoadoutSession {
  readonly towerIndex: number;
  readonly presentations: readonly LoadoutPresentation[];
}

const sameModules = (left: readonly ModuleId[], right: readonly ModuleId[]): boolean => (
  left.length === right.length && left.every((moduleId, index) => moduleId === right[index])
);

const editDistance = (left: readonly ModuleId[], right: readonly ModuleId[]): number => {
  const distances = Array.from({ length: left.length + 1 }, (_, leftIndex) => (
    Array.from({ length: right.length + 1 }, (_, rightIndex) => (
      leftIndex === 0 ? rightIndex : rightIndex === 0 ? leftIndex : 0
    ))
  ));
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      distances[leftIndex]![rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? distances[leftIndex - 1]![rightIndex - 1]!
        : 1 + Math.min(
          distances[leftIndex - 1]![rightIndex]!,
          distances[leftIndex]![rightIndex - 1]!,
          distances[leftIndex - 1]![rightIndex - 1]!,
        );
    }
  }
  return distances[left.length]![right.length]!;
};

const inspectLoadoutContinuity = (definition: ThoughtDefinition): readonly ChoreographyWarning[] => {
  const warnings: ChoreographyWarning[] = [];
  const loadouts = new Map<number, readonly ModuleId[]>();
  const previousSessions = new Map<number, readonly ModuleId[]>();
  let mode: ThoughtLoadoutMode = 'hidden';
  let targets: readonly ThoughtLoadoutTarget[] = [{ towerIndex: 0, placement: 'right' }];
  let visibleSlots: number | undefined;
  let visibleRange: { readonly start: number; readonly count: number } | undefined;
  let activeSessions = new Map<number, LoadoutPresentation[]>();

  const visibleModules = (towerIndex: number): readonly ModuleId[] => {
    const modules = loadouts.get(towerIndex) ?? [];
    return visibleRange
      ? modules.slice(visibleRange.start, visibleRange.start + visibleRange.count)
      : modules.slice(0, visibleSlots ?? modules.length);
  };

  const finishSessions = (): void => {
    for (const [towerIndex, presentations] of activeSessions) {
      if (presentations.length === 0) continue;
      const session: LoadoutSession = { towerIndex, presentations };
      const first = session.presentations[0]!;
      const final = session.presentations.at(-1)!;
      const previous = previousSessions.get(towerIndex);
      const distance = previous ? editDistance(previous, final.modules) : undefined;

      if (!previous) {
        if (final.modules.length > 0 && (first.modules.length !== 1 || first.animateChanges)) {
          warnings.push({
            kind: 'loadout-continuity',
            location: first.location,
            message: `tower ${towerIndex} first dialog should show one module immediately without an addition animation, then add the rest`,
          });
        }
      } else if (distance !== undefined && distance <= 1) {
        if (!sameModules(first.modules, previous)) {
          warnings.push({
            kind: 'loadout-continuity',
            location: first.location,
            message: `tower ${towerIndex} can continue from [${previous.join(', ')}] with one edit instead of reopening as [${first.modules.join(', ')}]`,
          });
        }
      } else {
        const startsImmediateRebuild = first.animateChanges
          && first.modules.length === 1
          && first.modules[0] === final.modules[0];
        if (!startsImmediateRebuild) {
          warnings.push({
            kind: 'loadout-continuity',
            location: first.location,
            message: `tower ${towerIndex} changes substantially from [${previous.join(', ')}] to [${final.modules.join(', ')}]; open the new dialog while immediately adding its first module`,
          });
        }
      }

      for (let index = 1; index < session.presentations.length; index += 1) {
        const before = session.presentations[index - 1]!;
        const after = session.presentations[index]!;
        const stepDistance = editDistance(before.modules, after.modules);
        if (stepDistance > 1) {
          warnings.push({
            kind: 'loadout-continuity',
            location: after.location,
            message: `tower ${towerIndex} changes ${stepDistance} modules in one dialog step`,
          });
        } else if (
          stepDistance === 1
          && before.modules.length === after.modules.length
          && !after.animateChanges
        ) {
          warnings.push({
            kind: 'loadout-continuity',
            location: after.location,
            message: `tower ${towerIndex} replaces a module without animateLoadoutChanges`,
          });
        }
      }

      if (distance !== undefined && distance > 1) {
        const expectedSteps = final.modules.map((_, index) => final.modules.slice(0, index + 1));
        const actualSteps = session.presentations.map(({ modules }) => modules);
        if (
          first.animateChanges
          && (actualSteps.length !== expectedSteps.length
            || actualSteps.some((modules, index) => !sameModules(modules, expectedSteps[index] ?? [])))
        ) {
          warnings.push({
            kind: 'loadout-continuity',
            location: first.location,
            message: `tower ${towerIndex} substantial rebuild should add [${final.modules.join(', ')}] one module at a time in order`,
          });
        }
      }
      previousSessions.set(towerIndex, final.modules);
    }
    activeSessions = new Map();
  };

  for (const beat of definition.beats) {
    const beatCues: readonly ThoughtCue[] = beat.cues ?? [{
      id: beat.id,
      actions: beat.actions,
      duration: beat.duration,
      waitFor: beat.waitFor,
      timeout: beat.timeout,
      highlightSlots: beat.highlightSlots,
    }];
    for (const cue of beatCues) {
      const nextMode = cue.loadoutMode ?? mode;
      if (mode === 'dialog' && nextMode !== 'dialog') finishSessions();

      if (cue.loadoutVisibleSlots !== undefined) {
        visibleSlots = Math.max(0, Math.floor(cue.loadoutVisibleSlots));
        visibleRange = undefined;
      }
      if (cue.loadoutVisibleRange) {
        visibleRange = {
          start: Math.max(0, Math.floor(cue.loadoutVisibleRange.start)),
          count: Math.max(0, Math.floor(cue.loadoutVisibleRange.count)),
        };
        visibleSlots = undefined;
      }
      if (cue.overlay?.type === 'loadout') {
        targets = [{
          towerIndex: cue.overlay.target === 'tower' ? 0 : cue.overlay.target.towerIndex,
          placement: cue.overlay.placement ?? 'right',
        }];
      } else if (cue.overlay?.type === 'loadouts') {
        targets = cue.overlay.targets;
      }
      for (const action of cue.actions ?? []) {
        if (action.type === 'setup') loadouts.set(0, action.slots);
        if (action.type === 'setup-towers') {
          for (const loadout of action.loadouts) loadouts.set(loadout.towerIndex, loadout.slots);
        }
      }

      mode = nextMode;
      if (mode !== 'dialog') continue;
      for (const { towerIndex } of targets) {
        const modules = visibleModules(towerIndex);
        const presentations = activeSessions.get(towerIndex) ?? [];
        if (!sameModules(presentations.at(-1)?.modules ?? [], modules) || presentations.length === 0) {
          presentations.push({
            location: `${definition.id}/${beat.id}/${cue.id}`,
            modules,
            animateChanges: cue.animateLoadoutChanges === true,
          });
          activeSessions.set(towerIndex, presentations);
        }
      }
    }
  }
  finishSessions();
  return warnings;
};

const warnings = thoughtRegistry.list().flatMap((definition) => [
  ...inspectRuntimeFades(definition),
  ...inspectResolutionStructure(definition),
  ...inspectEnding(definition),
  ...inspectLoadoutContinuity(definition),
]);

if (warnings.length === 0) {
  console.log('Thought choreography report: no warnings.');
} else {
  console.warn(`Thought choreography report: ${warnings.length} warning(s).`);
  for (const warning of warnings) {
    console.warn(`[${warning.kind}] ${warning.location}: ${warning.message}`);
  }
}

console.log('These findings are advisory; review intentional exceptions in their teaching context.');
