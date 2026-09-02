# System Overview

> Document type: **Overview** — read this page to understand the major boundaries before following code paths.

Prism Bastion separates configuration, deterministic simulation, presentation metadata, and rendering. The central rule is that gameplay code owns state changes while React observes immutable view data and the renderer observes live simulation entities.

## Major areas

| Area | Responsibility | Primary entry points |
| --- | --- | --- |
| `src/signals` | Declarative signal definitions, the ordered registry, shared capabilities, geometry, and compendium protocols | `registry.ts`, `types.ts`, individual signal files, `capabilities/`, `visuals/` |
| `src/game` | Session state, waves, signals, towers, collision, targeting, routes, and level configuration | `engine.ts`, `config.ts`, `types.ts` |
| `src/modules` | Module definitions, ordered compilation, runtime hooks, and the module registry | `compiler.ts`, `registry.ts`, `types.ts`, `index.ts` |
| `src/effects` | Short-lived visual effects, drawing primitives, effect layers, bloom, and distortion | `engine.ts`, `types.ts`, `painter.ts`, `bloom.ts` |
| `src/ui` | Screens, controls, workshop, reward draft, tutorial, and accessibility semantics | `App.tsx`, `GameSession.tsx`, `GameCanvas.tsx` |
| `src/i18n` | Language selection, resource registration, and presentation helpers | `index.ts`, `presentation.ts`, `locales/` |
| `src/defense-archive` | Defense persistence, storage adapters, achievement evaluation, and aggregate statistics | `repository.ts`, `storage.ts`, `indexed-db-storage.ts`, `achievements.ts`, `analytics.ts` |

## Runtime ownership

`GameEngine` is the authoritative owner of mutable combat state. It contains towers, signals, projectiles, effects, wave queues, inventory, and session status. Browser animation frames pass elapsed time to the engine, which converts it into fixed simulation steps.

At construction, the engine resolves the session identity and tutorial context into one immutable `SessionRules` object. Product identity remains in `GameMode`; concrete behavior such as inventory limits, rewards, economy, wave configuration, and scenario controls reads the corresponding rule instead of branching on the mode name. See [Session rules](internals/session-rules.md) for the policy boundaries.

Tower slot arrays are not interpreted during projectile flight. `ModuleRegistry` compiles a slot sequence into an immutable `TowerProgram`; the engine then casts the resulting `ShotBlueprint` trees. Module runtime behavior is invoked through hooks and a restricted combat API, so individual modules do not receive the engine itself.

Route geometry is a rooted tree whose leaves are entrances and whose root is the core. Every signal receives one entrance ID at spawn time, and that ID resolves to a unique entrance-to-core polyline. Movement, interception, displacement, and core-distance targeting all use that per-signal route.

## Presentation boundaries

React subscribes to immutable `GameViewSnapshot` objects for controls and panels. The Canvas renderer reads the live entity arrays because it renders every animation frame and must not wait for React snapshots. Toasts use a separate event subscription.

The engine also publishes semantic defense archive facts and one immutable completion report when a defense reaches `won` or `lost`. `DefenseArchiveRepository` evaluates archive policy against the injected `IArchiveStorage`; combat code never opens storage or evaluates achievement policy.

The battlefield is drawn into a Canvas 2D scene. Effects are inserted into named layers around towers, projectiles, and signals. When WebGL2 is available, a second emissive canvas is blurred and composited with the scene; otherwise the scene canvas is copied directly to the visible output.

## Dependency direction

```text
UI controls ───────▶ GameEngine ◀────── module runtime hooks
     │                   │                        │
     │                   ├──▶ signal registry/capabilities
     │                   ├──▶ route/collision     └──▶ restricted combat API
     │                   ├──▶ EffectEngine
     │                   └──▶ immutable view snapshots
     │
     └──▶ presentation helpers ───▶ i18next resources

GameRenderer ───▶ live engine entities + EffectEngine ───▶ Canvas/WebGL output

GameEngine ───▶ archive facts + completion report ───▶ DefenseArchiveRepository
                                                        │
                                                        ▼
                                                IArchiveStorage
                                                        │
                                                        ▼
                                             IndexedDBArchiveStorage
```

The focused explanations under [`internals/`](internals/) describe these mechanisms without turning into modification tutorials. Task-oriented changes belong under [`guides/`](guides/).
