# Adding a Module

> Document type: **Guide** — follow this page to add one module without tracing the compiler and runtime end to end.

Use an existing module of the same kind as the starting template. Keep its icon, compilation, runtime hooks, effects, and projectile painting in `src/modules/<id>.tsx` so the module remains discoverable from one file.

## 1. Choose the compiler category

| Kind | Compile action | Runtime expectation |
| --- | --- | --- |
| `projectile` | `emitProjectile(spec)` | Creates a moving root shot or captured payload |
| `static` | `emitProjectile({ ..., static })` | Can only be deployed as a trigger payload |
| `modifier` | `modifyNext(patch)` | Changes the next emitted projectile |
| `trail` | `modifyNext(patch)` | Changes the next projectile and normally owns `onTrail` behavior |
| `logic` | `modifyNext(patch)` or `wrapNext(trigger)` | Changes scheduling, aiming, cost, or payload capture |

If the desired behavior cannot be expressed by `NextShotPatch`, `TriggerSpec`, runtime hooks, `targetEffect`, or `ModuleCombatApi`, extend those shared types deliberately and add compiler tests before depending on the new field.

## 2. Define one source of truth

Put gameplay values in a local `stats` constant. Derive compile values, hook behavior, effect geometry where appropriate, and `meta.text` interpolation values from it.

Declare the module's capability `tags` on its definition. Tags are module-owned properties used by compatibility rules; do not maintain reverse lists of module IDs inside a tag or compiler component.

```tsx
import { createModuleIcon } from './icons';

const IonIcon = createModuleIcon(<>
  <path className="module-icon__line" d="M4 16h24" />
  <circle className="module-icon__fill" cx="16" cy="16" r="5" />
</>);

const stats = { speedMultiplier: 1.2 } as const;

export const ionModule: ModuleDefinition = {
  id: 'ion',
  kind: 'modifier',
  tags: [],
  icon: IonIcon,
  meta: {
    name: 'Ion Lens',
    shortName: 'Ion',
    color: '#00c2ff',
    displayColor: '#0083ad',
    tint: '#e4f9ff',
    energy: 9,
    rarity: 'uncommon',
    text: {
      detail: { speed: Math.round((stats.speedMultiplier - 1) * 100) },
    },
  },
  compile: (context) => context.modifyNext({ speedMultiplier: stats.speedMultiplier }),
};
```

`color` belongs to combat rendering and effects. `displayColor` is the independently tunable DOM interface color and must maintain at least 3:1 contrast against white. It may match `color` when the original already passes.

Do not duplicate concrete gameplay numbers in locale text. Module description and detail templates must use placeholders backed by the exact keys in `meta.text`.

## 3. Add runtime behavior through the narrow API

Use hooks for events owned by the carrier:

- `onCast` for launch feedback;
- `onTrail` for periodic path behavior;
- `onHit` for the carrier's direct collision;
- `onDeploy` for creation of a static payload;
- `onTrigger` for a static activation or trigger release.

Use `ModuleCombatApi` for target queries, damage, slows, statuses, retargeting, and route displacement. Do not import or cast to `GameEngine` from a module.

Use `targetEffect` when a modifier should follow targets affected by many carrier types. Subscribe to `damage` for actual health-damage propagation and `static` for non-damaging areas that explicitly publish affected targets. Carriers should publish what they affect; they should not know the IDs of modifier modules.

Never retain the array returned by `nearbyEnemies()`: the engine reuses it. Process it immediately or copy it only when later retention is genuinely required.

## 4. Add visuals

- Define a dedicated geometric SVG component beside the module definition and assign it through the required `icon` field. Use `createModuleIcon()` only for the shared canvas contract; never add module-specific geometry to the shared icon helper. Module cards, slots, inspectors, and reward drafts render the definition's component directly.
- Put module-owned `EffectDefinition` objects in the module file and expose them through `effects`.
- Give effect IDs a `module:<module-id>:<event>` namespace.
- Use `renderProjectile` for persistent projectile geometry and hooks for short-lived feedback.
- Balance every `ctx.save()` with `ctx.restore()` and avoid per-frame allocation in render callbacks.

The [effect guide](adding-an-effect.md) covers effect definitions in detail.

## 5. Register and localize

1. Import the definition in `src/modules/index.ts`.
2. Add `.register(ionModule)` in `createModuleRegistry()`.
3. Add matching `modules.ion.name`, `.short`, `.description`, and `.detail` keys to both locale files.
4. Use identical interpolation placeholder names in every locale.

Registration automatically exposes the module to the library, compiler, effect registration, hook dispatch, and projectile renderer composition.

## 6. Test the contract

At minimum, test:

- registration and kind;
- the compiled blueprint or diagnostic for a representative sequence;
- interaction with ordering or wraparound when relevant;
- runtime damage, status, retargeting, deployment, or trigger behavior;
- target-effect propagation for both direct and indirect carriers when used;
- locale placeholder coverage.

Run the focused module/compiler tests, `npm run check:locales`, and finally `npm run check`.

## Avoid these patterns

- Adding module-ID branches to `GameEngine`, `GameRenderer`, or unrelated carriers.
- Applying modifier status only in `onHit`, which misses splash, chains, trails, and static areas.
- Casting a static module at the root instead of placing it behind a trigger.
- Keeping mechanics in locale copy or maintaining a second table of display values.
- Using `Math.random()` in effect rendering, which makes frames unstable and tests difficult.
