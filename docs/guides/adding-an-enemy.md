# Adding an Enemy

> Document type: **Guide** — follow this page to add an enemy type across simulation, visuals, archive, and localization.

Enemy types are a closed TypeScript union backed by a complete configuration record. Adding one intentionally produces type errors at places that maintain an explicit presentation order.

## 1. Extend the type and configuration

1. Add the ID to `EnemyType` in `src/game/types.ts`.
2. Add a complete entry to `ENEMIES` in `src/game/config.ts`.
3. Select a supported `shape`, or extend the enemy drawing helpers for new geometry.
4. Use optional `movement`, `shield`, `armor`, `split`, or `aura` configuration only when its existing runtime semantics match the new enemy.
5. Set `boss: true` only when every wave occurrence should require an explicit entrance.

Configuration names are English fallbacks. Player-facing names still require locale keys.

## 2. Add presentation coverage

Add the enemy ID to the explicit ordered lists in:

- `src/ui/CreativeLab.tsx`;
- `src/ui/EnemyArchive.tsx`;
- `src/ui/LevelSelect.tsx`.

Add `enemies.<id>`, `enemyArchive.enemies.<id>.role`, and `enemyArchive.enemies.<id>.description` to both locale files. If the enemy introduces a new ability category, add its archive label/detail keys and teach `EnemyArchive` how to select them.

`EnemySpecimen` and `GameRenderer` share configuration and drawing helpers, but bespoke shapes or demonstrations may require changes in both. Keep the archive specimen representative of battlefield behavior without running a hidden `GameEngine` inside the component.

## 3. Add runtime behavior only at a shared seam

Prefer data-driven optional configuration plus a small helper in `src/game/` over an enemy-ID branch in the main update loop. Existing examples separate shield, armor, movement, and visual shape logic into focused files.

If a genuinely new mechanic needs engine work:

1. define the configuration shape;
2. add lifecycle behavior at the relevant engine phase;
3. update spatial-index membership whenever position or death state changes;
4. route all damage through the common damage path;
5. add focused tests for timing, reset, death, and interaction with shields/statuses;
6. add renderer feedback that remains understandable without WebGL.

## 4. Put the enemy in a level

Add it to one or more wave groups. On multi-entrance maps, remember that an unassigned entry is broadcast to every lane. A boss-marked type requires an explicit entrance and is validated during module import.

## 5. Verify the full surface

- Run the focused enemy tests and `tests/level-config.test.ts`.
- Open Creative mode and spawn the enemy on every entrance of a branching map.
- Check the archive, wave preview, colors, shape, health feedback, death, and core arrival.
- Exercise any optional mechanic with slow, status damage, splash, and repeated hits.
- Run `npm run check:locales`, then `npm run check`.

Avoid updating only `ENEMIES`, reusing an optional mechanic with different semantics, bypassing the shared damage path, or adding an enemy that is available in waves but absent from Creative mode and the archive.
