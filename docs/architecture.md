# System Overview

> Document type: **Overview** — read this page to understand the major boundaries before following code paths.

Prism Bastion separates deterministic simulation, co-op coordination, browser presentation, and deployable applications. The central rule is that `game-core` owns gameplay state changes while React and Canvas observe its neutral interfaces.

## Workspaces

| Area | Responsibility | Primary entry points |
| --- | --- | --- |
| `packages/game-core` | DOM-free combat, signals, runtime modules, plans, snapshots, notices, and visual cues | `src/index.ts`, `src/game/engine.ts`, `src/modules/`, `src/signals/` |
| `packages/coop` | Wire schemas, shared planning rules, co-op controller, result comparison, and authoritative simulation | `src/protocol.ts`, `src/controller.ts`, `src/simulation.ts`, `src/results.ts` |
| `packages/web-shared` | Canvas/WebGL rendering, effects, module presentation, common UI, thoughts, search, and flat locale resources | `src/index.ts`, `src/game/renderer.ts`, `src/module-presentations/`, `src/ui/`, `src/i18n/` |
| `apps/web-single` | Single-player shell, levels, tutorial, rewards, archive, and browser persistence | `src/App.tsx`, `src/GameSession.tsx`, `src/main.tsx` |
| `apps/web-coop` | Full single-page site and dynamically loaded co-op UI/client | `src/FullSiteApp.tsx`, `src/coop-feature.tsx`, `src/client.ts` |
| `apps/coop-server` | Node HTTP/WebSocket process, rooms, Origin policy, and worker scheduling | `src/index.ts`, `src/coop-room.ts`, `src/combat-worker.ts` |

## Runtime ownership

`GameEngine` owns mutable combat state: towers, signals, projectiles, wave queues, inventory, and session status. It converts elapsed time into fixed simulation steps. It has no React, Canvas, i18n, WebSocket, or co-op dependency and compiles against the ES2022 library without DOM typings.

At construction, the engine resolves an immutable `SessionRules` object. Product identity remains in `GameMode`; concrete behavior such as inventory limits, rewards, economy, waves, and scenario controls reads rules instead of branching on an external mode name. `GamePlan`, phase input/result types, and planning commands let a controller drive externally authoritative sessions without teaching the core about co-op.

Tower slot arrays are compiled into immutable `TowerProgram` trees. Runtime module definitions contain only compilation, numbers, and combat hooks. Browser icons, colors, effect definitions, and projectile painters live in the parallel presentation registry in `web-shared`.

Route geometry is a rooted tree whose leaves are entrances and whose root is the core. Every signal receives one entrance ID at spawn time. Movement, interception, displacement, and core-distance targeting all use that signal's entrance-to-core route.

## Presentation and application boundaries

React subscribes to immutable `GameViewSnapshot` values. The Canvas renderer reads live entities through `RenderWorld`, and semantic visual output flows through `VisualFeedbackSink`: browsers inject an effect adapter while the authoritative worker uses a no-op sink. Structured `GameNotice` values are translated only in the web layer.

`web-shared` components do not branch on co-op mode. Co-op panels, ready actions, and overlays enter through props and slots owned by `web-coop`. `web-single` has no dependency on co-op code or copy. The full site composes `SinglePlayerApp` and dynamically imports its co-op feature; importing or preloading that chunk does not create a WebSocket.

The authoritative server imports only `game-core` and co-op protocol/simulation subpaths. Pure result comparison is kept separate from simulation so the server main thread does not load `GameEngine`; workers perform deterministic replay.

## Dependency direction

```text
game-core ◀── coop ◀── coop-server
    ▲          ▲
    │          └── web-coop (dynamic feature)
    └── web-shared ◀── web-single ◀── web-coop (site shell)

GameEngine ──▶ snapshots + GameNotice + semantic visual cues
GameRenderer ──▶ RenderWorld + EffectEngine ──▶ Canvas/WebGL
```

The focused explanations under [`internals/`](internals/) describe mechanisms; task-oriented changes belong under [`guides/`](guides/).
