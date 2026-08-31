# UI Style

> Document type: **Guide** — use this page to extend Prism Bastion's bright geometric interface without flattening it into a generic card-based application.

Prism Bastion should feel like a playable abstract control surface: white paper, near-black construction lines, vivid color fields, and compact geometric signals. Its closest compositional reference is Mondrian rather than a dashboard template. Rectangles are not containers added around content after the fact; their shared edges describe how the player understands and operates the system.

This guide documents the project's existing visual grammar. General advice about choosing an art direction, typography, motion, or copy belongs outside this project guide.

## The visual thesis

Build each screen as one large composition of unequal rectangles. Use saturated color to establish focus and identity, pale tints to group related work, and dark lines to make the structure legible. Add circles, diamonds, polygons, or orbital marks as signals inside that rectangular frame.

The intended tension is:

- **bright, not soft:** color fields are clean and high-chroma;
- **geometric, not sterile:** asymmetry and unequal divisions create rhythm;
- **flat, not weightless:** shared borders give every region physical presence;
- **technical, not terminal-like:** monospace is reserved for values, IDs, and symbols;
- **playful, not decorative:** color and shape communicate category, state, or subject.

Avoid glass panels, blurred backdrops, soft gray card stacks, gradients used as atmosphere, pill-shaped controls, and interchangeable SaaS dashboard layouts. They erase the planar construction that makes the interface recognizable.

## Project palette and line system

The foundation tokens in [`foundation.css`](../../src/styles/foundation.css) establish the stable palette:

| Role | Token | Value | Typical use |
| --- | --- | --- | --- |
| Construction ink | `--ink` | `#252134` | Shared borders, primary text, active neutral controls |
| Violet | `--purple` | `#6558e8` | Primary action, program flow, selected global state |
| Coral | `--coral` | `#ff637a` | interruption, close/exit emphasis, high-energy control fields |
| Mint | `--mint` | `#13b88e` | module library, available resources, constructive state |
| Yellow | `--yellow` | `#ffd447` | navigation blocks, headers, identifiers, utility emphasis |
| Ground | — | `#efedf3` | page outside the composed surface |
| Paper | — | `#ffffff` | readable content cells and control faces |

Treat these as a small construction kit, not a requirement to place every color on every screen. A screen normally needs ink, paper, one structural color, and one contextual accent. The Arc Workshop uses yellow for its header, violet for the program area, and mint for the library; the Signal Compendium replaces most fixed accenting with the selected signal's `--signal-accent`.

Use the contextual accent in two strengths:

- a saturated strip, icon, progress fill, or selected edge for direct identification;
- a pale `color-mix(..., #fff)` field for the region that belongs to that identity.

Do not put long text directly on a saturated field unless the contrast is explicit. Do not assign colors merely to make adjacent rectangles different; adjacent roles should first be separated by the ink grid.

The default structural boundary is a `2px solid` ink line. Use `1px` only for subordinate subdivisions inside an already bounded unit, such as cells in the Compendium stat matrix. A boundary should be drawn by one owner. Two neighboring children should not each add a full border and accidentally create a four-pixel seam.

Keep divider weight consistent within the same grid or visual hierarchy. All peer boundaries must use the same thickness; do not mix `1px` and `2px` lines between equivalent regions. If a subordinate grid uses `1px` lines, the transition to it must be structurally clear, while the surrounding primary divisions remain `2px`.

## Divide rectangles by responsibility

Start from the screen's operating model, then convert it into rectangles:

1. Name the primary object being manipulated or inspected.
2. Separate navigation, persistent context, main work, and supporting detail.
3. Give persistent context a fixed or bounded rail; give the main work `minmax(0, 1fr)`.
4. Split the main work again only where the interaction model changes.
5. Let related cells share edges and background fields instead of floating independently.
6. At narrow widths, change the reading order; do not proportionally shrink the desktop diagram.

Good asymmetry comes from information weight. A narrow index beside a large specimen is useful. A random narrow card beside three equal cards is decoration.

