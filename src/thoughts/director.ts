import type { CombatEvent } from '../game/combat-events';
import { CombatRuntime } from '../game/combat-runtime';
import type { Projectile, Signal, SpaceRift } from '../game/types';
import type {
  ThoughtAction,
  ThoughtBeat,
  ThoughtCue,
  ThoughtDefinition,
  ThoughtEase,
  ThoughtEventMatcher,
  ThoughtOverlayTarget,
  ThoughtPlayerSnapshot,
  ThoughtSceneValues,
} from './types';

type Listener = () => void;

export interface ThoughtTimelineWaitMarker {
  readonly id: string;
  readonly beatIndex: number;
  readonly cueIds: readonly string[];
  readonly progress: number;
}

const DEFAULT_SCENE: ThoughtSceneValues = {
  pathProgress: 1,
  towerPadOpacity: 0,
  towerOpacity: 1,
  signalOpacity: 1,
  simulationRate: 1,
};

const eventModules = (event: CombatEvent): readonly string[] => {
  if ('shot' in event) return event.shot.modules;
  return [];
};

const matchesEvent = (event: CombatEvent, matcher: ThoughtEventMatcher): boolean => (
  event.type === matcher.type
  && (!matcher.moduleId || eventModules(event).length === 0 || eventModules(event).includes(matcher.moduleId))
);

const targetForFlow = (flow: ThoughtBeat['flow']): ThoughtOverlayTarget => (
  flow === 'compile' || flow === 'focus' ? 'tower' : 'signal'
);

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
const withoutTowerRotation = (scene: ThoughtSceneValues): ThoughtSceneValues => {
  const values = { ...scene };
  delete values.towerRotation;
  delete values.towerRotations;
  return values;
};
const ease = (value: number, mode: ThoughtEase): number => {
  const progress = clampUnit(value);
  if (mode === 'linear') return progress;
  if (mode === 'ease-in') return progress * progress * progress;
  if (mode === 'ease-out') return 1 - (1 - progress) ** 3;
  return progress * progress * (3 - 2 * progress);
};

