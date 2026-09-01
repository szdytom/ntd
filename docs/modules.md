# Built-in Module Catalog

> Document type: **Overview** — use this catalog to learn the available concepts before reading module implementations.

The registry contains 40 modules in five compiler categories. Names below match module IDs and source files; localized display text lives in `src/i18n/locales/`.

## Projectile modules

Projectile modules emit a castable shot and consume all pending modifiers.

| ID | Display name | Role |
| --- | --- | --- |
| `pulse` | Pulse Round | Stable baseline projectile |
| `prism-slug` | Prism Slug | Dense high-damage single-target projectile |
| `needle` | Piercing Needle | Fast projectile that can pass through multiple targets |
| `nova` | Micro Nova | Impact projectile with area damage |
| `geode-bloom` | Geode Bloom | Heavy impact projectile with a large crystal blast |
| `arcbolt` | Arcbolt Core | Impact projectile that chains damage to nearby signals |
| `razor` | Returning Razor | Wide cutting projectile built for repeated contacts |
| `void-beam` | Void Beam | Collisionless fixed-heading carrier for trail modules |

## Static payload modules

Static payloads are deployed at a trigger position. They cannot be cast as root shots.

| ID | Display name | Role |
| --- | --- | --- |
| `proximity-mine` | Hex Proximity Mine | Arms, waits for a nearby signal, and detonates |
| `rift-barrier` | Rift Barrier | Forms four persistent spatial rifts in a hollow diamond |
| `tesla-node` | Tesla Sentry | Repeatedly shocks nearby targets |
| `ember-field` | Ember Scorch Field | Maintains a low-cost burning area |
| `toxic-cloud` | Emerald Toxic Cloud | Maintains a corrosive area |
| `singularity` | Collapse Singularity | Pulls signals toward its route-relative center |

## Modifier modules

Modifiers patch the next emitted projectile.

| ID | Display name | Role |
| --- | --- | --- |
| `overdrive` | Overdrive Prism | Trades efficiency for stronger projectile properties |
| `frost` | Condensing Lens | Propagates slowing to affected targets |
| `double-fork` | Double Fork | Emits two projectiles with a narrow spread |
| `fork` | Triple Fork | Emits multiple projectiles with spread |
| `ricochet` | Ricochet Mirror | Redirects a surviving projectile after impact |
| `ember-coating` | Ember Coating | Propagates a light burning status |
| `toxin` | Corrosive Spore | Propagates a periodic damage status |
| `searing-sigil` | Searing Sigil | Propagates a heavy burning status |
| `starfire-matrix` | Starfire Matrix | Propagates a rapid legendary burning status |
| `colossus` | Colossus Core | Enlarges and strengthens the next projectile |
| `focus-core` | Focus Core | Converts extra projectiles, repeats, pierce, and chains into one focused shot |
| `condense-core` | Condense Core | Converts area radius into direct damage |

## Trail modules

| ID | Display name | Role |
| --- | --- | --- |
| `resonant-trail` | Resonant Trail | Publishes damage waves along the carrier path |
| `cinder-trail` | Cinderwake | Leaves a broad damaging fire wake that burns crossing signals |
| `starfire-trail` | Starfire Wake | Leaves a persistent starfire wake that damages and burns crossing signals |
| `rift-trail` | Riftwake | Leaves persistent damaging spatial rifts along the carrier path |

## Logic and trigger modules

Logic modules alter how the next projectile is scheduled, aimed, or wrapped.

| ID | Display name | Role |
| --- | --- | --- |
| `echo` | Echo Command | Repeats the next shot after a delay |
| `seeker` | Seeker Protocol | Turns the next projectile toward a live target |
| `barrage` | Four-Beat Clock | Repeats the next shot in a rapid sequence |
| `economizer` | Economizer Circuit | Reduces the next cast's compiled energy cost |
| `emergency-battery` | Emergency Battery | Reduces the next projectile's energy cost by a flat amount |
| `reclaim-circuit` | Reclaim Circuit | Converts health damage into tower energy |
| `impact-trigger` | Impact Trigger | Releases payloads after a health-damaging collision |
| `timer-trigger` | Timer Trigger | Releases payloads when its timer ends or it collides first |
| `expiration-trigger` | Expiration Trigger | Releases payloads when the carrier reaches its normal end |
| `terrain-trigger` | Terrain Trigger | Releases payloads after crossing a route centerline or colliding early |

The [module compiler explanation](internals/module-compiler.md) describes how these categories interact. The [module extension guide](guides/adding-a-module.md) covers implementation work.