Prefer dividing one parent rectangle directly over nesting multiple bordered boxes. Sibling regions should share the parent's grid and meet at single owned divider lines. Add a nested bordered rectangle only when it represents a genuinely independent interaction or data object; spacing, background tint, typography, or a shared divider should handle ordinary grouping. Before adding a wrapper, check whether the parent can express the same hierarchy with `grid-template-*`, named areas, or a pseudo-element divider.

### Arc Workshop

[`Workshop.tsx`](../../src/ui/Workshop.tsx) and [`Workshop.css`](../../src/ui/Workshop.css) organize one tower-programming task into a planar instrument:

```text
┌──────────────────────── yellow identity / close strip ───────────────────────┐
├──────────── 360px tower rail ───────┬──────── flexible program workspace ─────┤
│ tower identity │ energy             │ violet sequence header                  │
├─────────────────────────────────────┼─────────────────────────────────────────┤
│ 2 × 2 tower statistics              │ ordered slot strip                       │
├──────────────────────┬──────────────┼─────────────────────────────────────────┤
│ targeting control    │ upgrade      │ compiled program / trigger trace         │
├──────────────────────┴──────────────┼─────────────────────────────────────────┤
│ selected module inspector           │ mint library header / category filters   │
│                                     ├─────────────────────────────────────────┤
│                                     │ scrollable module matrix                 │
└─────────────────────────────────────┴─────────────────────────────────────────┘
```

The outer split is not a generic sidebar. The left rail answers “what tower and module am I looking at?” while the right side answers “what program am I building?” Within the right side, the program is bounded and stable; the library receives the remaining height and owns scrolling.

Preserve these practices when extending the Workshop:

- add tower-level controls to the left rail, not as cards floating over the module library;
- add sequence-level feedback to the violet program region;
- add discovery and filtering controls to the mint library region;
- keep the slot row as one continuous strip whose cells share two-pixel seams;
- use module colors inside symbols, leading strips, selection tints, and kind filters rather than recoloring the whole workshop;
- keep the main split explicit with one vertical ink boundary.

At `620px` and below, the Workshop becomes a vertical document: tower context, program, then library. Slots become three columns and filters become a three-column control grid. This preserves the task sequence instead of compressing the 360-pixel rail into unusable fragments.

### Signal Compendium

[`SignalArchive.tsx`](../../src/ui/SignalArchive.tsx) and [`SignalArchive.css`](../../src/ui/SignalArchive.css) use a different rectangular hierarchy because the task is inspection rather than construction:

```text
┌─ back ─┬──────────── title ────────────┬─ language ─┬─ signal seal ─┐
├──────────── 270px signal index ────────┼──────── selected record ───┤
│ repeated signal rows                    │ specimen stage │ data sheet │
│ selected row gains an accent edge      │ crosshair/grid │ title      │
│                                        │ orbit + subject│ 2 × 2 stats │
│                                        │                │ 2 analyses │
│                                        │                │ sightings   │
└────────────────────────────────────────┴────────────────┴────────────┘
```

Here the selected signal accent travels across the composition: index marker, specimen grid, orbit, seal, stat fills, and analysis tint. That repetition makes separate rectangles feel like one record without surrounding them in another decorative card.

The specimen stage is the screen's one expressive exception. Crosshairs, a square grid, circular orbits, and the animated signal create a geometric “observation instrument” inside an otherwise rigid frame. Keep surrounding data panels quieter so this signature remains legible.

The desktop record gives the specimen and data unequal flexible columns. At `760px`, the index becomes a horizontal strip and the record stacks; at `480px`, the stat matrix becomes one column. The identity travels through accent and borders even though the geometry changes.

## Shape grammar

Use shapes consistently with their scale and job:

- **Rectangles** own layout, actions, meters, tags, and selected edges.
- **Squares and diamonds** carry module/signal symbols, compact status, and signal identity.
- **Polygons** connect UI presentation to battlefield entities.
- **Circles and orbits** indicate range, observation, energy, or motion; they should sit inside a rectangular region rather than replace the page structure.

Internal controls and cards normally use `border-radius: 0`. A modest radius may soften only the outer page shell, as in the Level Select and Signal Compendium. This makes the entire interface read as one object while keeping its internal construction crisp.

