# Module Draft

> Document type: **Internals** — read this page to understand adaptive module quality, compatibility weighting, and draft abandonment.

Standard-mode module offers draw four unique definitions from one weighted pool. Tutorial levels provide fixed modules and Creative mode exposes the full library, so neither uses this process.

## Quality center

Rarity contributes quality points: Common `1`, Uncommon `2`, Rare `3`, Epic `4`, and Legendary `5`.

For every offer, the engine averages the quality points of all owned copies, including installed modules. It blends that inventory average with the current reward-batch anchor:

```text
b = clip((1-alpha) × anchor + alpha × inventoryAverage - bias + boost, 1, 5)
```

Each level declares one anchor for the opening draft and one for every pre-final wave reward. A boost is `1` only for the offer immediately following an abandonment.

## Candidate weights

Every registered module competes independently:

```text
base = max(epsilon, 1 - tanh(k × (quality-b)²))
weight = base × recent-choice factor × ownership factor × compatibility factors
```

The recent-choice factor reduces modules shown in the preceding offer. The ownership factor reduces repeated copies as total ownership grows. Compatibility factors inspect idle copies: projectile coverage for affordable towers, static-payload and reliable-trigger imbalance, and the relationship between trail modules and trail carriers. Terrain Trigger is deliberately excluded from reliable-trigger counts.

The opening draft adds a hard opportunity floor. Its first offers reserve one card for a reliable trigger or static payload. Once the player takes one half, the following offer reserves the complementary half. If neither half is owned by the third offer, Micro Nova is reserved as a one-card area fallback. The player can still decline every reserved option.

The draft performs weighted sampling without replacement. Catalog composition therefore affects total rarity probability: adding a module gives its rarity another independently weighted candidate.

## Abandonment

Abandoning consumes the current selection without adding inventory. Levels cap abandonments for the whole run, and two abandonments cannot be consecutive. The next offer receives a one-time quality boost; if abandonment ends a reward batch, both the boost and the consecutive-use lock carry into the next batch. Selecting a module clears the lock.