const interpolateScene = (
  from: ThoughtSceneValues,
  to: ThoughtSceneValues,
  progress: number,
): ThoughtSceneValues => {
  const interpolateValues = (
    fromValues: readonly number[] | undefined,
    toValues: readonly number[] | undefined,
    fromFallback: number,
    toFallback: number,
    angular = false,
  ): readonly number[] | undefined => {
    if (!fromValues && !toValues) return undefined;
    const length = Math.max(fromValues?.length ?? 0, toValues?.length ?? 0);
    return Array.from({ length }, (_, index) => {
      const start = fromValues?.[index] ?? fromFallback;
      const target = toValues?.[index] ?? toFallback;
      const difference = angular
        ? ((target - start + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        : target - start;
      return start + difference * progress;
    });
  };
  const rotationDifference = to.towerRotation === undefined || from.towerRotation === undefined
    ? 0
    : ((to.towerRotation - from.towerRotation + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const towerPadOpacities = interpolateValues(
    from.towerPadOpacities,
    to.towerPadOpacities,
    from.towerPadOpacity,
    to.towerPadOpacity,
  );
  const towerOpacities = interpolateValues(
    from.towerOpacities,
    to.towerOpacities,
    from.towerOpacity,
    to.towerOpacity,
  );
  const towerRotations = interpolateValues(
    from.towerRotations,
    to.towerRotations,
    from.towerRotation ?? 0,
    to.towerRotation ?? 0,
    true,
  );
  return {
    pathProgress: from.pathProgress + (to.pathProgress - from.pathProgress) * progress,
    towerPadOpacity: from.towerPadOpacity + (to.towerPadOpacity - from.towerPadOpacity) * progress,
    towerOpacity: from.towerOpacity + (to.towerOpacity - from.towerOpacity) * progress,
    signalOpacity: from.signalOpacity + (to.signalOpacity - from.signalOpacity) * progress,
    simulationRate: from.simulationRate + (to.simulationRate - from.simulationRate) * progress,
    ...(to.towerRotation === undefined || from.towerRotation === undefined
      ? {}
      : { towerRotation: from.towerRotation + rotationDifference * progress }),
    ...(towerPadOpacities ? { towerPadOpacities } : {}),
    ...(towerOpacities ? { towerOpacities } : {}),
    ...(towerRotations ? { towerRotations } : {}),
  };
};

export class ThoughtSceneDirector {
  readonly runtime: CombatRuntime;
  private readonly listeners = new Set<Listener>();
  private readonly events: CombatEvent[] = [];
  private readonly eventBindings = new Map<string, CombatEvent>();
  private readonly unsubscribeCombat: () => void;
  private beatIndex = 0;
  private cueIndex = 0;
  private cueElapsed = 0;
  private beatElapsed = 0;
  private status: ThoughtPlayerSnapshot['status'] = 'playing';
  private speed: ThoughtPlayerSnapshot['speed'] = 1;
  private eventMatched = false;
  private eventMatchCount = 0;
  private error: string | undefined;
  private slots: readonly string[] = [];
  private sceneValues: ThoughtSceneValues;
  private cueStartScene: ThoughtSceneValues;
  private cueTargetScene: ThoughtSceneValues;
  private loadoutMode: ThoughtPlayerSnapshot['loadoutMode'] = 'hidden';
  private loadoutPlacement: ThoughtPlayerSnapshot['loadoutPlacement'] = 'right';
  private loadoutTargets: ThoughtPlayerSnapshot['loadoutTargets'] = [{ towerIndex: 0, placement: 'right' }];
  private loadoutVisibleSlots: number | undefined;
  private loadoutVisibleRange: ThoughtPlayerSnapshot['loadoutVisibleRange'];
  private loadoutReplacements: ThoughtPlayerSnapshot['loadoutReplacements'] = [];
  private placementBurst = false;
  private placementBurstTowerIndex = 0;
  private sectionTitleKey: string | undefined;
  private snapshot!: ThoughtPlayerSnapshot;

  constructor(readonly definition: ThoughtDefinition) {
    this.runtime = new CombatRuntime(definition.seed, definition.scene);
    this.sceneValues = { ...DEFAULT_SCENE, ...definition.initialScene };
    this.cueStartScene = this.sceneValues;
    this.cueTargetScene = this.sceneValues;
    this.unsubscribeCombat = this.runtime.subscribe((event) => {
      this.events.push(event);
      if (this.events.length > 120) this.events.shift();
      const cue = this.currentCue();
      if (cue.waitFor && matchesEvent(event, cue.waitFor)) {
        this.eventMatchCount += 1;
        if (this.eventMatchCount >= (cue.waitFor.occurrence ?? 1)) {
          this.eventMatched = true;
          if (cue.waitFor.captureAs) this.eventBindings.set(cue.waitFor.captureAs, event);
        }
      }
    });
    this.enterBeat(0);
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ThoughtPlayerSnapshot => this.snapshot;

  getTimelineProgress = (): number => {
    const total = this.definition.beats.reduce((sum, beat) => sum + beat.timelineDuration, 0);
    if (total <= 0) return 0;
    const elapsed = this.definition.beats.slice(0, this.beatIndex)
      .reduce((sum, beat) => sum + beat.timelineDuration, 0)
      + Math.min(this.beatElapsed, this.currentBeat().timelineDuration);
    return clampUnit(elapsed / total);
  };

  getTimelineWaitMarkers = (): readonly ThoughtTimelineWaitMarker[] => {
    const total = this.definition.beats.reduce((sum, beat) => sum + beat.timelineDuration, 0);
    if (total <= 0) return [];
    const markers: ThoughtTimelineWaitMarker[] = [];
    let completedDuration = 0;
    this.definition.beats.forEach((beat, beatIndex) => {
      let cueDuration = 0;
      for (const cue of this.cuesFor(beat)) {
        if (cue.timelineWait) {
          const progress = clampUnit((completedDuration + Math.min(cueDuration, beat.timelineDuration)) / total);
          const previous = markers.at(-1);
          if (previous?.beatIndex === beatIndex && previous.progress === progress) {
            markers[markers.length - 1] = { ...previous, cueIds: [...previous.cueIds, cue.id] };
          } else {
            markers.push({ id: `${beat.id}:${cue.id}`, beatIndex, cueIds: [cue.id], progress });
          }
        } else {
          cueDuration += cue.duration ?? 0;
        }
      }
      completedDuration += beat.timelineDuration;
    });
    return markers;
  };

  getBoundSignal(reference: string): Signal | null {
    const event = this.eventBindings.get(reference);
    if (!event || !('signalId' in event) || typeof event.signalId !== 'number') return null;
    return this.runtime.getSignal(event.signalId);
  }

  getBoundProjectile(reference: string): Projectile | null {
    const event = this.eventBindings.get(reference);
    if (!event || !('projectileId' in event) || typeof event.projectileId !== 'number') return null;
    return this.runtime.getProjectile(event.projectileId);
  }

  getBoundProjectileGroup(reference: string): readonly Projectile[] {
    const event = this.eventBindings.get(reference);
    if (!event || !('shot' in event)) return [];
    return this.runtime.engine.projectiles.filter((projectile) => (
      projectile.shot === event.shot && projectile.life > 0
    ));
  }

  getBoundTrail(reference: string): SpaceRift | null {
    const event = this.eventBindings.get(reference);
    if (!event || !('projectileId' in event) || typeof event.projectileId !== 'number') return null;
    return this.runtime.engine.spaceRifts.find((rift) => rift.source.id === event.projectileId) ?? null;
  }

  getRenderPresentation = (): ThoughtSceneValues => {
    const cue = this.currentCue();
    const duration = cue.transitionDuration ?? cue.duration ?? 0;
    const progress = duration > 0 ? ease(this.cueElapsed / duration, cue.ease ?? 'smooth') : 1;
    return interpolateScene(this.cueStartScene, this.cueTargetScene, progress);
  };

  private buildSnapshot(): ThoughtPlayerSnapshot {
    const beat = this.currentBeat();
    const cue = this.currentCue();
    return {
      status: this.status,
      beatIndex: this.beatIndex,
      beatCount: this.definition.beats.length,
      speed: this.speed,
      captionKey: beat.captionKey,
      flow: beat.flow,
      cueId: cue.id,
      cueDuration: cue.duration ?? beat.timelineDuration,
      slots: this.slots,
      highlightSlots: cue.highlightSlots ?? beat.highlightSlots ?? [],
      loadoutMode: this.loadoutMode,
      loadoutPlacement: this.loadoutPlacement,
      loadoutTargets: this.loadoutTargets,
      loadoutReplacements: this.loadoutReplacements,
      ...(this.loadoutVisibleSlots === undefined ? {} : { loadoutVisibleSlots: this.loadoutVisibleSlots }),
      ...(this.loadoutVisibleRange ? { loadoutVisibleRange: this.loadoutVisibleRange } : {}),
      placementBurst: this.placementBurst,
      placementBurstTowerIndex: this.placementBurstTowerIndex,
      ...(this.sectionTitleKey ? { sectionTitleKey: this.sectionTitleKey } : {}),
      ...(cue.overlay ? { overlay: cue.overlay } : {}),
      ...(beat.comparisonKey ? { comparisonKey: beat.comparisonKey } : {}),
      ...(this.error ? { error: this.error } : {}),
    };
  }

  update(delta: number): void {
    if (this.status !== 'playing') return;
    const presentationDelta = Math.max(0, delta) * this.speed;
    const cue = this.currentCue();
    const simulationRate = this.getRenderPresentation().simulationRate;
    this.runtime.update(presentationDelta * simulationRate);
    this.cueElapsed += presentationDelta;
    if (!cue.timelineWait) this.beatElapsed += presentationDelta;
    if (cue.requireSignalState && !this.matchesSignalState(cue.requireSignalState)) {
      this.status = 'error';
      this.error = `Lost bound signal in ${this.definition.id}/${this.currentBeat().id}/${cue.id}`;
      this.emit();
      return;
    }
    if (this.cueComplete(cue)) {
      this.advanceCue();
      return;
    }
    if ((cue.waitFor || cue.waitForClear || cue.waitForSignalsPastNode || cue.waitForTowerEnergy || cue.waitForSignalStates || cue.waitForProjectileStates) && this.cueElapsed >= (cue.timeout ?? 10)) {
      this.status = 'error';
      const wait = cue.waitFor?.type
        ?? (cue.waitForSignalsPastNode ? `route-node:${cue.waitForSignalsPastNode}` : 'scene-clear');
      this.error = `Timed out waiting for ${wait} in ${this.definition.id}/${this.currentBeat().id}/${cue.id}`;
      this.emit();
    }
  }

  togglePlayback(): void {
    if (this.status === 'completed' || this.status === 'error') {
      this.restart();
      return;
    }
    this.status = this.status === 'playing' ? 'paused' : 'playing';
    this.emit();
  }

  setSpeed(speed: ThoughtPlayerSnapshot['speed']): void {
    this.speed = speed;
    this.emit();
  }

  next(): void {
    if (this.status === 'completed') return;
    if (this.beatIndex >= this.definition.beats.length - 1) {
      this.status = 'completed';
      this.emit();
      return;
    }
    this.goTo(this.beatIndex + 1);
  }

  previous(): void {
    if (this.beatIndex <= 0) {
      this.restart();
      this.status = 'paused';
      this.emit();
      return;
    }
    this.rebuildTo(this.beatIndex - 1);
    this.status = 'paused';
    this.emit();
  }

  goTo(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.definition.beats.length) return;
    const wasPlaying = this.status === 'playing';
    this.rebuildTo(index);
    this.status = wasPlaying ? 'playing' : 'paused';
    this.emit();
  }

  restart(): void {
    this.status = 'playing';
    this.error = undefined;
    this.events.length = 0;
    this.eventBindings.clear();
    this.resetSceneState();
    this.enterBeat(0);
  }

  dispose(): void {
    this.unsubscribeCombat();
    this.listeners.clear();
    this.runtime.dispose();
  }

  private currentBeat(): ThoughtBeat {
    const beat = this.definition.beats[this.beatIndex];
    if (!beat) throw new Error(`Thought ${this.definition.id} has no beat ${this.beatIndex}`);
    return beat;
  }

  private cuesFor(beat: ThoughtBeat): readonly ThoughtCue[] {
    if (beat.cues) return beat.cues;
    return [{
      id: beat.id,
      overlay: { type: 'caption', textKey: beat.captionKey, target: targetForFlow(beat.flow) },
      ...(beat.actions ? { actions: beat.actions } : {}),
      ...(beat.duration !== undefined ? { duration: beat.duration } : {}),
      ...(beat.waitFor ? { waitFor: beat.waitFor } : {}),
      ...(beat.timeout !== undefined ? { timeout: beat.timeout } : {}),
      ...(beat.highlightSlots ? { highlightSlots: beat.highlightSlots } : {}),
    }];
  }

  private currentCue(): ThoughtCue {
    const cue = this.cuesFor(this.currentBeat())[this.cueIndex];
    if (!cue) throw new Error(`Thought ${this.definition.id} has no cue ${this.beatIndex}/${this.cueIndex}`);
    return cue;
  }

  private cueComplete(cue: ThoughtCue): boolean {
    const minimumDuration = cue.duration ?? 0;
    if (this.cueElapsed < minimumDuration) return false;
    if (cue.waitFor && !this.eventMatched) return false;
    if (cue.waitForClear && this.runtime.hasActiveSignals()) return false;
    if (cue.waitForSignalsPastNode && !this.runtime.haveActiveSignalsPassedNode(cue.waitForSignalsPastNode)) return false;
    if (cue.waitForTowerEnergy && !this.runtime.hasFullTowerEnergy()) return false;
    if (cue.waitForSignalStates && !cue.waitForSignalStates.every((requirement) => this.matchesSignalState(requirement))) return false;
    if (cue.waitForProjectileStates && !cue.waitForProjectileStates.every((requirement) => this.matchesProjectileState(requirement))) return false;
    return Boolean(cue.duration !== undefined || cue.waitFor || cue.waitForClear || cue.waitForSignalsPastNode || cue.waitForTowerEnergy || cue.waitForSignalStates || cue.waitForProjectileStates);
  }

  private advanceCue(): void {
    this.finishCue();
    const cues = this.cuesFor(this.currentBeat());
    if (this.cueIndex < cues.length - 1) {
      this.enterCue(this.cueIndex + 1);
      return;
    }
    if (this.beatIndex >= this.definition.beats.length - 1) {
      this.status = 'completed';
      this.emit();
      return;
    }
    this.enterBeat(this.beatIndex + 1);
  }

  private enterBeat(index: number): void {
    this.beatIndex = index;
    this.beatElapsed = 0;
    this.cueIndex = 0;
    this.enterCue(0);
  }

  private enterCue(index: number): void {
    this.cueIndex = index;
    this.cueElapsed = 0;
    this.eventMatched = false;
    this.eventMatchCount = 0;
    const cue = this.currentCue();
    const previousLoadouts = this.runtime.engine.towers.map((tower) => [...tower.slots]);
    this.cueStartScene = cue.transition?.towerRotation === undefined && cue.transition?.towerRotations === undefined
      ? this.sceneValues
      : {
        ...this.sceneValues,
        ...(cue.transition.towerRotation === undefined ? {} : {
          towerRotation: this.sceneValues.towerRotation
            ?? this.runtime.engine.towers[0]?.rotation
            ?? cue.transition.towerRotation,
        }),
        ...(cue.transition.towerRotations === undefined ? {} : {
          towerRotations: this.sceneValues.towerRotations
            ?? this.runtime.engine.towers.map((tower) => tower.rotation),
        }),
      };
    this.cueTargetScene = { ...this.sceneValues, ...cue.transition };
    if (cue.loadoutMode) this.loadoutMode = cue.loadoutMode;
    if (cue.loadoutVisibleSlots !== undefined) {
      this.loadoutVisibleSlots = Math.max(0, Math.floor(cue.loadoutVisibleSlots));
      this.loadoutVisibleRange = undefined;
    }
    if (cue.loadoutVisibleRange) {
      this.loadoutVisibleRange = {
        start: Math.max(0, Math.floor(cue.loadoutVisibleRange.start)),
        count: Math.max(0, Math.floor(cue.loadoutVisibleRange.count)),
      };
      this.loadoutVisibleSlots = undefined;
    }
    if (cue.overlay?.type === 'loadout') {
      this.loadoutPlacement = cue.overlay.placement ?? 'right';
      this.loadoutTargets = [{
        towerIndex: cue.overlay.target === 'tower' ? 0 : cue.overlay.target.towerIndex,
        placement: this.loadoutPlacement,
      }];
    } else if (cue.overlay?.type === 'loadouts') {
      this.loadoutTargets = cue.overlay.targets;
    }
    this.placementBurst = cue.placementBurst ?? false;
    this.placementBurstTowerIndex = cue.placementBurstTowerIndex ?? 0;
    if (cue.sectionTitleKey) this.sectionTitleKey = cue.sectionTitleKey;
    this.applyActions(cue.actions ?? []);
    this.loadoutReplacements = cue.animateLoadoutChanges
      ? this.runtime.engine.towers.flatMap((tower, towerIndex) => tower.slots.flatMap((moduleId, slot) => {
        const previousModuleId = previousLoadouts[towerIndex]?.[slot];
        return moduleId && previousModuleId && previousModuleId !== moduleId
          ? [{ towerIndex, slot, from: previousModuleId, to: moduleId }]
          : [];
      }))
      : [];
    if (cue.waitFor) {
      const matchedEvents = this.events.filter((event) => matchesEvent(event, cue.waitFor!));
      this.eventMatchCount = matchedEvents.length;
      const matchedEvent = matchedEvents[(cue.waitFor.occurrence ?? 1) - 1];
      if (matchedEvent) {
        this.eventMatched = true;
        if (cue.waitFor.captureAs) this.eventBindings.set(cue.waitFor.captureAs, matchedEvent);
      }
    }
    this.emit();
  }

  private finishCue(): void {
    this.sceneValues = this.cueTargetScene;
    this.cueStartScene = this.sceneValues;
  }

  private applyActions(actions: readonly ThoughtAction[]): void {
    for (const action of actions) {
      if (action.type === 'setup') {
        this.events.length = 0;
        this.eventBindings.clear();
        this.slots = [...action.slots];
        this.runtime.setup(action);
        if (this.sceneValues.towerRotation !== undefined) {
          this.sceneValues = withoutTowerRotation(this.sceneValues);
          this.cueStartScene = withoutTowerRotation(this.cueStartScene);
          this.cueTargetScene = withoutTowerRotation(this.cueTargetScene);
        }
      } else if (action.type === 'setup-towers') {
        this.events.length = 0;
        this.eventBindings.clear();
        this.runtime.setupTowers(action.loadouts);
        this.slots = [...(action.loadouts.find((loadout) => loadout.towerIndex === 0)?.slots ?? [])];
        if (this.sceneValues.towerRotation !== undefined || this.sceneValues.towerRotations !== undefined) {
          this.sceneValues = withoutTowerRotation(this.sceneValues);
          this.cueStartScene = withoutTowerRotation(this.cueStartScene);
          this.cueTargetScene = withoutTowerRotation(this.cueTargetScene);
        }
      } else if (action.type === 'spawn-signal') {
        const signal = this.runtime.spawnSignal(action.signal, action.position);
        if (action.captureAs) {
          this.eventBindings.set(action.captureAs, { type: 'signal-spawned', signalId: signal.id, signalType: signal.type });
        }
      } else if (action.type === 'set-tower-casting') {
        this.runtime.setTowerCastingEnabled(action.enabled, action.towerIndex);
      } else if (action.type === 'delete-signals') {
        this.runtime.deleteSignals();
      } else {
        this.runtime.compile();
      }
    }
  }

  private resetSceneState(): void {
    this.sceneValues = { ...DEFAULT_SCENE, ...this.definition.initialScene };
    this.cueStartScene = this.sceneValues;
    this.cueTargetScene = this.sceneValues;
    this.loadoutMode = 'hidden';
    this.loadoutPlacement = 'right';
    this.loadoutTargets = [{ towerIndex: 0, placement: 'right' }];
    this.loadoutVisibleSlots = undefined;
    this.loadoutVisibleRange = undefined;
    this.loadoutReplacements = [];
    this.placementBurst = false;
    this.placementBurstTowerIndex = 0;
    this.sectionTitleKey = undefined;
    this.cueIndex = 0;
    this.cueElapsed = 0;
    this.beatElapsed = 0;
  }

  private rebuildTo(target: number): void {
    this.events.length = 0;
    this.eventBindings.clear();
    this.error = undefined;
    this.resetSceneState();
    for (let beatIndex = 0; beatIndex <= target; beatIndex += 1) {
      this.beatIndex = beatIndex;
      const cues = this.cuesFor(this.currentBeat());
      const cueLimit = beatIndex < target ? cues.length : 1;
      for (let cueIndex = 0; cueIndex < cueLimit; cueIndex += 1) {
        this.enterCue(cueIndex);
        if (beatIndex < target) {
          this.replayCue(this.currentCue());
          this.finishCue();
        }
      }
    }
    this.beatIndex = target;
    this.cueIndex = 0;
    this.cueElapsed = 0;
    this.beatElapsed = 0;
  }

  private replayCue(cue: ThoughtCue): void {
    const limit = cue.waitFor || cue.waitForClear || cue.waitForSignalsPastNode || cue.waitForTowerEnergy || cue.waitForSignalStates || cue.waitForProjectileStates
      ? (cue.timeout ?? 10)
      : (cue.duration ?? 0);
    const step = 1 / 120;
    while (this.cueElapsed < limit) {
      const simulationRate = this.getRenderPresentation().simulationRate;
      this.runtime.update(step * simulationRate);
      this.cueElapsed += step;
      if (cue.requireSignalState && !this.matchesSignalState(cue.requireSignalState)) {
        throw new Error(`Lost bound signal while rebuilding ${this.definition.id}/${this.currentBeat().id}/${cue.id}`);
      }
      if (this.cueComplete(cue)) return;
    }
    if (!this.cueComplete(cue)) {
      const wait = cue.waitFor?.type
        ?? (cue.waitForSignalsPastNode ? `route-node:${cue.waitForSignalsPastNode}` : 'scene-clear');
      throw new Error(`Could not rebuild ${this.definition.id}/${this.currentBeat().id}/${cue.id}: ${wait}`);
    }
  }

  private matchesSignalState(requirement: NonNullable<ThoughtCue['requireSignalState']>): boolean {
    const signal = this.getBoundSignal(requirement.signalRef);
    if (!signal) return requirement.alive === false;
    if (requirement.alive !== undefined && requirement.alive !== !signal.dead) return false;
    const slowed = signal.slowFactor > 0 && signal.slowTime > 0;
    if (requirement.slowed !== undefined && requirement.slowed !== slowed) return false;
    if (requirement.statusId !== undefined && !signal.statuses.some((status) => (
      status.id === requirement.statusId && status.remaining > 0
    ))) return false;
    return true;
  }

  private matchesProjectileState(requirement: NonNullable<ThoughtCue['waitForProjectileStates']>[number]): boolean {
    const projectile = this.getBoundProjectile(requirement.projectileRef);
    if (requirement.alive !== undefined && requirement.alive !== Boolean(projectile && projectile.life > 0)) return false;
    if (requirement.minimumTravelDistance !== undefined) {
      if (!projectile) return false;
      const event = this.eventBindings.get(requirement.projectileRef);
      if (!event || !('towerId' in event)) return false;
      const tower = this.runtime.engine.towers.find((candidate) => candidate.id === event.towerId);
      if (!tower || Math.hypot(projectile.position.x - tower.position.x, projectile.position.y - tower.position.y) < requirement.minimumTravelDistance) return false;
    }
    return true;
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}