Prefer flat state changes: replace a background, add an inset accent bar, reverse foreground/background, or change a border style. Soft drop shadows imply floating layers and are usually wrong here. A small hard offset shadow is acceptable for a deliberately tactile object, such as the Compendium specimen toggle, because it behaves like a physical switch rather than ambient elevation.

## Type and density within the grid

The existing system sans face carries headings and prose. Use tight, heavy display headings for screen identity, regular compact text for explanation, and `--font-mono` only for IDs, measurements, counts, short codes, and symbolic readouts.

On desktop and tablet layouts, primary text must be at least `14px`; decorative or supporting text must be at least `13px`. At mobile breakpoints, the minimums become `12px` for primary text and `11px` for decorative or supporting text. These are hard lower bounds, not target sizes: controls, values, body copy, and other text needed to operate or understand the interface should normally remain larger. Placeholder ornament, non-text geometry, and text rendered as part of an imported image are not substitutes for readable interface labels.

Keep labels close to the edge or value they explain. A rectangular UI becomes noisy when every cell repeats a heading, subtitle, border, icon, and badge. In a dense region, choose the smallest combination that still communicates role:

- a colored leading strip plus heading for a section;
- symbol plus name plus one compact value for a module card;
- label/value/bar for a stat cell;
- name plus selected edge for an index row.

Text truncation is acceptable for compact indexes and cards when the full content is available in the selected detail region. Use `min-width: 0`, `text-overflow: ellipsis`, and stable row heights rather than allowing one translated label to break the whole grid.

## Encode state without adding containers

Use the existing geometry to show interaction state:

- selection: contextual tint plus a thick inset edge;
- active global mode: filled ink or semantic color with reversed text;
- hover: a lighter contextual tint, not lift and blur;
- unavailable inventory: dashed border, desaturation, and reduced opacity;
- progress: a small rectangular fill inside a bounded track;
- destructive or interrupting action: coral fill on hover or active state;
- keyboard focus: the shared high-contrast white/violet outline from `foundation.css`.

Do not add a badge, tooltip, border, and background change for the same state. One strong signal plus one accessible semantic attribute (`aria-current`, `aria-pressed`, `aria-selected`, or `disabled`) is normally enough.

## Implementation pattern

Declare page ink, paper, and contextual accent at the component root. Pass object identity through a CSS custom property rather than generating per-entity class names:

```tsx
<article style={{ '--subject-accent': signal.color } as CSSProperties}>
  ...
</article>
```

```css
.record {
  --record-ink: #252134;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  border: 2px solid var(--record-ink);
  background: #fff;
}

.record-index {
  border-right: 2px solid var(--record-ink);
}

.record-detail {
  min-width: 0;
  background: color-mix(in srgb, var(--subject-accent) 12%, #fff);
}
```

Use CSS Grid for the large composition and for repeated equal cells. Use Flexbox inside a cell when content flows on one axis. Add `min-width: 0` and `min-height: 0` at flexible grid boundaries; otherwise long translations or scroll regions can force the composition wider or taller than intended.

Keep each component's structural styles in its same-named stylesheet. Shared primitives such as `Tag` should expose a small semantic palette, while page styles decide placement and surrounding geometry.

## Review checklist

- Does every major rectangle correspond to navigation, context, work, or detail?
- Are related regions direct divisions of one parent instead of nested bordered boxes?
- Can one border own each shared boundary without doubled seams?
- Do peer divider lines use one consistent thickness?
- Is the main work area flexible while rails and controls remain usable?
- Does saturated color identify a role or state rather than fill empty space?
- Is there one dominant expressive device, with quieter supporting panels?
- Are internal cards square and flat, with any outer radius limited to the shell?
- Do selection, disabled, hover, and focus states remain distinct without extra badges?
- Does the mobile layout become a sensible reading sequence rather than a miniature desktop grid?
- Are localized labels allowed to truncate or wrap without moving structural boundaries unpredictably?
- Does primary/supporting text stay at or above `14px`/`13px`, or `12px`/`11px` on mobile?
- Does the result still read clearly in the Canvas/WebGL-free UI layer and with reduced motion?

The [rendering performance guide](rendering-performance.md) covers Canvas and effects. This page applies only to DOM interface composition and its visual language.
