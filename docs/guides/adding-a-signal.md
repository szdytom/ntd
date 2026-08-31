# Adding a Signal

> Document type: **Guide** — follow this page to add a signal across simulation, visuals, the compendium, and localization.

Signal definitions are declarative vertical slices under `src/signals/`. The ordered registry is the only source used by the engine, Creative mode, the compendium, wave previews, the defense archive, and spectrum achievements.

## 1. Define and register the signal

1. Create `src/signals/<id>.ts` with `defineSignal`.
2. Declare its base stats, text keys, visual geometry, capability list, variants, and compendium entry.
3. Import the definition into `src/signals/registry.ts` and place it in the intended presentation order.
4. Add `signals.<id>` and the three `signalArchive.signals.<id>.*` keys to both locale files.

`SignalId` and `SignalVariantId` are derived from the registry. Do not add parallel ID unions or presentation lists.

## 2. Compose existing behavior and visuals

Use existing capability kinds when their semantics match: `pulse-movement`, `shield`, `damage-cap`, `split-on-death`, and `tower-suppression-aura`. Capability handlers own runtime algorithms; definitions contain data and never receive `GameEngine`.

Use an existing visual geometry when possible. Canvas battlefield drawing and SVG icons interpret the same visual descriptor, so a definition must not branch into renderer-specific code.

For an interactive compendium specimen, declare a demo mode. The generic compendium owns controls and state; definitions select specimen/profile descriptors such as `split-result` or `tower-under-aura`.

## 3. Extend a shared protocol when necessary

For a genuinely new mechanic:

1. add a discriminated capability type;
2. implement its shared handler under `src/signals/capabilities/`;
3. connect the handler at the appropriate engine phase without checking a signal ID;
4. represent runtime feedback as standard effect events;
5. add focused timing, damage, death, status, and reset tests.

New geometry or compendium demo primitives follow the same rule: extend the shared interpreter, then select the primitive from the signal definition.

## 4. Put the signal in a level

Add it to one or more wave groups in `src/game/config.ts`. An entry without an entrance is broadcast to every lane. A boss-marked signal requires an explicit entrance. Signals included in the spectrum achievement must appear in at least one non-tutorial Standard defense.

## 5. Verify

- Run the focused capability/visual tests and `tests/level-config.test.ts`.
- Spawn the signal from Creative mode on each entrance of a branching map.
- Check its compendium record, demo, icon, wave preview, health feedback, death, and core arrival.
- Run `npm run check`, `npm run test:e2e`, `npm run balance:report`, and `npm run perf:report`.
