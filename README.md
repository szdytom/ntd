# Prism Bastion

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI and GitHub Pages](https://github.com/szdytom/ntd/actions/workflows/ci.yml/badge.svg)](https://github.com/szdytom/ntd/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/play-GitHub%20Pages-6c5ce7)](https://szdytom.github.io/ntd/)

Prism Bastion is a geometric tower-defense game built around modular programming. Load projectiles, modifiers, logic, trails, and triggers into tower slots; the compiler reads them from left to right and turns their order into an attack program. The same modules can produce radically different results when rearranged.

**[Play online](https://szdytom.github.io/ntd/)**

## Highlights

- **Programmable builds:** 27 built-in modules cover piercing, forking, seeking, ricochet, area damage, damage over time, and nested triggers.
- **Order is the rule:** modifiers and logic affect the next projectile to their right, while an unfinished cast block may wrap once to the beginning.
- **Two game modes:** Standard mode includes inventory limits, opening drafts, post-wave rewards, and economic progression. Creative mode provides unlimited modules and shards plus a custom signal console.
- **Four distinct maps and five difficulties:** every sector has its own route, deployment nodes, enemy multipliers, and wave plan.
- **Mechanically distinct bosses:** shields, death splitting, and local cooldown suppression are introduced separately and later combined.
- **Reliable ballistics:** fixed-step simulation, continuous collision detection, path interception, piercing, and seeker retargeting support fast combat.
- **Lightweight rendering stack:** React drives the interface, Canvas 2D renders the battlefield, and WebGL adds optional bloom and shield refraction with automatic fallback.
- **English and Simplified Chinese UI:** powered by `i18next` and `react-i18next`, with a persistent in-game language switcher.

## Quick start

Node.js 22 or newer is required.

```bash
git clone https://github.com/szdytom/ntd.git
cd ntd
npm ci
npm run dev
```

Open <http://localhost:4173>. To create a production build:

```bash
npm run build
```

Static output is written to `dist/` and can be served by any static file host.

## How to play

1. Choose a sector, mode, and difficulty.
2. In Standard mode, complete three four-card picks before the first wave.
3. Select a dashed node to deploy a tower, then select the tower to open its module workshop.
4. Arrange modules from left to right. A tower attacks only when its sequence compiles into a valid projectile program.
5. Adjust targeting, upgrade towers, and launch the next signal wave.

Example combinations:

- `Seeker → Needle`: a guided piercing projectile can retarget nearby survivors.
- `Ricochet → Colossus → Razor`: a large blade redirects through enemy packs.
- `Impact → Pulse → Proximity → Mine → Nova`: Pulse deploys a mine on impact, and approaching enemies release the Nova payload.

Static payloads cannot be fired directly. They must occupy a payload position behind an impact, timer, or proximity trigger. The workshop reports incomplete and invalid sequences.

## Commands

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

## Architecture

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

Chinese technical documentation is retained in the repository:

- [Architecture and module extension](docs/architecture.md)
- [Built-in module catalog](docs/modules.md)
- [Balance baseline](docs/balance.md)
- [Rendering and frame performance](docs/perf-tips.md)

## Internationalization

All user-facing text is resolved through the shared i18next instance, including React components, tutorial copy, engine toasts, and Canvas labels. English is the fallback language; the initial locale follows a saved preference or the browser language.

Translation resources live in `src/i18n/locales/` as flat JSON objects. Every key maps directly to a string, for example `"levels.starter-elbow.name": "Launch Elbow"`; this keeps entries easy to search and edit without programming knowledge. Each file describes only its own language through `"lang.name"`—the English resource says `English`, while another locale supplies its own native name. The language selector reads these self-descriptions and automatically renders every registered resource as an option. Add matching keys to all locale files instead of embedding UI copy in components or game logic. `npm run check:locales` verifies that the files remain flat, aligned, and self-described. Outside documentation and locale files, source and test files intentionally contain no CJK characters.

## CI and GitHub Pages

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) validates pushes and pull requests with ESLint, TypeScript, Vitest, a production build, balance reporting, and Playwright smoke tests. A successful `main` build is deployed to GitHub Pages:

```text
https://szdytom.github.io/ntd/
```

Entry points and assets use relative paths, so no repository-specific base URL is required.
