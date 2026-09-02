# Documentation Map

> Document type: **Overview** — use this page to choose the right document before reading code or making a change.

This index covers contributor-facing technical documentation only. The root English and Chinese READMEs are player-facing project pages and are intentionally outside this classification.

Every page in this documentation set has one purpose:

1. **Overview** pages establish vocabulary, boundaries, and major concepts before code-level investigation.
2. **Internals** pages explain behavior that is difficult to reconstruct from individual source files.
3. **Guides** provide safe modification paths and common failure cases without requiring full implementation knowledge.

Reusable agent and contributor workflows live in the [project skill index](skills/README.md). Skills route a specific task through the relevant overview, internals, guide, source, and validation steps.

If a page starts answering a different kind of question, follow its link to the matching page rather than expecting both answers in one place.

## Overviews

| Page | Read it when you need... |
| --- | --- |
| [System overview](architecture.md) | Subsystem ownership and dependency direction |
| [Built-in module catalog](modules.md) | The module vocabulary and available behaviors |

## Implementation explanations

| Page | Read it when you need to understand... |
| --- | --- |
| [Internals index](internals/README.md) | Which implementation explanation applies |
| [Module compiler](internals/module-compiler.md) | Pending modifiers, wraparound, triggers, payloads, and hook dispatch |
| [Module draft](internals/module-draft.md) | Adaptive quality, compatibility weights, and abandonment state |
| [Session rules](internals/session-rules.md) | The boundary between session identity and executable behavior policies |
| [Thought Index](internals/thought-index.md) | How live module demonstrations share combat logic and rendering |
| [Cross-cutting combat mechanics](internals/combat-runtime.md) | Target-effect propagation, damage ordering, spatial queries, and configured signal traits |
| [Route graphs](internals/route-graphs.md) | Multi-entrance paths and per-signal route sampling |
| [Rendering pipeline](internals/rendering-pipeline.md) | Canvas layers, effects, bloom, distortion, and fallback |
| [Defense archive](internals/defense-archive.md) | Defense telemetry, local persistence, statistics, and achievement rules |

## Modification guides

| Page | Use it to... |
| --- | --- |
| [Guides index](guides/README.md) | Choose a task-oriented workflow |
| [Development workflow](guides/development-workflow.md) | Set up, validate, and structure a change |
| [Testing boundaries](guides/testing-boundaries.md) | Test software contracts without freezing balance decisions |
| [Add a module](guides/adding-a-module.md) | Implement and register a module safely |
| [Add an effect](guides/adding-an-effect.md) | Create a reusable visual effect |
| [Add a level](guides/adding-a-level.md) | Author a route graph, pads, and waves |
| [Add a signal](guides/adding-a-signal.md) | Define and register a signal vertical slice |
| [Localization](guides/localization.md) | Add or change user-facing text |
| [UI style](guides/ui-style.md) | Extend the bright geometric, Mondrian-inspired interface |
| [Rendering performance](guides/rendering-performance.md) | Avoid hot-path regressions and verify visual optimization |

Historical implementation plans and the numerical balance baseline are intentionally not part of the new documentation set. Current behavior is documented from the source and tests instead.
