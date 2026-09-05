# Adding a Module

> Document type: **Guide** — follow this page to add a module across the runtime and browser presentation registries.

Use an existing module of the same kind as the starting template. A module has two matching files with the same ID:

- `packages/game-core/src/modules/<id>.ts` contains deterministic values, compilation, tags, and combat hooks.
- `packages/web-shared/src/module-presentations/<id>.tsx` contains its icon, colors, effects, and Canvas painters.

The presentation file may import the core definition when it needs shared authored values; the core file must never import its presentation.

## 1. Choose the compiler category

| Kind | Compile action | Runtime expectation |
| --- | --- | --- |
| `projectile` | `emitProjectile(spec)` | Creates a moving root shot or captured payload |
| `static` | `emitProjectile({ ..., static })` | Can only be deployed as a trigger payload |
| `modifier` | `modifyNext(patch)` | Changes the next emitted projectile |
| `trail` | `modifyNext(patch)` | Changes the next projectile and normally owns `onTrail` behavior |
| `logic` | `modifyNext(patch)` or `wrapNext(trigger)` | Changes scheduling, aiming, cost, or payload capture |

If the behavior cannot be expressed by the shared blueprint, trigger, runtime hooks, target effects, or `ModuleCombatApi`, extend those neutral core types deliberately and add compiler tests first.

## 2. Define the runtime

Put gameplay values in one exported `stats` constant when presentation also needs them. Derive compile values, hook behavior, and `meta.text` interpolation values from it. Runtime hooks emit semantic cue IDs through `visuals`; they do not construct browser effects.

```ts
export const ionStats = { speedMultiplier: 1.2 } as const;

export const ionModule: ModuleRuntimeDefinition = {
  id: 'ion',
  kind: 'modifier',
  tags: [],
  meta: {
    color: '#00c2ff',
    energy: 9,
    rarity: 'uncommon',
    text: { detail: { speed: 20 } },
  },
  compile: (context) => context.modifyNext({ speedMultiplier: ionStats.speedMultiplier }),
};
```

Use `ModuleCombatApi` for target queries, damage, slows, statuses, retargeting, and route displacement. Never import or cast to `GameEngine`. Never retain the reused array returned by `nearbyEnemies()`.

## 3. Define the presentation

Create the matching presentation with a geometric SVG icon and browser-only metadata. Put `EffectDefinition` values, `renderProjectile`, bloom painting, and other visual adapters here. Effect IDs use `module:<module-id>:<event>`.

```tsx
export const ionPresentation: ModulePresentation = {
  id: 'ion',
  icon: createModuleIcon(<path className="module-icon__line" d="M4 16h24" />),
  meta: {
    color: '#00c2ff',
    displayColor: '#0083ad',
    tint: '#e4f9ff',
  },
};
```

Balance every Canvas `save()` with `restore()`, avoid per-frame allocation, and keep the DOM `displayColor` at least 3:1 against white. The [effect guide](adding-an-effect.md) covers browser effect definitions.

## 4. Register and localize

1. Register the runtime definition in `packages/game-core/src/modules/index.ts`.
2. Register the matching browser definition in `packages/web-shared/src/module-presentations/index.ts`.
3. Add flat `modules.<id>.name`, `.short`, `.description`, and `.detail` keys to `packages/web-shared/src/i18n/locales/en.json`.
4. Run `pnpm format:locales` and translate the matching keys without changing placeholder names.

Do not duplicate gameplay numbers in locale copy; use placeholders backed by `meta.text`.

## 5. Test the contract

At minimum, test registration in both registries, compilation or diagnostics, ordering/wraparound, runtime behavior, semantic visual cues, presentation metadata, and locale placeholders. Run focused module/compiler tests, `pnpm check:locales`, and finally `pnpm check`.

Avoid module-ID branches in `GameEngine` or `GameRenderer`, browser types in `game-core`, applying target modifiers only to direct hits, casting static payloads at the root, and nondeterministic `Math.random()` calls in runtime logic.
