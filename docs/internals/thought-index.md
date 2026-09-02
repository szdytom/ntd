# Thought Index

> Document type: **Internals** — read this page to understand authored combat demonstrations, their runtime boundary, and their navigation contract.

The Thought Index teaches module programming with deterministic scenes that execute the real compiler, module hooks, combat update loop, effects, and renderer. It is not a game mode and does not participate in session rules, rewards, economy, defense reports, or module availability.

## Runtime boundary

`CombatRuntime` is the session-free control surface used by authored scenes. It adapts a private Creative-configured `GameEngine`, but only exposes setup, compilation, signal spawning, authored casting holds, fixed-step update, combat-event subscription, and a `RenderWorld`. A casting hold preserves and later restores tower cooldowns so a captured subject cannot receive an unintended follow-up shot while its state is being explained. This boundary keeps draft, wave, economy, archive, and product-mode operations unavailable to storyboards while allowing internal extraction to remain behavior-neutral.

`RenderWorld` is the read-only dependency of `GameRenderer`. Both `GameCanvas` and `ThoughtCanvas` therefore render the same entities and effects. Thought scenes never install pointer handlers or issue build commands.

The separate `CombatEvent` stream reports semantic facts such as compilation, casting, projectile hits, trigger release, payload deployment, status application, damage, defeat, leaks, and energy changes. Events contain stable entity IDs and the originating shot where relevant. They are observational and do not expose callbacks into mutable combat state.

## Definitions and playback

Each covered module owns a neighboring `*.thought.ts` companion. The combat module remains independent from the Thought Index, while the companion imports the module and resolves its authored storyboard through pure factories under `src/thoughts/authoring/`. `src/thoughts/catalog.ts` is the explicit player-facing order and the only central aggregation point. Supporting modules may appear inside a scene, but mechanics and combinations do not become top-level index records.

`ThoughtDefinition` remains the director's plain-data playback protocol. Authoring factories fill focal metadata from the module, collect modules used by loadout actions, derive polished beat widths from timed cues, and expand reusable storyboard fragments without introducing a second runtime. Definitions may declare a compact scene model containing only their path, tower position, camera, and signal scaling. Shared scene factories under `src/thoughts/scenes/` are named for their teaching geometry rather than a particular module. `CombatRuntime` converts the resolved model into a private level definition, so an explanation can use the smallest useful geometry without rendering and cropping an existing campaign level. Definitions without a scene model retain the legacy fallback while they are migrated.

Each definition declares contextual diagnostic mappings, a fixed seed, and ordered keyframe beats. A beat contains one or more cues. Cues independently choreograph scene construction, loadout changes, entity spawning, semantic waits, presentation easing, and overlays; only beats appear as clickable keyframes. A scene may spawn a subject at an authored route position or a world-space distance before the route enters tower range when travel from the entrance carries no teaching value. The engine estimates the first and last attackable progress along the actual sampled route, so these placements follow changes to paths, tower positions, and range. Once visible, the subject continues through the real movement and targeting systems. An authored indefinite wait is a zero-duration event gate: the continuous timeline fill stops at its square marker while the marker rotates, then resumes when all declared conditions are satisfied. Conditions may compose a semantic event, an empty scene, and fully restored tower energy. Every semantic wait has a simulation-time timeout so broken content fails visibly in development and tests.

`ThoughtSceneDirector` owns playback, event matching, captions, scene-value interpolation, nonlinear simulation-rate easing, and beat navigation. Event gates may capture the stable entity ID carried by a combat event, allowing subsequent captions and state assertions to follow the exact signal that triggered the explanation instead of whichever signal happens to be visible. The timeline is one continuous track. Invisible hit regions and visible keyframe ticks divide it according to authored durations measured from the deterministic runtime; selecting a region jumps to that keyframe rather than scrubbing arbitrary simulation time. A jump resets the scene and replays preceding beats at the fixed simulation step so event-dependent state is reconstructed before the selected boundary. Storyboards never reproduce module damage or motion rules themselves.

The player renders the authored local scene when one exists. A local camera may reserve responsive screen-space clearance below a focal world coordinate, keeping anchored overlays a fixed distance from their subject even when the transcript changes the viewport height. The module badge also carries the persistent section title. In-scene captions use a two-phase animation: a dashed leader grows from the visual subject to the chosen text anchor, then the text panel fades in; dismissal fades the panel before retracting the leader. Every module in the registry now owns a companion entry. The Condensing Lens scene is the polished reference implementation for the modifier-across-carrier pattern; the status-modifier, projectile, trail-wake, static-payload, and trigger families reuse shared authoring factories and shared scenes so repeated storyboard fragments stay DRY.

## Navigation contract

The registry builds reverse indexes for focal module IDs and diagnostic codes. Related modules used as examples do not inherit the record. Main deployment always exposes the index. Workshop inspectors, Reward Draft cards, and compiler diagnostics expose a contextual action only when a direct mapping exists; uncovered subjects do not render placeholders.

The index mounts over the existing screen. The underlying run remains mounted, becomes inert, receives the `thought-index` automatic-pause condition, and suspends its canvas loop. Closing removes only that pause condition and restores focus to the originating control, preserving Draft and Workshop state. No viewing state is persisted in this slice.

## Authoring checks

Each registered thought must have a unique ID and focal module, at least one beat, existing localized title, summary, and caption keys, positive timeline durations, and positive timeouts for semantic waits. Tests run every scene at the fixed simulation step until completion and separately verify navigation reconstruction, important event ordering, and compiler comparisons.
