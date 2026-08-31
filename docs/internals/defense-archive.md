# Defense Archive

> Document type: **Internals** — read this page to understand how completed defenses become local statistics and achievements.

## Boundary and lifecycle

`GameEngine` owns combat truth. It counts actual enemy spawns, defeats, core arrivals, and the bodies still active when a loss occurs. Fracture children use a separate persisted variant so their bodies reconcile without inventing another configured enemy type.

The engine emits two kinds of events for the defense archive:

- semantic facts after successful actions such as building a second tower, changing targeting, or firing a trail-bearing program;
- one immutable `DefenseCompletedReport` when a run first reaches `won` or `lost`.

Resetting creates a new run identifier and clears in-memory telemetry. Exiting before a terminal state does not publish a report.

## Persistence

`DefenseArchiveRepository` owns validation and business rules but knows nothing about a specific persistence technology. It receives an `IArchiveStorage` implementation whose `read` callbacks expose a consistent snapshot and whose `write` callbacks commit atomically. This preserves the transaction that writes a completed Standard defense and its derived achievement progress together.

`IndexedDBArchiveStorage` is the browser default. Its `prism-bastion-defense-archive` database contains a defense store and one achievement-state record. The run identifier is also the defense key, making repeated completion delivery idempotent. Other adapters can implement the same boundary without changing the repository, UI, or engine event flow.

Records include the data schema version and build commit metadata. Presentation resolves level, enemy, module, difficulty, and targeting labels from current localization resources; unknown historical identifiers remain visible as identifiers rather than making the record unreadable.

Creative defenses are not persisted. Tutorial Standard defenses are persisted and included in descriptive statistics, but only tutorial achievements consume their result. Other Creative actions can still satisfy the tutorial achievements that teach Creative controls.

## Metric model

The dashboard derives every displayed aggregate from defense records rather than maintaining a second set of totals:

- overall counts summarize completed defenses;
- the sector tab groups the same records by level and derives a local signal ledger;
- wave analysis compares defenses that reached each wave, then reports how many cleared it and what happened to its signals;
- signal rows sum the same wave tallies by enemy variant.

This keeps wins, losses, enemy outcomes, and detail views reconcilable. Wall duration uses record timestamps and includes planning, draft, pause, and combat time. Simulation duration advances only during `wave` fixed steps, so planning, reward selection, and pause time are excluded. A flawless victory means the final core equals its maximum.

## Achievement state

Achievement definitions are code-owned and localized by stable IDs. The persisted state stores only durable facts, sets, counters, and first-unlock timestamps. Tutorial facts are mode-independent unless the action itself requires Creative mode. Progress and challenge facts accept only non-tutorial Standard play.

The shared Settings panel clears both stores in one transaction, so history, statistics, and achievements reset together. The destructive control requires two clicks on the same button within five seconds; closing Settings or letting the interval expire disarms it without opening another confirmation dialog.
