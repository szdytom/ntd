import { describe, expect, it } from 'vitest';
import en from '../src/i18n/locales/en.json';
import { CombatRuntime } from '../src/game/combat-runtime';
import type { CombatEvent } from '../src/game/combat-events';
import { DEFAULT_TOWER_ROTATION, FIXED_SIMULATION_STEP } from '../src/game/engine';
import { thoughtRegistry, ThoughtSceneDirector } from '../src/thoughts';
import type { ThoughtCue, ThoughtLoadoutMode, ThoughtLoadoutPlacement } from '../src/thoughts/types';

const maximumDirectorSteps = (director: ThoughtSceneDirector): number => {
  const seconds = director.definition.beats.reduce((total, beat) => {
    if (!beat.cues) return total + Math.max(beat.duration ?? 0, beat.timeout ?? 0, beat.timelineDuration);
    return total + beat.cues.reduce((cueTotal, cue) => (
      cueTotal + Math.max(cue.duration ?? 0, cue.timeout ?? 0)
    ), 0);
  }, 0);
  return Math.ceil(seconds / FIXED_SIMULATION_STEP) + 1;
};

const runDirector = (director: ThoughtSceneDirector, inspect?: () => void): void => {
  for (let step = 0; step < maximumDirectorSteps(director); step += 1) {
    const status = director.getSnapshot().status;
    if (status === 'completed' || status === 'error') return;
    inspect?.();
    director.update(FIXED_SIMULATION_STEP);
  }
};

const runUntilCue = (director: ThoughtSceneDirector, cueId: string): void => {
  for (let step = 0; step < maximumDirectorSteps(director) && director.getSnapshot().cueId !== cueId; step += 1) {
    director.update(FIXED_SIMULATION_STEP);
  }
};

