# Development Workflow

> Document type: **Guide** — follow this page to run and validate a repository change without learning every subsystem first.

## Set up and run

Use Node.js 22 or newer. Install the lockfile exactly, then start the development server:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:4173>. The development process watches TypeScript, CSS, and GLSL imports and serves `apps/web-single/dist/` with source maps.

## Choose the smallest validation loop

Run the narrowest relevant check while editing, then run the full check before handoff.

| Command | Use |
| --- | --- |
| `pnpm lint` | ESLint across the repository |
| `pnpm typecheck` | Strict TypeScript checking without output |
| `pnpm test` | Vitest unit and component suite |
| `pnpm test:e2e` | Playwright browser smoke tests |
| `pnpm format:locales` | Complete and canonically format locale resources |
| `pnpm check:locales` | Flat, aligned, formatted locale resources and module placeholders |
| `pnpm check:cjk` | Source-language boundary outside docs and locales |
| `pnpm perf:report` | Spatial-index comparison workload |
| `pnpm build` | Minified single-player assets in `apps/web-single/dist/` |
| `pnpm check` | CJK, locale, lint, type, unit/component, and production-build checks |

For one Vitest file, pass it through the script:

```bash
pnpm test -- tests/compiler.test.ts
```

Tests protect software contracts, not the current balance baseline. Read [Testing boundaries](testing-boundaries.md) before asserting production damage, energy, signal stats, wave composition, map coordinates, or report totals.

## Match the repository boundaries

- Put deterministic gameplay state and rules in `packages/game-core/src/game/`.
- Split module runtime definitions under `packages/game-core/src/modules/` from browser presentation under `packages/web-shared/src/module-presentations/`.
- Put reusable browser effect machinery in `packages/web-shared/src/effects/`.
- Keep shared React components under `packages/web-shared/src/ui/`; single-only and co-op-only screens belong to their app workspace.
- Resolve every user-facing string through i18next.
- Add regression coverage beside the subsystem tests rather than relying only on a browser smoke test.

## Before handoff

1. Inspect `git diff` and make sure unrelated user changes are untouched.
2. Run the focused tests that demonstrate the behavior.
3. Run `pnpm check`.
4. For visual work, inspect both WebGL2 and Canvas fallback behavior at narrow and wide viewport sizes.
5. State any check that could not run and why.

Common mistakes are running only a production build, adding UI text before locale keys, and treating a passing unit test as proof that Canvas output has no visual regression.
