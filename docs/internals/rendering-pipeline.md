# Rendering Pipeline

> Document type: **Internals** — read this page to understand how scene drawing, effects, bloom, distortion, and fallback compose one frame.

The visible battlefield combines a Canvas 2D scene with an optional WebGL2 post-process. React owns the canvas element and animation-frame lifecycle but does not draw individual game entities.

## Scene canvas

`GameRenderer` owns an offscreen scene canvas and a cached background canvas. Resize handling caps device pixel ratio, computes a world-to-screen scale inside the fixed world dimensions, rebuilds the static background, and resizes post-process targets.

Each frame collects reusable entity lists, copies the cached background, applies the world transform, and draws in a fixed order. Effect layers are interleaved with terrain, towers, projectiles, signals, labels, and the core:

```text
ground effects
terrain fields and tower pads
towers
under-projectile effects
projectiles
projectile effects
signals
air effects
labels and core
overlay effects
```

Module projectile renderers are composed by `ModuleRegistry`: the source projectile renderer runs first, followed by participating non-source module overlays.

## Effect engine

An `EffectDefinition` is stateless geometry plus an ID, lifetime, layer, and optional bloom strength. `EffectEngine` owns timed instances. A reusable `EffectFrame` exposes normalized time (`fin`, `fout`, and `slope`), easing helpers, and deterministic indexed randomness derived from the instance ID.

Expired instances are recycled up to a fixed pool limit. Rendering reuses painter and frame objects. Effect definitions draw through `EffectPainter` primitives, which keeps their geometry independent of whether it is painted only to the scene or mirrored to an emissive target.

## Bloom and distortion

When WebGL2 is available, `WebGLBloomPipeline` receives the scene plus a lower-resolution emissive canvas. The emissive texture is blurred horizontally and vertically, then composited with the scene. The composite shader also receives bounded arrays describing shield, singularity, and split distortions.

Rift space uses a lower-resolution mask drawn from the current rift interiors. The composite shader reveals a shared screen-space field of regularly moving violet filaments through that mask, keeping the pattern spatially continuous between separated and crossing cracks without a full-resolution background texture. Mask painting, upload, and the shader branch are suspended unless a fielded tower equips a module with the `rift-space` tag and a rift currently exists.

Shader programs are compiled asynchronously and cached per WebGL context. A tiny warm-up context can populate browser and driver caches before the game canvas needs its programs. Context loss, restoration, resource disposal, and target reallocation are handled inside the pipeline.

If WebGL2 is unavailable, `GameRenderer` obtains a Canvas 2D context from the visible canvas and copies the finished scene directly. Gameplay and effect lifetimes remain unchanged; only bloom and shader distortion are absent.

The [effect guide](../guides/adding-an-effect.md) and [performance guide](../guides/rendering-performance.md) cover safe modification practices.