const angleDistance = (left: number, right: number): number => (
  Math.abs(((left - right + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
);

describe('thought registry', () => {
  it('maps every registered subject and diagnostic back to its thought', () => {
    const definitions = thoughtRegistry.list();
    expect(definitions.length).toBeGreaterThan(0);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(definitions.length);
    for (const definition of definitions) {
      expect(thoughtRegistry.forModule(definition.subject.moduleId)).toBe(definition);
      for (const diagnostic of definition.relatedDiagnostics ?? []) {
        expect(thoughtRegistry.forDiagnostic(diagnostic)).toBe(definition);
      }
    }
  });

  it('references existing English copy for every record and beat', () => {
    for (const definition of thoughtRegistry.list()) {
      expect(en[definition.titleKey as keyof typeof en]).toBeTruthy();
      expect(en[definition.summaryKey as keyof typeof en]).toBeTruthy();
      for (const beat of definition.beats) {
        expect(en[beat.captionKey as keyof typeof en]).toBeTruthy();
        for (const cue of beat.cues ?? []) {
          if (cue.sectionTitleKey) {
            expect(en[cue.sectionTitleKey as keyof typeof en]).toBeTruthy();
          }
          if (cue.overlay?.type === 'caption') {
            expect(en[cue.overlay.textKey as keyof typeof en]).toBeTruthy();
          }
        }
      }
    }
  });

  it('keeps visible loadout dialogs anchored across incremental reveals', () => {
    const violations: string[] = [];

    for (const definition of thoughtRegistry.list()) {
      let mode: ThoughtLoadoutMode = 'hidden';
      let placements = new Map<number, ThoughtLoadoutPlacement>([[0, 'right']]);

      for (const beat of definition.beats) {
        for (const cue of beat.cues ?? []) {
          const nextMode = cue.loadoutMode ?? mode;
          const nextPlacements = cue.overlay?.type === 'loadout'
            ? new Map<number, ThoughtLoadoutPlacement>([[
              cue.overlay.target === 'tower' ? 0 : cue.overlay.target.towerIndex,
              cue.overlay.placement ?? 'right',
            ]])
            : cue.overlay?.type === 'loadouts'
              ? new Map(cue.overlay.targets.map((target) => [target.towerIndex, target.placement]))
              : placements;

          if (mode === 'dialog' && nextMode === 'dialog') {
            for (const [towerIndex, placement] of nextPlacements) {
              const previousPlacement = placements.get(towerIndex);
              if (previousPlacement && previousPlacement !== placement) {
                violations.push(
                  `${definition.id}/${beat.id}/${cue.id}: tower ${towerIndex} moved ${previousPlacement} -> ${placement}`,
                );
              }
            }
          }

          mode = nextMode;
          placements = nextPlacements;
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('returns visible towers to their default rotation before resetting combat', () => {
    const violations: string[] = [];

    for (const definition of thoughtRegistry.list()) {
      let initialized = false;
      let towerOpacity = definition.initialScene?.towerOpacity ?? 1;
      let towerOpacities = definition.initialScene?.towerOpacities;
      let towerRotation = definition.initialScene?.towerRotation;
      let towerRotations = definition.initialScene?.towerRotations;
      const towerCount = definition.scene?.towerPads?.length ?? 1;

      for (const beat of definition.beats) {
        const cues: readonly ThoughtCue[] = beat.cues ?? [{ id: beat.id, actions: beat.actions }];
        for (const cue of cues) {
          const resetsCombat = cue.actions?.some((action) => (
            action.type === 'setup' || action.type === 'setup-towers'
          )) ?? false;

          if (resetsCombat && initialized) {
            for (let towerIndex = 0; towerIndex < towerCount; towerIndex += 1) {
              const opacity = towerOpacities?.[towerIndex] ?? towerOpacity;
              if (opacity <= 0) continue;
              const rotation = towerRotations?.[towerIndex] ?? towerRotation;
              if (rotation === undefined || angleDistance(rotation, DEFAULT_TOWER_ROTATION) > 1e-9) {
                violations.push(`${definition.id}/${beat.id}/${cue.id}: tower ${towerIndex}`);
              }
            }
          }

          if (resetsCombat) {
            initialized = true;
            towerRotation = undefined;
            towerRotations = undefined;
          }
          if (cue.transition?.towerOpacity !== undefined) towerOpacity = cue.transition.towerOpacity;
          if (cue.transition?.towerOpacities !== undefined) towerOpacities = cue.transition.towerOpacities;
          if (cue.transition?.towerRotation !== undefined) towerRotation = cue.transition.towerRotation;
          if (cue.transition?.towerRotations !== undefined) towerRotations = cue.transition.towerRotations;
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('preserves the revised projectile teaching contracts', () => {
    const prismSlug = thoughtRegistry.require('prism-slug');
    expect(prismSlug.relatedModuleIds).toContain('frost');
    expect(prismSlug.beats.flatMap((beat) => beat.cues ?? []).some((cue) => (
      cue.waitFor?.type === 'signal-slowed' && cue.waitFor.moduleId === 'frost'
    ))).toBe(true);

    for (const id of ['nova', 'geode-bloom'] as const) {
      const definition = thoughtRegistry.require(id);
      const cues = definition.beats.flatMap((beat) => beat.cues ?? []);
      const launchIndex = cues.findIndex((cue) => (
        cue.waitFor?.type === 'projectile-spawned' && cue.waitFor.moduleId === id
      ));
      const flightIndex = cues.findIndex((cue) => (
        cue.overlay?.type === 'caption'
        && typeof cue.overlay.target === 'object'
        && 'projectileRef' in cue.overlay.target
      ));
      expect(launchIndex).toBeGreaterThanOrEqual(0);
      expect(flightIndex).toBeGreaterThan(launchIndex);
      expect(definition.relatedModuleIds).toEqual(expect.arrayContaining(['frost', 'condense-core']));
    }

    const arcbolt = thoughtRegistry.require('arcbolt');
    expect(arcbolt.relatedModuleIds).toEqual(expect.arrayContaining(['frost', 'focus-core']));
    expect(arcbolt.beats.flatMap((beat) => beat.cues ?? []).some((cue) => (
      cue.waitFor?.type === 'secondary-hit' && (cue.waitFor.occurrence ?? 1) > 1
    ))).toBe(true);
    expect(arcbolt.beats.flatMap((beat) => beat.cues ?? []).some((cue) => (
      cue.waitFor?.type === 'signal-slowed' && (cue.waitFor.occurrence ?? 1) > 1
    ))).toBe(true);

    for (const id of ['needle', 'razor'] as const) {
      const definition = thoughtRegistry.require(id);
      expect(definition.scene?.id).toContain('straight-firing-lane');
      expect(definition.relatedModuleIds).toEqual(expect.arrayContaining(['seeker', 'cinder-trail', 'focus-core']));
    }

    const voidBeam = thoughtRegistry.require('void-beam');
    expect(voidBeam.scene?.id).toContain('straight-firing-lane');
    expect(voidBeam.relatedModuleIds).toContain('cinder-trail');

    for (const id of ['ember-coating', 'toxin', 'searing-sigil', 'starfire-matrix'] as const) {
      const definition = thoughtRegistry.require(id);
      const staticCarrier = id === 'toxin' ? 'ember-field' : 'toxic-cloud';
      expect(definition.relatedModuleIds).toEqual(expect.arrayContaining([staticCarrier, 'impact-trigger']));
      if (id === 'toxin') expect(definition.relatedModuleIds).not.toContain('toxic-cloud');
      expect(definition.beats.flatMap((beat) => beat.cues ?? []).some((cue) => (
        cue.waitForSignalStates?.some((state) => state.statusId === id)
      ))).toBe(true);
    }

    for (const id of ['double-fork', 'fork'] as const) {
      expect(thoughtRegistry.require(id).relatedModuleIds).toContain('focus-core');
    }

    expect(thoughtRegistry.require('overdrive').scene?.id).toContain('parallel-comparison');
    expect(thoughtRegistry.require('ricochet').beats.flatMap((beat) => beat.cues ?? [])
      .flatMap((cue) => cue.actions ?? [])
      .filter((action) => action.type === 'spawn-signal')).toHaveLength(3);
    const colossus = thoughtRegistry.require('colossus');
    expect(colossus.relatedModuleIds).toEqual(expect.arrayContaining(['nova', 'condense-core']));
    expect(colossus.relatedModuleIds).not.toContain('pulse');

    const condenseCues = thoughtRegistry.require('condense-core').beats.flatMap((beat) => beat.cues ?? []);
    const novaFirst = condenseCues.findIndex((cue) => cue.loadoutVisibleRange?.start === 1);
    const condenseAdded = condenseCues.findIndex((cue) => (
      cue.loadoutVisibleRange?.start === 0 && cue.loadoutVisibleRange.count === 2
    ));
    expect(novaFirst).toBeGreaterThanOrEqual(0);
    expect(condenseAdded).toBeGreaterThan(novaFirst);
  });

  it('preserves the repeat, trigger, seeker, and trail teaching contracts', () => {
    for (const [id, casts] of [['echo', 2], ['barrage', 4]] as const) {
      const definition = thoughtRegistry.require(id);
      const cues = definition.beats.flatMap((beat) => beat.cues ?? []);
      expect(definition.relatedModuleIds).toContain('focus-core');
      expect(cues.some((cue) => (
        cue.waitFor?.type === 'projectile-spawned'
        && cue.waitFor.moduleId === id
        && cue.waitFor.occurrence === casts * casts
      ))).toBe(true);
      expect(cues.flatMap((cue) => cue.actions ?? []).some((action) => (
        action.type === 'setup'
        && action.slots.filter((moduleId) => moduleId === id).length === 2
      ))).toBe(true);
    }

    const seeker = thoughtRegistry.require('seeker');
    expect(seeker.relatedModuleIds).toEqual(expect.arrayContaining(['pulse', 'fork']));
    expect(seeker.beats.flatMap((beat) => beat.cues ?? []).some((cue) => (
      cue.waitFor?.type === 'projectile-hit'
      && cue.waitFor.moduleId === 'seeker'
      && cue.waitFor.occurrence === 3
    ))).toBe(true);

    for (const id of ['timer-trigger', 'terrain-trigger'] as const) {
      const definition = thoughtRegistry.require(id);
      expect(definition.relatedModuleIds).toEqual(expect.arrayContaining(['void-beam', 'pulse', 'toxic-cloud']));
      const cues = definition.beats.flatMap((beat) => beat.cues ?? []);
      expect(cues.some((cue) => (
        cue.waitFor?.type === 'projectile-absorbed' && cue.waitFor.moduleId === id
      ))).toBe(true);
      expect(cues.flatMap((cue) => cue.actions ?? []).some((action) => (
        action.type === 'spawn-signal' && action.signal === 'crown'
      ))).toBe(true);
    }

    const expiration = thoughtRegistry.require('expiration-trigger');
    expect(expiration.relatedModuleIds).toEqual(expect.arrayContaining(['needle', 'pulse', 'toxic-cloud']));
    expect(expiration.beats.flatMap((beat) => beat.cues ?? [])
      .flatMap((cue) => cue.actions ?? [])
      .some((action) => action.type === 'spawn-signal' && action.signal === 'crown')).toBe(true);

    for (const id of ['starfire-trail', 'rift-trail', 'resonant-trail'] as const) {
      const definition = thoughtRegistry.require(id);
      expect(definition.scene?.id).toContain('parallel-comparison');
      expect(definition.relatedModuleIds).toEqual(expect.arrayContaining(['pulse', 'void-beam', 'nova', 'razor']));
    }
  });

  it('derives authored timeline widths from timed cues', () => {
    const authored = thoughtRegistry.list().filter((definition) => definition.beats.every((beat) => beat.cues));
    expect(authored.length).toBeGreaterThan(0);
    for (const definition of authored) {
      for (const beat of definition.beats) {
        const duration = beat.cues?.reduce((sum, cue) => sum + (cue.timelineWait ? 0 : (cue.duration ?? 0)), 0);
        expect(beat.timelineDuration).toBeCloseTo(duration ?? 0);
      }
    }
  });
});

describe('thought scenes', () => {
  it('uses an authored local scene for Condensing Lens', () => {
    const definition = thoughtRegistry.require('frost');
    const scene = definition.scene;
    if (!scene) throw new Error('Expected an authored scene');
    const director = new ThoughtSceneDirector(definition);
    expect(director.runtime.engine.level.id).toBe(`thought:${scene.id}`);
    expect(director.runtime.engine.level.towerPads[0]).toEqual(scene.tower);
    expect(director.runtime.engine.level.graph.edges).toHaveLength(scene.path.length - 1);
    director.dispose();
  });

  it('estimates where a route enters and leaves tower range', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.scene);
    if (!definition) throw new Error('Expected an authored scene');
    const runtime = new CombatRuntime(definition.seed, definition.scene);
    const tower = runtime.engine.towers[0];
    const routeId = runtime.engine.level.graph.entrances[0];
    if (!tower || !routeId) throw new Error('Expected a tower route');
    const range = runtime.engine.estimateTowerAttackProgressRange(tower.id, routeId);
    if (!range) throw new Error('Expected the route to cross tower range');
    const route = runtime.engine.routeFor(routeId);
    const entry = route.pointAtDistance(route.length * range.minimum).position;
    const exit = route.pointAtDistance(route.length * range.maximum).position;
    expect(range.minimum).toBeLessThan(range.maximum);
    expect(Math.hypot(entry.x - tower.position.x, entry.y - tower.position.y)).toBeCloseTo(tower.range);
    expect(Math.hypot(exit.x - tower.position.x, exit.y - tower.position.y)).toBeCloseTo(tower.range);
    runtime.dispose();
  });

  it('spawns authored subjects relative to the tower range entry', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => beat.cues?.some((cue) => cue.actions?.some((action) => action.type === 'spawn-signal' && action.position?.type === 'tower-range-entry'))));
    if (!definition) throw new Error('Expected a positioned signal action');
    const action = definition.beats.flatMap((beat) => beat.cues ?? [])
      .flatMap((cue) => cue.actions ?? [])
      .find((candidate) => candidate.type === 'spawn-signal' && candidate.position?.type === 'tower-range-entry');
    if (action?.type !== 'spawn-signal' || action.position?.type !== 'tower-range-entry') throw new Error('Expected a positioned signal');
    const runtime = new CombatRuntime(definition.seed, definition.scene);
    const tower = runtime.engine.towers[0];
    const routeId = runtime.engine.level.graph.entrances[0];
    if (!tower || !routeId) throw new Error('Expected a tower route');
    const range = runtime.engine.estimateTowerAttackProgressRange(tower.id, routeId);
    if (!range) throw new Error('Expected the route to cross tower range');
    const route = runtime.engine.routeFor(routeId);
    const expected = Math.max(0, range.minimum - (action.position.leadDistance ?? 0) / route.length);
    runtime.spawnSignal(action.signal, action.position);
    const signal = runtime.engine.signals.at(-1);
    expect(signal?.progress).toBeCloseTo(expected);
    runtime.dispose();
  });

  it('freezes timeline progress at authored indefinite waits', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => (
      beat.cues?.some((cue) => cue.timelineWait && cue.waitForClear)
    )));
    if (!definition) throw new Error('Expected an authored indefinite wait');
    const waitCue = definition.beats.flatMap((beat) => beat.cues ?? [])
      .find((cue) => cue.timelineWait && cue.waitForClear);
    if (!waitCue) throw new Error('Expected a clear-bound indefinite wait');
    const director = new ThoughtSceneDirector(definition);
    runUntilCue(director, waitCue.id);
    expect(director.getSnapshot().cueId).toBe(waitCue.id);
    const progress = director.getTimelineProgress();
    let samples = 0;
    while (director.getSnapshot().cueId === waitCue.id && samples < 120 * 30) {
      director.update(FIXED_SIMULATION_STEP);
      if (director.getSnapshot().cueId === waitCue.id) {
        expect(director.getTimelineProgress()).toBe(progress);
        samples += 1;
      }
    }
    expect(samples).toBeGreaterThan(0);
    director.dispose();
  });

  it('keeps the captured combat subject alive while its state is explained', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => beat.cues?.some((cue) => (
      cue.requireSignalState?.slowed === true && cue.overlay?.type === 'caption'
    ))));
    if (!definition) throw new Error('Expected a state-bound explanation');
    const cue = definition.beats.flatMap((beat) => beat.cues ?? [])
      .find((candidate) => candidate.requireSignalState?.slowed === true && candidate.overlay?.type === 'caption');
    if (!cue?.requireSignalState) throw new Error('Expected a state-bound cue');
    const director = new ThoughtSceneDirector(definition);
    runUntilCue(director, cue.id);
    const signal = director.getBoundSignal(cue.requireSignalState.signalRef);
    expect(director.getSnapshot().cueId).toBe(cue.id);
    expect(signal?.dead).toBe(false);
    expect(signal?.slowTime).toBeGreaterThan(0);
    director.dispose();
  });

  it('shows the Overdriven comparison target losing more health', () => {
    const director = new ThoughtSceneDirector(thoughtRegistry.require('overdrive'));
    runUntilCue(director, 'point-overdrive-damage');
    const baseline = director.getBoundSignal('baselineTarget');
    const overdriven = director.getBoundSignal('overdriveTarget');
    expect(director.getSnapshot().cueId).toBe('point-overdrive-damage');
    expect(baseline).not.toBeNull();
    expect(overdriven).not.toBeNull();
    expect(overdriven?.hp).toBeLessThan(baseline?.hp ?? 0);
    director.dispose();
  });

  it('eases the tower toward an authored orientation after a semantic wait', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => beat.cues?.some((cue) => cue.transition?.towerRotation !== undefined)));
    if (!definition) throw new Error('Expected an authored tower orientation');
    const cue = definition.beats.flatMap((beat) => beat.cues ?? [])
      .find((candidate) => candidate.transition?.towerRotation !== undefined);
    if (cue?.transition?.towerRotation === undefined || cue.duration === undefined) throw new Error('Expected a timed tower orientation');
    const director = new ThoughtSceneDirector(definition);
    runUntilCue(director, cue.id);
    expect(director.getSnapshot().cueId).toBe(cue.id);
    const start = director.getRenderPresentation().towerRotation;
    if (start === undefined) throw new Error('Expected a presentation rotation');
    const initialDistance = angleDistance(start, cue.transition.towerRotation);
    const midpoint = cue.duration / 2;
    for (let elapsed = 0; elapsed < midpoint; elapsed += FIXED_SIMULATION_STEP) {
      director.update(FIXED_SIMULATION_STEP);
    }
    const rotation = director.getRenderPresentation().towerRotation;
    if (rotation === undefined) throw new Error('Expected an interpolated presentation rotation');
    expect(angleDistance(rotation, cue.transition.towerRotation)).toBeLessThan(initialDistance);
    expect(angleDistance(rotation, cue.transition.towerRotation)).toBeGreaterThan(0);
    director.dispose();
  });

  it('releases authored tower orientation before combat-driven aiming resumes', () => {
    for (const definition of thoughtRegistry.list()) {
      const cues = new Map(definition.beats.flatMap((beat) => beat.cues ?? []).map((cue) => [cue.id, cue]));
      const director = new ThoughtSceneDirector(definition);
      runDirector(director, () => {
        const snapshot = director.getSnapshot();
        const cue = cues.get(snapshot.cueId);
        const resumesCasting = cue?.actions?.some((action) => (
          action.type === 'set-tower-casting' && action.enabled
        ));
        if (resumesCasting) {
          const presentation = director.getRenderPresentation();
          expect(presentation.towerRotation, `${definition.id}/${snapshot.cueId}`).toBeUndefined();
          expect(presentation.towerRotations, `${definition.id}/${snapshot.cueId}`).toBeUndefined();
        }
      });
      expect(director.getSnapshot().status).toBe('completed');
      director.dispose();
    }
  });

  it.each(thoughtRegistry.list().map((definition) => [definition.id, definition] as const))(
    'runs %s to completion against real combat events',
    (_id, definition) => {
      const director = new ThoughtSceneDirector(definition);
      runDirector(director);
      expect(director.getSnapshot().status).toBe('completed');
      director.dispose();
    },
  );

  it('publishes trigger before payload deployment', () => {
    const runtime = new CombatRuntime(41);
    const events: CombatEvent[] = [];
    const unsubscribe = runtime.subscribe((event) => events.push(event));
    runtime.setup({ slots: ['impact-trigger', 'pulse', 'proximity-mine'] });
    runtime.spawnSignal('spark');
    for (let step = 0; step < 16 * 120 && !events.some((event) => event.type === 'payload-deployed'); step += 1) {
      runtime.update(FIXED_SIMULATION_STEP);
    }
    const triggerIndex = events.findIndex((event) => event.type === 'trigger-fired');
    const payloadIndex = events.findIndex((event) => event.type === 'payload-deployed');
    expect(triggerIndex).toBeGreaterThan(-1);
    expect(payloadIndex).toBeGreaterThan(triggerIndex);
    unsubscribe();
    runtime.dispose();
  });

  it('uses the real compiler for focus conversion', () => {
    const runtime = new CombatRuntime(43);
    const forked = runtime.setup({ slots: ['double-fork', 'pulse'] }).shots[0];
    const focused = runtime.setup({ slots: ['focus-core', 'double-fork', 'pulse'] }).shots[0];
    expect(forked?.count).toBe(2);
    expect(focused?.count).toBe(1);
    expect(focused?.damage).toBeGreaterThan(forked?.damage ?? 0);
    expect(focused?.speed).toBeGreaterThan(forked?.speed ?? 0);
    runtime.dispose();
  });

  it('rebuilds deterministically when stepping backward', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.length > 1);
    if (!definition) throw new Error('Expected a multi-beat thought');
    const director = new ThoughtSceneDirector(definition);
    const target = definition.beats.length - 1;
    director.goTo(target);
    expect(director.getSnapshot().beatIndex).toBe(target);
    director.previous();
    expect(director.getSnapshot()).toMatchObject({ beatIndex: target - 1, status: 'paused' });
    director.dispose();
  });

  it('replays event-dependent state when a timeline unit is selected directly', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => beat.cues?.some((cue) => (
      cue.waitFor?.type === 'payload-deployed' && cue.waitFor.moduleId !== undefined
    ))));
    if (!definition) throw new Error('Expected a payload-dependent timeline unit');
    const sourceBeat = definition.beats.findIndex((beat) => beat.cues?.some((cue) => (
      cue.waitFor?.type === 'payload-deployed' && cue.waitFor.moduleId !== undefined
    )));
    const payloadSource = definition.beats[sourceBeat]?.cues
      ?.find((cue) => cue.waitFor?.type === 'payload-deployed' && cue.waitFor.moduleId !== undefined)
      ?.waitFor?.moduleId;
    if (!payloadSource) throw new Error('Expected an authored payload source');
    const director = new ThoughtSceneDirector(definition);
    const target = Math.min(sourceBeat + 1, definition.beats.length - 1);
    director.goTo(target);
    expect(director.getSnapshot().beatIndex).toBe(target);
    expect(director.getSnapshot().status).not.toBe('error');
    expect(director.runtime.engine.projectiles.some((projectile) => projectile.shot.source === payloadSource)).toBe(true);
    director.dispose();
  });

  it('replays signal-state waits when selecting a later timeline unit', () => {
    const definition = thoughtRegistry.list().find((candidate) => candidate.beats.some((beat) => (
      beat.cues?.some((cue) => cue.waitForSignalStates)
    )));
    if (!definition) throw new Error('Expected a signal-state wait');
    const director = new ThoughtSceneDirector(definition);
    const target = definition.beats.length - 1;
    director.goTo(target);
    expect(director.getSnapshot().beatIndex).toBe(target);
    expect(director.getSnapshot().status).not.toBe('error');
    director.dispose();
  });
});
