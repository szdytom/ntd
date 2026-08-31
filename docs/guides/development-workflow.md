# Development Workflow

> Document type: **Guide** — follow this page to run and validate a repository change without learning every subsystem first.

## Set up and run

Use Node.js 22 or newer. Install the lockfile exactly, then start the development server:

```bash
npm ci
npm run dev
```

Open <http://localhost:4173>. The development process watches TypeScript, CSS, and GLSL imports and serves `dist/` with source maps.

## Choose the smallest validation loop

Run the narrowest relevant check while editing, then run the full check before handoff.

| Command | Use |
| --- | --- |
| `npm run lint` | ESLint across the repository |
| `npm run typecheck` | Strict TypeScript checking without output |
| `npm test` | Vitest unit and component suite |
| `npm run test:e2e` | Playwright browser smoke tests |
| `npm run check:locales` | Flat, aligned locale resources and module placeholders |
| `npm run check:cjk` | Source-language boundary outside docs and locales |
| `npm run perf:report` | Spatial-index comparison workload |
| `npm run build` | Minified static assets in `dist/` |
| `npm run check` | CJK, locale, lint, type, unit/component, and production-build checks |

For one Vitest file, pass it through the script:

```bash
npm test -- tests/compiler.test.ts
```

Tests protect software contracts, not the current balance baseline. Read [Testing boundaries](testing-boundaries.md) before asserting production damage, energy, signal stats, wave composition, map coordinates, or report totals.

## Match the repository boundaries

- Put deterministic gameplay state and rules in `src/game/`.
- Put module-specific icon geometry, compilation, hooks, effects, and projectile painting in one `src/modules/<id>.tsx` file.
- Put reusable effect machinery in `src/effects/`.
- Keep one exported React component per `src/ui/*.tsx` file and import its same-named stylesheet.
- Resolve every user-facing string through i18next.
- Add regression coverage beside the subsystem tests rather than relying only on a browser smoke test.

## Before handoff

1. Inspect `git diff` and make sure unrelated user changes are untouched.
2. Run the focused tests that demonstrate the behavior.
3. Run `npm run check`.
4. For visual work, inspect both WebGL2 and Canvas fallback behavior at narrow and wide viewport sizes.
5. State any check that could not run and why.

Common mistakes are running only a production build, adding UI text before locale keys, and treating a passing unit test as proof that Canvas output has no visual regression.
