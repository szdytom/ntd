# AGENTS.md

Prism Bastion is a geometric tower-defense game built around modular programming. Load projectiles, modifiers, logic, trails, and triggers into tower slots; the compiler reads them from left to right and turns their order into an attack program. The same modules can produce radically different results when rearranged.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start esbuild watch mode and the local development server |
| `npm run build` | Produce minified static assets |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checking |
| `npm test` | Run Vitest unit and component tests |
| `npm run test:e2e` | Run Playwright browser smoke tests |
| `npm run check` | Run lint, type checking, tests, and a production build |
| `npm run balance:report` | Generate a balance report from current configuration |
| `npm run perf:report` | Run the spatial-index performance report |

### Architecture

```text
src/
├── game/       Combat engine, paths, collision, targeting, levels, and balance
├── modules/    Module definitions, registry, rarity, and sequence compiler
├── effects/    Effect lifecycle, Canvas painters, and effect factories
├── i18n/       Shared i18next instance, presentation helpers, and locale resources
├── ui/         React components with one colocated stylesheet per component
└── styles/     Global foundations and responsive rules
```

The combat engine runs at a fixed 120 Hz and publishes immutable snapshots to React. Modules interact through a restricted combat API for target queries, damage, status effects, and retargeting, keeping them independent from waves, economy, and UI code.

Technical documentation:

- [Documentation map](docs/README.md)
- [System overview](docs/architecture.md)
- [Built-in module catalog](docs/modules.md)
- [Contributor guides](docs/guides/README.md)
- [Implementation explanations](docs/internals/README.md)

### Internationalization

All user-facing text is resolved through the shared i18next instance, including React components, tutorial copy, engine toasts, and Canvas labels. English is the fallback language; the initial locale follows a saved preference or the browser language.

Translation resources live in `src/i18n/locales/` as flat JSON objects. Every key maps directly to a string, and matching keys must be added to both locale files. Do not embed user-facing copy in components or game logic. `npm run check:locales` verifies that the resources remain flat, aligned, and self-described. Outside documentation and locale files, source and test files intentionally contain no CJK characters.

## Commit messages

Use the Conventional Commits style used by this repository:

```text
<type>: <short, lowercase summary>
```

Preferred types are `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, and `chore`. Keep the type lowercase, write the summary in the imperative mood, describe one focused change, and omit a trailing period.

Examples:

- `feat: remember level selection`
- `fix: correct triune-delta display settings`
- `perf: update enemy spatial index incrementally`

Use a scope only when it materially improves clarity. Keep unrelated changes in separate commits.
