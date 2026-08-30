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
