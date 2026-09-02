# Session Rules

> Document type: **Internals** — read this page to understand how a session identity becomes concrete engine behavior.

`GameMode` identifies the product-facing kind of session. `SessionRules` describes the behavior that the engine and UI may perform during that session. Keeping these concerns separate prevents feature code from accumulating checks such as `mode === 'creative'` when it actually depends on unlimited inventory, configurable waves, or another specific capability.

## Resolution

`GameEngine` resolves one immutable rule object during construction and exposes it as `engine.rules`. The rules do not change during a session or after reset.

Current resolution has three variants without adding another game mode:

| Session identity | Context | Rule variant |
| --- | --- | --- |
| Standard | Tutorial level | Tutorial setup, limited inventory and economy, no draft rewards |
| Standard | Other levels | Standard setup, limited inventory and economy, draft rewards |
| Creative | Any level | Unlimited inventory and economy, configured waves and core, creative scenario controls |

The tutorial remains a Standard session. Its existing special setup is represented as a rule variant rather than a hidden mode.

## Policy boundaries

Each field answers one engine or UI question:

| Policy | Governs |
| --- | --- |
| `setup` | Starting inventory and tower slots |
| `inventory` | Module availability and installation limits |
| `rewards` | Initial and between-wave module drafts |
| `economy` | Starting shards and unlimited-shard presentation |
| `waves` | Level-defined or configured wave count |
| `core` | Standard or configured core stability |
| `signalScaling` | Level scaling or configured signal scales |
| `scenarioControls` | Availability of direct scenario controls and signal injection |
| `archive` | Eligibility context for defense archive facts |

Mode checks remain appropriate when code is presenting the session's identity, such as a mode name or Creative run indicator. Behavioral branches should read the narrow rule that grants the behavior.

## Extension boundary

New session types should compose or add explicit policies only when their behavior requires them. Campaign progression, unlock state, and Ponder-style demonstrations are not represented here yet; they should be modeled by their own data once those features exist, then select or derive the session rules needed to run an encounter.
