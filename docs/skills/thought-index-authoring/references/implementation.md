# Prism Bastion Thought Implementation Guide

Use this reference after the storyboard and visible copy are approved.

## Keep ownership cohesive

- Define each entry beside its module in `src/modules/<module>.thought.ts`.
- Export the module-owned definition and register it through the Thought Index definition collection.
- Keep `ThoughtDefinition` as the primitive data contract.
- Use authoring factories for repeated combinations of beats, cues, loadout presentation, and cleanup. Do not hide unique story logic behind a broad abstraction.
- Put broadly useful authored scene maps in the shared Thought scene catalog. Keep one-off maps with the owning entry.

The entry should read top to bottom like its storyboard. Extract repetition, not meaning.

## Make combat events truthful

Use the authored combat runtime for visible combat rather than reproducing module behavior in animation code. Wait for semantic state through runtime predicates and events.

Typical synchronization points include:

- a signal entering estimated tower range;
- a shot being fired or a projectile hitting;
- a modifier or status becoming observable;
- a signal dying, leaving the relevant area, or crossing a point;
- tower energy returning to the required state;
- transient effects completing.

Use the engine's reusable helpers when the requirement belongs to combat generally, such as estimating the progress interval attackable by a tower or deleting a signal through a basic runtime API. Prefer orchestration for presentation-only behavior, such as waiting until leaked signals cross a merge point and then removing them together.

Do not add multi-track combat semantics, special targeting rules, or balance changes merely to make a demonstration convenient.

## Separate authored time from simulation time

Use timeline durations for visual choreography:

- path drawing;
- build-spot fades;
- placement particles;
- dialogue expansion;
- module insertion and replacement;
- highlight transitions;
- leader drawing and erasing;
- smooth tower rotation;
- nonlinear slowing, pausing, resuming, and acceleration.

Use indefinite timeline waits for outcome-dependent combat. The progress UI must stop at the wait, rotate its square marker while unresolved, and mark it complete after the condition passes.

Avoid fixed-time guesses for kills, hits, energy refill, or travel through range. These drift when balance, simulation, or scene geometry changes.

## Preserve presentation continuity

For loadout dialogue bubbles:

- on the entry's first loadout presentation, show the first module with the dialog, then animate each later module when teaching composition;
- when a new loadout differs by one insertion, removal, or replacement, preserve the previous presentation and animate that edit;
- when it differs substantially, open the dialog while immediately adding the first module, then add the rest one at a time in program order; do not hold on an empty dialog;
- show an existing loadout immediately when the story starts from a known configuration;
- animate replacement from the old module to the new module;
- expand or contract the bubble smoothly;
- keep module cell widths and gaps invariant during highlight changes;
- keep labels inside their available width in longer locales;
- support configured bubble sides and diagonals without changing the focal anchor.

Author those transitions with the presentation semantics the director expects:

- For the first presentation, open `dialog` with the first visible module and leave `animateLoadoutChanges` unset. The module is present as the dialog appears.
- For later additions while the dialog remains open, increase `loadoutVisibleSlots` or expand `loadoutVisibleRange`; the director identifies newly visible modules and animates only those cells.
- For a substantial rebuild, configure the new loadout while hidden, then open `dialog` with its first module visible and `animateLoadoutChanges: true`. The dialog and first insertion begin together, without an empty-dialog cue.
- For a one-slot replacement, reopen the previous complete loadout, then apply the new setup in the next cue with `animateLoadoutChanges: true`.

Use `LOADOUT_ADDITION_CADENCE` for every non-final cue in a run of successive additions. A final addition cue may be longer to hold the completed program, but its start must remain on the same cadence as the preceding additions.

Keep steady geometry in the base CSS state. The resting cell width and inter-cell margin must not depend on an animation's forwards fill; the addition keyframe should end at exactly those base values so removing `.adding` cannot collapse a gap or move neighboring cells.

Prefer border and inset edge accents for active emphasis while preserving the cell, icon, and label colors. Keep the border width and every other box-model value unchanged so highlighting cannot move cells or alter their spacing.

Small loadout chips below towers must keep a fixed visual distance from the tower and respond to transcript expansion or viewport changes. They should not overlap the tower.

## Author readable captions

Attach each caption to a semantic target, not a stale screen coordinate. Resolve layout after the scene and transcript dimensions are known.

- Fit width to content up to a maximum width.
- Keep the box near its target.
- Prefer vertical-up, vertical-down, then rightward leaders.
- Place the LTR reading start near the leader endpoint.
- Reflow to another layout when space is insufficient.
- Animate leader first and text second; remove text first and leader second.
- Cancel or replace old guide animations so orphaned line fragments cannot drift across the canvas.

Use dialogue bubbles for loadout composition and leader captions for causal statements. Do not add a leader to a bubble whose clipped edge already points to the tower.

## Build only the scene the lesson needs

Use a simple authored map with the full relevant geometry visible. Typical shared scenes include:

- one road and one build spot for a direct interaction;
- one road with clustered targets for area behavior;
- a static-payload arrangement;
- two lanes that converge for carrier comparisons.

Reveal the entire experiment geometry before acting on only part of it. Spawn signals just before the meaningful range interaction, with a fade from outside the viewer's current attention, instead of spending seconds on uneventful travel.

When a signal has already proved its point and is safely beyond relevant tower range, let orchestration fade or delete it if continuing simulation would create dead time. Preserve a visible resolution when that resolution is part of the claim.

## Finish every causal arc

After the final meaningful hit or kill:

1. Wait for the required signals to die, exit, cross the cleanup point, or otherwise satisfy the claim.
2. Wait for any required tower energy state.
3. Leave a short settling interval for particles and recoil.
4. Smoothly rotate towers to their resting angle.
5. Remove temporary loadouts, captions, signals, and effects.

Replay, section navigation, and scrubbing must reconstruct the same deterministic state. Cleanup must be safe when a section is skipped or replayed.

## Localize all visible copy

Add flat keys to `src/i18n/locales/en.json`, then run `npm run format:locales`. Follow the entry's established key shape for:

- summary;
- section titles;
- captions;
- optional transcript text when it is not derived from those layers.

Do not place visible copy in TypeScript, React, Canvas code, or tests. Source and test files outside locale resources and documentation must contain no CJK characters.

## Test invariants, not authored wording

Tests may verify:

- every registered entry resolves and has valid sections;
- cues reference known targets and modules;
- progress markers and indefinite waits are structurally consistent;
- runtime cleanup is deterministic;
- module dependencies are discoverable;
- replay and navigation reach stable states;
- accessible UI semantics exist.

Do not assert:

- exact localized sentences;
- exact choreography durations unless the duration itself is an API invariant;
- specific positions, damage, energy, health, or other independently tunable values;
- pixel coordinates that should be covered by layout behavior or visual review.

## Validate proportionally

Run focused checks first, then the project-wide checks appropriate to the change:

```sh
npm test -- thoughts.test.ts thought-index.test.tsx
npm run thoughts:report
npm run typecheck
npm run check:locales
npm run lint
npm run build
```

Also inspect the entry interactively:

- play from the start at normal speed;
- click every progress marker;
- replay sections around indefinite waits;
- expand the full transcript;
- resize the viewport;
- switch between English and a longer locale;
- watch highlights, replacements, leaders, bubble edges, and cleanup frame by frame near transitions;
- after each addition animation and after `.adding` is removed, confirm every settled cell gap remains equal and the earlier cells do not jump.

Visual correctness is part of the feature. Passing structural tests does not prove that attention, spacing, or rhythm works.
