# Module Compiler

> Document type: **Internals** — read this page when a slot sequence, trigger tree, or runtime module effect is hard to infer from the source locally.

The module system has two phases. Compilation converts tower slots into immutable data; execution casts that data and invokes the participating modules' runtime hooks. This prevents projectile flight from repeatedly interpreting the tower layout.

## Compilation state

`compileProgram()` scans the slot array from left to right. Modifier, trail, and logic modules update a short-lived pending state through `modifyNext()` or `wrapNext()`. The state holds multiplicative and additive projectile patches, energy contributions, participating module IDs, and at most one trigger.

Module definitions also declare capability tags. After a projectile is emitted, the compiler compares its tags with the pending modules through the data-driven rules in `compatibility.ts`. Ineffective combinations produce warnings, and runtime hook/render dispatch skips the ineffective module; new modules opt into a rule by declaring the matching tag rather than editing the compiler or UI.

Tags may also opt a tower into a shared renderer capability. For example, `rift-space` enables the masked rift-space shader only while at least one fielded tower has a matching module installed and a live rift exists.

A projectile module calls `emitProjectile()`. The compiler applies the pending patches, records every participating module ID, creates a `ShotBlueprint`, and resets the pending state. The blueprint retains the resolved damage multiplier separately from rounded projectile damage so attached continuous systems can scale their own authored damage. A later projectile therefore starts with a clean state unless new modules modify it.

Patch fields do not all combine the same way:

- damage, speed, size, repeats, and energy multipliers multiply;
- pierce, splash bonuses, and energy refunds add;
- count, spread, slow, seeking, and several timing fields keep the strongest value;
- conversion patches such as Focus Core and Condense Core are resolved when the projectile is emitted, after the rest of the pending state is known.

That distinction is encoded in `compiler.ts`, not in individual module definitions.

## Wraparound

After the first scan, the compiler checks whether a modifier is still waiting for a projectile or a trigger is still waiting for payloads. If at least one root shot already exists, it replays the slots from the beginning once and stops as soon as the unfinished draw is resolved.

For example, `Pulse → Overdrive` emits a normal Pulse during the first scan. Overdrive remains pending at the end, so the replay reaches Pulse and emits a second, modified shot. The replay is strictly bounded to one pass; unresolved state becomes a diagnostic rather than an infinite loop.

Compiler wraparound is unrelated to `wrapNext()`. The former replays slots at the end of a sequence; the latter attaches a trigger to the next projectile.

## Trigger capture and blueprint trees

`wrapNext()` marks the next emitted projectile as a carrier. Its `TriggerSpec.payloadCount` tells the compiler how many later projectiles to capture. Captured shots are appended to the carrier's `payload` array instead of the program's root `shots` array.

Capture uses a stack, so a payload may itself be a triggered carrier. The result is a finite tree of `ShotBlueprint` objects. Energy and projected instance counts are calculated recursively, while only root shots are cast immediately.

Only one trigger can wrap a particular projectile. If consecutive triggers compete, the trigger nearest the projectile wins and the compiler emits `trigger-conflict`. The displaced trigger's module ID and energy contribution are removed from that carrier.

Static modules use the same blueprint type but include a `StaticProjectileSpec`. A static blueprint is valid only while a trigger is capturing payloads. At the root it produces `static-at-root`, because the runtime requires a trigger origin before it can deploy a static entity.

## Diagnostics and immutability

Compilation can report unknown modules, root-level static payloads, conflicting triggers, missing root projectiles, unresolved modifiers, and missing payloads. The UI reads structured diagnostics as well as their messages.

Before returning, the compiler recursively freezes module lists, payload lists, blueprints, diagnostics, and the `TowerProgram`. `ModuleRegistry` caches programs by the JSON representation of the slot array and evicts the oldest entry after the cache reaches its limit. This makes repeated tower updates cheap and prevents execution from mutating compiled data.

## Runtime dispatch

Each projectile copies its blueprint's module IDs. `ModuleRegistry` uses those IDs to dispatch `onCast`, `onTrail`, `onHit`, `onDeploy`, and `onTrigger`, and to compose projectile rendering. Runtime hooks receive an `EffectEngine` plus a restricted `ModuleCombatApi`, not `GameEngine`.

Modifier effects that should follow indirect damage or static areas use `targetEffect`. Carriers publish affected targets through the `damage` or `static` channel; the registry then invokes subscribed modifier effects. This avoids direct coupling between every carrier and every modifier.

The companion [module guide](../guides/adding-a-module.md) turns these concepts into an extension workflow.
