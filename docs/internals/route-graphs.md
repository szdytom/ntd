# Route Graphs

> Document type: **Internals** — read this page when route construction, multi-entrance spawning, or cross-branch targeting is unclear.

Maps use a rooted tree directed toward the core. A node's `parent` is its next node toward the root; `children` are derived in the opposite direction. Entrances are leaf nodes, and the single node with a `null` parent is the root.

## Construction and validation

`createRouteMap()` accepts lightweight node inputs and optional declared entrances. During construction it rejects duplicate IDs, missing parents, self-parenting, cycles, zero-length edges, multiple roots, duplicate entrances, and entrances that are not leaves. It then materializes nodes, directed edges, entrance IDs, the root ID, and cached distances to the root.

`legacyPathToGraph()` turns a simple list of points into a one-entrance chain. This is why single-route and branching levels share the same engine path.

## Resolving a route

`resolveRoute(map, entrance)` follows parents from one entrance to the root and passes those points to `createPathSampler()`. The resulting sampler exposes:

- total polyline length;
- allocation-friendly sampling into an existing point;
- nearest scalar distance on the polyline;
- the first intersection time between a movement segment and the route centerline.

`GameEngine` caches one sampler per entrance. Each enemy's `routeId` remains fixed for its lifetime, including split children.

## Multi-entrance waves

At wave start, the engine creates an independent queue and timer for every entrance. `resolveSpawnEntrances()` expands each wave entry:

- an entry with an explicit entrance goes only to that queue;
- an ordinary entry without an entrance is copied to every entrance queue;
- an enemy type marked `boss` must specify an entrance.

Because lane timers advance independently, equivalent queue positions can spawn simultaneously. Broadcasting means a three-entrance map creates three instances of each unassigned wave entry; it is not round-robin distribution.

## Shared ordering across branches

Normalized progress cannot compare two routes with different lengths. The engine instead calculates `route.length - enemy.distance`. That remaining physical route distance is meaningful before and after a confluence and drives core-nearest targeting and related tie-breakers.

The route model deliberately has no runtime path choice. An entrance identifies one unique parent chain, which keeps movement, interception, displacement, splitting, and ordering deterministic.
