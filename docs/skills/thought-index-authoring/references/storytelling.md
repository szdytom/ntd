# Storytelling Patterns from the Five Reference Entries

Use this reference while choosing the narrative shape of a new Thought Index entry. The five existing entries solve different teaching problems; their value is in the pattern, not their exact loadouts or timing.

## The standard for a good explanation

A good entry gives the player a compact predictive model. After watching it, the player should be able to inspect a different module sequence and answer:

- what the focal module observes or changes;
- when that change happens;
- which downstream object receives it;
- whether it repeats, spreads, chains, or is blocked;
- which loadout change would alter the outcome.

The entry succeeds when the player can generalize. It does not need to enumerate every compatible module.

## Five reusable narrative patterns

### Pulse: establish foundational vocabulary

Pulse introduces a carrier behavior that later explanations can rely on. It first shows ordinary travel and contact, then makes the carrier relationship legible.

Use this pattern when the focal module defines a basic object or action used by many other modules.

Design implications:

- begin with the most ordinary positive case;
- let motion and impact establish meaning before adding terminology;
- teach only the minimum vocabulary needed by later entries;
- avoid exceptions until the base action is unmistakable.

### Frost: prove one rule across carrier classes

Frost keeps the modifier constant while changing what carries or distributes it: a direct projectile, an area effect, and a static payload. Each case answers the same question at a broader scope.

Use this pattern when players may wrongly assume a module works only with the first carrier they see.

Design implications:

- establish the causal rule in the simplest carrier first;
- change one carrier class at a time;
- reuse consistent visual language for the modifier;
- stop once the examples reveal the general rule. Do not build a compatibility catalog.

### Impact Trigger: positive case, repeat boundary, blocking counterexample

Impact Trigger first uses a simple payload to prove that a hit triggers downstream content. It then pairs with a penetrating projectile to show that the same projectile does not repeatedly trigger. Finally, a shielded target shows that an absorbed projectile produces no trigger.

Use this pattern for mechanics whose activation condition is more important than their output.

Design implications:

- choose a visually simple downstream effect;
- keep captions about the trigger, not the payload;
- show a likely repeat misconception with a controlled example;
- show the most important failed activation only after the positive model is stable.

### Focus Core: controlled before-and-after transformation

Focus Core compares an extra-count baseline with the focused result. A chained carrier is included only to prove that chain count participates in the same conversion; the entry does not pause to teach chaining itself.

Use this pattern when a module converts, aggregates, or redirects a quantity.

Design implications:

- make the input quantity visible before transformation;
- hold the scene and supporting behavior constant while changing the focal rule;
- show outcomes side by side or in immediate succession;
- use a more complex carrier only as evidence for generality, without explaining that carrier.

### Cinderwake: spatial evidence and continuous comparison

Cinderwake first shows the trail with a neutral carrier. It then uses a two-lane authored scene to compare carrier families in one continuous experiment. Conclusions follow the observed passage through the burning region rather than interrupting every movement.

Use this pattern when the mechanic creates persistent spatial evidence or when multiple carriers should be compared under the same geometry.

Design implications:

- draw the entire relevant map before the first build so the viewer understands the experiment;
- introduce only the first tower initially even when later comparisons use two;
- keep comparative runs continuous, then state the conclusion;
- let affected signals resolve so the demonstration has a causal ending;
- use authored convergence and cleanup rather than expanding the combat engine solely for presentation.

## Choose sections by mental-model changes

Create a new section when at least one of these is true:

- the subject of the rule changes, such as projectile to area;
- the activation condition changes;
- a common prediction is about to be contradicted;
- the viewer needs a reset before comparing a new configuration.

Keep actions in one section when they form one experiment and their meaning depends on continuity. Avoid sections that contain only setup, a title change, or a single transition with no new claim.

## Make the focal module the subject

Use this quick test on every sentence: if the supporting module name were swapped for another compatible module, would the focal lesson still be true? If yes, write the sentence around the focal rule. If no, decide whether the interaction is a necessary boundary or distracting trivia.

Supporting choices should be:

- mechanically legible;
- visually distinct;
- minimally surprising;
- no more powerful or elaborate than the proof requires.

The demonstration build may be intentionally non-optimal. Simplicity is a teaching advantage.

## Write concise copy with depth

Depth comes from the sequence of evidence, not paragraph length.

Strong captions generally follow one of these shapes:

- **Rule:** “The modifier applies to the next projectile.”
- **Consequence:** “The affected signal slows.”
- **Scope:** “Signals in the blast are all affected.”
- **Boundary:** “Piercing does not trigger it again.”
- **Counterexample:** “A shield absorbs the projectile before it can trigger.”
- **Comparison:** “Penetrating carriers ignite the second lane more reliably.”

Adapt the wording to the game's locale style. Do not combine rule, exception, advice, and optimization in one caption.

Do not display:

- implementation directions;
- timestamps or wait conditions;
- obvious narration such as a signal walking toward a tower;
- raw internal state names;
- claims about a supporting module that the entry is not teaching;
- an exhaustive list where representative cases reveal the rule.

## Pace attention

Think in alternating attention states:

1. **Orient:** scene geometry or loadout becomes readable.
2. **Anticipate:** the target approaches the relevant interaction.
3. **Observe:** the causal event happens without competing text.
4. **Interpret:** a nearby caption names the rule.
5. **Resolve:** the target dies, exits, or reaches a stable state.
6. **Reset:** the scene changes smoothly for the next claim.

Do not force every beat through all six states. Use them to diagnose pacing: an entry feels abrupt when it skips resolution, slow when anticipation contains irrelevant travel, and confusing when interpretation arrives before observation.

Current entries commonly use short transitions, a modest post-event pause, and longer reading windows for captions. Treat those values as local baselines, not a specification. Localized copy, visual density, and comparison complexity determine the actual duration.

## Review the storyboard without code

Before implementation, read only the visible copy and ask:

- Does it form a coherent six-to-ten-line explanation?
- Does each line add a new causal fact?
- Are section titles promises rather than conclusions repeated by captions?
- Can any line be removed because the animation already says it?

Then read only the directions and ask:

- Is every claim visibly proved?
- Does each comparison change one relevant factor?
- Are activation, resolution, and cleanup observable?
- Is the focal module visually stable across transitions?

Fix the plan at this stage. Animation code is an expensive place to discover that the story lacks a clear question.
