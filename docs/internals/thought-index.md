# Thought Index

The Thought Index teaches module programming through deterministic scenes using the real compiler, combat loop, effects, and renderer. It is not a game mode and has no rewards, economy, defense reports, or effect on module availability.

## Runtime boundary

`CombatRuntime` exposes scene setup, compilation, spawning, casting holds, fixed-step updates, combat events, and a `RenderWorld`. Its private Creative-configured engine is inaccessible to storyboards. A casting hold preserves tower cooldowns and prevents unintended follow-up shots while a subject is being explained.

`GameCanvas` and `ThoughtCanvas` share the renderer through the read-only `RenderWorld`. Thought scenes have no battlefield pointer handlers or build commands. Storyboards must not reproduce module damage or motion rules.

`CombatEvent` reports semantic combat facts with stable entity IDs and originating shots where relevant. Events are observational; they expose no mutable-state callbacks. Captions and assertions can track the exact entity captured by an event gate.

## Definitions and playback

Each module owns a `packages/web-shared/src/thoughts/<module>.thought.ts` companion. Companions may import runtime and presentation data; combat modules must remain independent from thoughts. `thoughts/catalog.ts` is the sole aggregation point and player-facing order. Supporting modules and combinations do not become separate top-level records.

`ThoughtDefinition` is a plain-data protocol with focal metadata, diagnostic mappings, a fixed seed, and ordered beats. Pure authoring factories resolve metadata and reusable fragments. Optional local scenes describe path, tower position, camera, and signal scale; shared scenes are named for teaching geometry. Definitions without a local scene retain the legacy fallback.

Beats are clickable keyframes; their cues control setup, loadouts, spawning, waits, easing, and overlays. Subjects may start at a route position or a distance before tower range; range-relative placement follows the actual route and tower configuration. Subsequent movement and targeting use combat rules.

`ThoughtSceneDirector` owns playback and navigation:

- The timeline is continuous, with beat widths derived from deterministic runtime durations. Selecting a keyframe reconstructs its state by resetting and replaying preceding beats at the fixed simulation step; it does not scrub arbitrary time.
- An indefinite wait is a zero-duration event gate. Timeline fill stops at a rotating square marker until all declared conditions hold. Conditions may combine a semantic event, an empty scene, and restored tower energy. Every semantic wait requires a positive simulation-time timeout.
- Cameras may reserve screen-space clearance below a focal point as the transcript changes viewport height. Captions grow their leader before fading in text, then hide text before retracting the leader. The module badge retains the section title.

For storyboard design, reusable factories, and examples, use the [authoring skill](../../.agents/skills/thought-index-authoring/SKILL.md).

## Navigation contract

Contextual links map only focal module IDs and diagnostic codes; supporting modules do not inherit a record. Main deployment always exposes the index. Workshop, Reward Draft, and diagnostics show contextual actions only for direct mappings.

Opening the index keeps the underlying run mounted and inert, applies the `thought-index` automatic-pause condition, and suspends its canvas loop. Closing removes only that condition and restores focus to the originating control, preserving Draft and Workshop state. Viewing state is not persisted.

## Validity

Registered thoughts require unique IDs and focal modules, at least one beat, existing localized title/summary/caption keys, positive timeline durations, and positive semantic-wait timeouts. Tests run every scene to completion at the fixed step and verify navigation reconstruction, important event ordering, and compiler comparisons.
