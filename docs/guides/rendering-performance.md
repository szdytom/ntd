# Rendering Performance

> Document type: **Guide** — use this checklist when adding or optimizing per-frame Canvas, effect, spatial-query, or post-processing work.

The simulation runs at 120 Hz while rendering follows the display. Small allocations and state changes inside entity loops multiply quickly, so measure changes under dense combat rather than judging an isolated frame.

## Keep hot paths allocation-light

- Reuse point objects, candidate arrays, render contexts, distortion records, and option objects.
- Compact arrays in place with a write index instead of `filter()` during fixed-step cleanup.
- Use `collectWithinRadius(..., result)` and `collectAlongSegment(..., result)` when a caller-owned buffer is available.
- Scan once for a best candidate instead of sorting the full list.
- Compare squared distances when the actual distance is not needed.
- Cache parsed colors, stable labels, gradients, sprites, and static background geometry.
- Use `frame.random(index)` for effect variation instead of creating random particle data every render.

Do not retain shared query buffers returned by `ModuleCombatApi.nearbyEnemies()`. Copying them defensively on every call defeats the reuse contract; retaining them without copying lets later queries overwrite the contents.

## Control Canvas state deliberately

`save()` and `restore()` are useful boundaries, but they are not free. Place them around one logical drawing unit rather than every primitive. Reset sticky state such as line dash, composite mode, alpha, transform, shadow, font, and alignment before a later draw depends on defaults.

Avoid `shadowBlur` for large numbers of moving objects. Prefer a small cached glow sprite, simple translucent geometry, or the dedicated emissive pass. Use gradients for large or distinctive effects, not every minor particle.

## Cache by lifetime

- Draw ground and route geometry into the background canvas on resize.
- Cache reusable entity sprites when their shape is stable and transformation is cheap.
- Keep short procedural effects in `EffectEngine` when their geometry genuinely changes over normalized lifetime.
- Rebuild caches only when their dimensions or source parameters change.

An offscreen canvas is valuable only when it replaces more work than its draw and memory cost. A separate canvas per entity usually does not.

## Treat WebGL as a bounded post-process

The current pipeline uploads the Canvas scene and a lower-resolution emissive canvas, performs two blur passes, and composites bounded distortion arrays. An active rift adds one lower-resolution reveal-mask upload; its shared moving filament field is generated directly in the composite shader. Mask work and the shader branch are gated by the module-owned `rift-space` tag and the presence of a live rift. Preserve those bounds and inactive paths when adding a new uniform array, texture, or distortion family.

Every important shape and contrast cue must remain visible in Canvas fallback. Bloom should enhance feedback, not carry the only readable representation. Check context loss and resize paths when changing WebGL resources.

## Measure and verify

1. Record a repeatable dense scene and the device/browser used.
2. Use the browser performance panel to separate JavaScript, Canvas, upload, shader, and layout costs.
3. Run `npm run perf:report` for changes involving the signal spatial index.
4. Compare before and after at equal world state, viewport, device pixel ratio, and speed.
5. Inspect output at normal speed, paused state, and speed-up.
6. Check WebGL2 and Canvas fallback for missing layers, leaked state, and changed opacity.
7. Run unit tests and `npm run check`; automated correctness does not replace visual review.

Avoid optimization claims based only on asymptotic complexity, allocating a temporary structure to save one arithmetic operation, rebuilding the spatial index every step, or increasing internal render resolution without measuring the upload and fill-rate cost.
