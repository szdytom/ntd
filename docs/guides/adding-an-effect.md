# Adding an Effect

> Document type: **Guide** — follow this page to add short-lived visual feedback without coupling it to simulation state.

Use an `EffectDefinition` for transient geometry such as sparks, rings, muzzle flashes, and deployment pulses. Use entity rendering instead when the visual must persist for the full lifetime of a signal or projectile.

## Define the effect

An effect needs a globally unique ID, lifetime, optional layer and bloom strength, and a stateless render callback:

```ts
const effects: readonly EffectDefinition[] = [{
  id: 'module:ion:hit',
  lifetime: 0.35,
  layer: 'air',
  bloom: 0.8,
  render: (frame, painter) => {
    painter.ring(
      frame.x,
      frame.y,
      4 + frame.easeOut(3) * 32,
      3 * frame.fout,
      frame.color,
      frame.fout,
    );
  },
}];
```

Choose the layer by occlusion intent: `ground`, `under-projectile`, `projectile`, `air`, or `overlay`. Omit `bloom` to use the layer default, set a strength to tune emission, or use `false` to exclude the effect from the emissive pass.

Use `frame.fin`, `fout`, `slope`, `easeIn()`, and `easeOut()` for time. Use `frame.random(index, ...)` and `randomSign(index)` for stable per-instance variation. Each visual feature should own fixed random indices so adding one feature does not reshuffle the others.

## Register the definition

- For a module-owned effect, include it in that module's `effects` array. The module registry registers it with each new engine.
- For shared game feedback, add it to `packages/web-shared/src/effects/game-effects.ts` and its ID to `GAME_EFFECT_IDS` when callers benefit from a typed constant.

Duplicate IDs fail immediately during engine construction.

## Spawn it

Call `effects.spawn(id, { position, rotation, color, data, lifetimeScale })`, or `spawnMany()` for a coordinated group. Copying the spawn position is handled by the engine. Put additional immutable rendering inputs in `data` and type the definition accordingly.

## Verify it

1. Trigger the effect at the shortest and longest expected lifetimes.
2. Check its relationship to projectiles, signals, and overlays at the chosen layer.
3. Check WebGL bloom and the Canvas-only fallback.
4. Confirm high spawn rates do not introduce frame churn.
5. Add an effect-engine test when lifecycle, data, or recycling behavior is non-trivial.

Avoid mutating simulation objects from `render`, creating gradients or temporary arrays for every small particle, using raw `Math.random()`, or relying on bloom to make low-contrast scene geometry readable.
