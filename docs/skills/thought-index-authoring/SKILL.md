---
name: thought-index-authoring
description: Design, review, or implement Prism Bastion Thought Index entries with focused Ponder-style storyboards, concise localized copy, semantic combat synchronization, reusable local scenes, and deliberate pacing. Use for new or revised module `*.thought.ts` demonstrations; do not use for general tutorials, balance changes, or ordinary combat features.
---

# Prism Bastion Thought Authoring

Create a demonstration that lets a player predict what the focal module will do in a new loadout. Treat the Thought Index as an animated explanation, not a miniature match, a reference manual, or a showcase of an optimal build.

## Read the relevant context

Before planning or editing:

1. Read the focal module definition and its combat implementation.
2. Read its current `*.thought.ts`, if one exists.
3. Read one or two existing entries with the closest teaching problem. Use [storytelling.md](references/storytelling.md) to choose the right precedent.
4. Read [implementation.md](references/implementation.md) before writing code or tests.
5. Inspect the locale keys used by the entry. Keep all visible copy in i18n resources.

Do not copy an existing storyboard mechanically. Reuse its teaching pattern only when the new module creates the same kind of player question.

## Define the teaching contract

Write these five items before writing beats:

- **Transfer goal:** one sentence describing what the player should be able to predict afterward.
- **Visible proof:** the smallest combat event that proves the rule without relying on prose.
- **Supporting cast:** the simplest modules and signals that expose the rule.
- **Boundary:** the most important variant, limitation, or counterexample that prevents a likely misconception.
- **Non-goals:** adjacent mechanics that the entry deliberately does not explain.

The focal module must remain the grammatical and visual subject. Supporting modules are teaching instruments. If the viewer must learn a supporting module to understand the scene, simplify or replace it.

## Draft the storyboard before implementation

Keep two columns in the plan:

- **Direction:** scene construction, camera/layout, transitions, waits, state checks, and cleanup. This is never visible copy.
- **Visible copy:** only section titles and short captions the player should read.

Do not turn production instructions into captions. The animation should show actions such as waiting for range, firing, slowing time, replacing a module, or resetting a tower.

Build the explanation in this order unless the mechanic requires a different causal order:

1. Establish the scene and focal object.
2. Show the ordinary positive case.
3. Name the rule after or as the evidence becomes readable.
4. Change one relevant factor.
5. Show a variant, boundary, or counterexample.
6. Let the final outcome settle, then restore a clean resting state.

Prefer one claim per section and one visual focus per beat. Combine sections when they share one continuous experiment and separate them when the player must revise their mental model.

## Write layered copy

Use each copy layer for one job:

- **Entry summary:** the module's durable fundamental. It helps players decide whether to open the entry.
- **Section title:** a short verb-object promise describing the current question, such as using a modifier on projectiles or range.
- **Caption:** one causal claim anchored to a visible module, signal, impact, or state change.

Write captions so the scene supplies the nouns that do not need repeating. Prefer concrete causality over terminology. Keep qualifiers only when they prevent a real misunderstanding.

Never explain everything the engine is doing. Never narrate obvious movement. Never make the supporting module the subject unless the sentence is explicitly contrasting how the focal module interacts with it.

## Direct attention like Ponder

Start with a simple local authored scene. Draw paths, fade build spots, place towers with particles, and reveal loadouts only when the viewer needs them. Do not render a full level and crop it.

For each caption:

1. Choose the visual target.
2. Choose a nearby text position with a clear reading start.
3. Draw the leader from the target toward that reading start.
4. Fade in the text after the leader establishes the connection.
5. Fade out the text before erasing the leader in reverse.

Prefer leader directions in this order when space allows: vertical up, vertical down, then right. Avoid crossing paths, towers, loadout bubbles, or other captions. Keep captions close enough that the eye does not search.

Use change to create emphasis. Highlight the element being discussed without dimming another element so aggressively that the dimming becomes the strongest visual change. Stable layout is part of clarity: highlighting, localization, and replacement animations must not move neighboring modules.

## Pace by comprehension, not by a timer

Use animation time for authored transitions and semantic state for combat outcomes.

- Use durations for drawing, fades, module insertion, replacement, leader animation, smooth rotation, and nonlinear slow-to-pause/resume.
- Use runtime waits for entering range, a confirmed hit, an effect being applied, a signal dying or crossing a point, tower energy refilling, and particles settling.
- Show indefinite waits as square progress markers. Pause progress at an active wait, rotate its marker, and fill it with the accent color after resolution.

Space successive module additions by a shared onset cadence. If the completed loadout needs a longer reading hold, put that extra time after the final addition rather than varying the pauses between intermediate modules.

Allocate reading time from the localized rendered text, not from a hard-coded assumption about sentence length. Do not give title changes an isolated empty beat when they can accompany the scene transition.

Let causal moments breathe. A useful default is: event, brief observation window, caption or comparison, then resolution. Use the existing entries' timing only as a starting point; shorten dead travel and lengthen moments where the player must compare or revise a model.

Spawn combat subjects near the meaningful interaction rather than making the viewer wait through irrelevant travel. After a kill or escape, allow a short settling interval so particles and recoil resolve. At the end, wait for required outcomes, refill conditions, and cleanup; then smoothly return towers to their resting angle.

## Review with four gates

### Focus

- Can the transfer goal be stated without mentioning the supporting build?
- Does every section teach the focal module?
- Does each beat have one dominant visual target?

### Clarity

- Can the rule be inferred with captions hidden?
- Does each caption name one causal relationship?
- Does the comparison change only one meaningful factor?

### Depth

- Does the first case establish the rule before edge cases?
- Is the chosen boundary likely to prevent an actual player mistake?
- Does the entry teach a reusable model instead of a recipe to memorize?

### Rhythm

- Are waits tied to meaningful state rather than guessed timestamps?
- Do successive module additions start at an even cadence and settle without changing existing gaps?
- Is there any travel, title-only time, duplicated explanation, or abrupt ending to remove?
- Do transitions preserve continuity and leave enough time to see their result?

Revise the storyboard if any gate fails. Do not compensate for weak visual proof with more text.

## Validate the result

When implementing, follow [implementation.md](references/implementation.md). At minimum:

1. Run the focused Thought Index tests.
2. Run `pnpm thoughts:report` and review its advisory continuity findings.
3. Run type checking and locale validation.
4. Visually replay at normal speed, every progress marker, and at least one expanded-transcript layout.
5. Check English and a longer locale for clipping, reflow, target drift, and loadout movement.
6. Confirm replay and scrubbing restore deterministic scene state.

Tests should verify structure, semantic behavior, and invariants. Do not assert exact localized sentences or independently tunable choreography values.

Treat choreography validation findings as warning-level review aids rather than universal gates; a focused storyboard may intentionally diverge when the choice is documented and visually reviewed.
