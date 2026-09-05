# Adding a Level

> Document type: **Guide** — follow this page to add a map, routes, tower pads, and waves without tracing the engine.

Levels are data entries in `packages/game-core/src/game/config.ts`. The UI, engine, route renderer, wave preview, and Creative mode discover them through `LEVELS`.

## 1. Choose route geometry

For one entrance, use `legacyPathToGraph()` with points ordered from the entrance to the core:

```ts
graph: legacyPathToGraph([
  { x: -40, y: 120 },
  { x: 300, y: 120 },
  { x: 300, y: 500 },
  { x: 1120, y: 500 },
], 'level-id'),
```

For multiple entrances, use `createRouteMap()`. Every node points to its next parent toward the core:

```ts
graph: createRouteMap([
  { id: 'north', position: { x: -40, y: 120 }, parent: 'merge' },
  { id: 'south', position: { x: -40, y: 520 }, parent: 'merge' },
  { id: 'merge', position: { x: 360, y: 320 }, parent: 'core' },
  { id: 'core', position: { x: 1120, y: 320 }, parent: null },
], ['north', 'south']),
```

Use unique, stable node IDs. Provide exactly one root, make every declared entrance a leaf, and avoid zero-length edges. Authored levels currently use only horizontal, vertical, and 45-degree edges; the level configuration test enforces that visual language.

The game world is `1160 × 650`. Existing maps place entrances slightly off the left edge and the core near the right edge so signals enter and leave cleanly.

## 2. Place tower pads

Add `towerPads` as world coordinates. Check that pads do not overlap route strokes, other pads, the core, or important UI-safe edges. Test representative minimum and maximum distances to route segments when layout depends on deliberate coverage.

## 3. Define waves and entrance behavior

Use the local `wave()` helper with `[signalType, count, optionalEntrance]` groups.

```ts
waves: [
  wave(['spark', 6], ['kite', 2]),
  wave(['block', 4], ['crown', 1, 'north']),
],
```

An entry without an entrance is copied to every entrance queue. On a three-entrance map, `['spark', 6]` therefore produces six Sparks per entrance. An explicit entrance restricts the entry to that lane. Signal types marked as bosses must always specify an entrance.

Each entrance has an independent spawn timer, so lane queues advance in parallel rather than sharing one global delay.

## 4. Complete the level entry

Provide all `LevelDefinition` fields:

- stable `id` plus English fallback `name`, `sector`, and `description`;
- `difficulty` display rank and `accent` color;
- `graph`, `towerPads`, and `waves`;
- `moduleDraft.initialPicks` and `moduleDraft.wavePicks` as positive integers;
- one `moduleDraft.qualityAnchors` value per wave, beginning with the opening reward and ending with the reward before the final wave;
- finite `qualityBias`, an `inventoryInfluence` from `0` to `1`, and a non-negative whole-run `abandonLimit`;
- required session setup and scale fields.

Add matching `levels.<id>.name` and `levels.<id>.description` keys to both locale files. The UI uses those localized keys rather than the fallback strings in configuration.

## 5. Verify discovery and geometry

1. Update level-count assertions and add a focused case in `tests/level-config.test.ts`.
2. Test root, entrance, confluence, pad, wave, and boss-placement invariants that are specific to the new map.
3. Run `pnpm check:locales` and the route/level tests.
4. Play the map in Standard and Creative modes.
5. Inspect route arrows, entrance markers, core placement, tower selection, and narrow-screen scaling.

Avoid copying an old map and leaving its route prefix, treating unassigned multi-lane spawns as round-robin, specifying a non-leaf entrance, or relying on a visual playthrough instead of construction tests.
