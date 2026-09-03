import type { ThoughtCue, ThoughtDefinition } from '../src/thoughts/types';

const storedValues = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
  },
});

const { FIXED_SIMULATION_STEP } = await import('../src/game/engine');
const { thoughtRegistry, ThoughtSceneDirector } = await import('../src/thoughts');

type WarningKind = 'fade-targetable' | 'missing-resolution' | 'unfinished-ending';

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

const warnings = thoughtRegistry.list().flatMap((definition) => [
  ...inspectRuntimeFades(definition),
  ...inspectResolutionStructure(definition),
  ...inspectEnding(definition),
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
