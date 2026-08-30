# Contributor Guides

> Document type: **Overview** — use this page to select one task-focused workflow.

Each guide assumes the existing architecture and gives the shortest safe path for one kind of change.

- [Development workflow](development-workflow.md): install, run, validate, and hand off a change.
- [Testing boundaries](testing-boundaries.md): choose assertions that protect mechanics without freezing authored balance data.
- [Add a module](adding-a-module.md): define compiler behavior, runtime hooks, presentation, registration, and tests.
- [Add an effect](adding-an-effect.md): define effect geometry, register it, spawn it, and verify both render paths.
- [Add a level](adding-a-level.md): author route geometry, tower pads, waves, and localized presentation.
- [Add an enemy](adding-an-enemy.md): extend the enemy union, configuration, archive, visuals, localization, and tests.
- [Localization](localization.md): change user-facing copy or add a locale while preserving the resource contract.
- [UI style](ui-style.md): divide screens into meaningful rectangles and preserve the bright geometric visual language.
- [Rendering performance](rendering-performance.md): review hot paths and validate optimization work.

For explanations of why the runtime behaves as it does, use the [internals index](../internals/README.md).
