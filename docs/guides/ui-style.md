# UI Style

Prism Bastion should feel like a playable abstract control surface: white paper, near-black construction lines, vivid color fields, and compact geometric signals. Its closest compositional reference is Mondrian rather than a dashboard template. Rectangles are not containers added around content after the fact; their shared edges describe how the player understands and operates the system.

Build each screen as one composition of unequal rectangles. Saturated colors identify focus and state; pale tints group related work. Avoid glass panels, blurred backdrops, soft card stacks, atmospheric gradients, and pill-shaped controls.

## Project palette and line system

The foundation tokens in [`foundation.css`](../../packages/web-shared/src/styles/foundation.css) establish the stable palette:

| Role             | Token      | Value     | Typical use                                                   |
| ---------------- | ---------- | --------- | ------------------------------------------------------------- |
| Construction ink | `--ink`    | `#252134` | Shared borders, primary text, active neutral controls         |
| Violet           | `--purple` | `#6558e8` | Primary action, program flow, selected global state           |
| Coral            | `--coral`  | `#ff637a` | interruption, close/exit emphasis, high-energy control fields |
| Mint             | `--mint`   | `#13b88e` | module library, available resources, constructive state       |
| Yellow           | `--yellow` | `#ffd447` | navigation blocks, headers, identifiers, utility emphasis     |
| Ground           | —          | `#efedf3` | page outside the composed surface                             |
| Paper            | —          | `#ffffff` | readable content cells and control faces                      |

Treat these as a small construction kit, not a requirement to place every color on every screen. A screen normally needs ink, paper, one structural color, and one contextual accent. The Arc Workshop uses yellow for its header, violet for the program area, and mint for the library; the Signal Compendium replaces most fixed accenting with the selected signal's `--signal-accent`.

Use the contextual accent in two strengths:

- a saturated strip, icon, progress fill, or selected edge for direct identification;
- a pale `color-mix(..., #fff)` field for the region that belongs to that identity.

Do not put long text directly on a saturated field unless the contrast is explicit. Do not assign colors merely to make adjacent rectangles different; adjacent roles should first be separated by the ink grid.

The default structural boundary is a `2px solid` ink line. Use `1px` only for subordinate subdivisions inside an already bounded unit, such as cells in the Compendium stat matrix. A boundary should be drawn by one owner. Two neighboring children should not each add a full border and accidentally create a four-pixel seam.

Keep divider weight consistent within the same grid or visual hierarchy. All peer boundaries must use the same thickness; do not mix `1px` and `2px` lines between equivalent regions. If a subordinate grid uses `1px` lines, the transition to it must be structurally clear, while the surrounding primary divisions remain `2px`.

## Viewport and stable frame sizes

Every page is a viewport-bound application surface. `html`, `body`, and `#app` must never scroll, including mobile and short landscape viewports. Keep page shells within `100dvh`; use `min-height: 0` and `minmax(0, 1fr)` throughout flexible layout chains. Remove content-driven page minimum heights and mobile overrides that restore document scrolling.

Headers, navigation, and primary actions remain in their allocated regions. Long lists, configuration panels, records, and other content own bounded internal scrolling with contained overscroll. Do not solve overflow by clipping controls or making the entire page frame an internal scroll container. The home page has no scrolling modules at all: fit mode controls, difficulty or Creative values, and level selection inside their allocated cells. Use the level carousel for paging, compact secondary copy, and reduce decorative regions on small screens.

A frame's dimensions are determined by viewport and layout role, not by the selected mode, tab, content length, loading state, or error message. Reserve the same region for alternative content: Standard difficulty and Creative calibration share the same home-page allocation. Keep modal outer dimensions stable across categories. Responsive resizing is appropriate when the viewport changes; ordinary selection changes must not move neighboring frames. Reduce decorative regions before reducing usable control space on short screens.

## Page keyboard navigation

The home page and archive pages own one default horizontal selection. Left/right arrows select levels on the home page, records in the Thought Index, and top-level categories in the Defense Archive. This works immediately after entering or returning to a page, including when focus falls back to the document body. Selection stops at either end instead of wrapping. Selection and focus move together; a home carousel only moves when the selected level is outside its visible range.

Mouse clicks, Tab focus, and arrow navigation update the same selected option. Selection controls use their persistent tint and accent strip for both input methods; hovering another option must not hide the current selection. In the Workshop, selection identifies an installed module at a tower slot, follows that module through swaps, and clears when the user selects a library module.

Use `usePageArrowNavigation` for this default. Covered or inert pages must ignore navigation, and modal dialogs and editable controls retain their own keys. Signal Compendium uses up/down to scroll the Signal Index by 72px without changing the selection, even when no list item has focus. Left/right does not select or scroll its vertical index. Other secondary vertical lists use up/down arrows when focused. Thought Index step controls use PageUp/PageDown by default; unmodified left/right arrows are reserved for browsing its records.

## Regions and ownership

Major rectangles represent navigation, persistent context, main work, or supporting detail. Related regions divide one parent with shared edges; nested bordered boxes require an independent interaction or data object. Main work receives flexible space, while rails and controls remain bounded and usable. Narrow layouts change reading order instead of shrinking the desktop composition.

- **Arc Workshop:** the left rail owns tower controls and the selected-module inspector. The right side owns the violet program region and mint library. The program stays bounded; the library owns remaining height and scrolling. Slots form one continuous strip. Mobile order is tower context, program, then library.
- **Signal Compendium:** an index selects a record containing a specimen and data sheet. The selected signal's accent connects the index marker, specimen, seal, and statistics. Crosshairs and orbits belong to the specimen; surrounding data stays quiet. Narrow layouts stack the record and turn the index into a horizontal strip.

## Shape grammar

Use shapes consistently with their scale and job:

- **Rectangles** own layout, actions, meters, tags, and selected edges.
- **Squares and diamonds** carry module/signal symbols, compact status, and signal identity.
- **Polygons** connect UI presentation to battlefield entities.
- **Circles and orbits** indicate range, observation, energy, or motion; they should sit inside a rectangular region rather than replace the page structure.

Internal controls and cards normally use `border-radius: 0`. A modest radius may soften only the outer page shell, as in the Level Select and Signal Compendium. This makes the entire interface read as one object while keeping its internal construction crisp.

Prefer flat state changes: replace a background, add an inset accent bar, reverse foreground/background, or change a border style. Soft drop shadows imply floating layers and are usually wrong here. A small hard offset shadow is acceptable for a deliberately tactile object, such as the Compendium specimen toggle, because it behaves like a physical switch rather than ambient elevation.

## Selection blocks and settings categories

Use the home page's level options as the reference for selection blocks. The style is **flat geometric segmentation** within the larger Mondrian-inspired composition: square cells, shared ink dividers, paper backgrounds, pale accent tints, and a solid accent strip at the bottom. Selection changes the surface's color and edge, without suggesting height above the page.

Preserve these decisions when adding or revising selection blocks:

- Divide the available parent width evenly among peer options. Use a continuous, gap-free row with one owner for each divider; do not cluster small floating buttons in a corner.
- Keep cell corners square and faces flat. Do not add blurred shadows, hard offset shadows, bevels, or hover elevation to selection blocks or settings categories. The tactile-switch exception elsewhere in this guide does not apply to these controls.
- Show the selected option with a pale contextual background and a saturated bottom strip. An `inset 0 -5px 0` or `inset 0 -8px 0` CSS shadow is a way to draw that flat strip, not a depth effect.
- Use a restrained tint for hover. Keep selection geometry stable so interaction does not move the surrounding layout.
- Use simple geometric line icons for settings categories: sliders for general options, a keyboard for bindings, and an archive box for storage. Center them in equal cells, using consistent size and stroke weight. Provide localized accessible names and hover titles without adding visible category captions.
- Left/right navigation in settings selects and focuses the category together. The tint and bottom strip are its visible indicator; do not add an extra rectangular focus outline around the selected category. Keep `aria-selected`, roving tab focus, and keyboard operation intact. This exception is limited to these category tabs, not a reason to remove focus indicators from ordinary buttons or inputs.
- Keep the settings title, close control, and category row outside the scrolling content region. Draw complete section boundaries, including the bottom of the automatic-pause region.

Settings interaction and copy follow the same restrained approach:

- Left/right arrows switch settings categories; up/down arrows scroll their content. During key recording, arrows can instead be captured as bindings.
- Put reserved-key and navigation instructions at the beginning of the key-binding panel, before the binding list. Esc cancels recording or closes settings, Tab moves focus, and Enter activates a control; these keys cannot be rebound.
- Do not use function keys for defaults. Draft details default to `V`; users may explicitly assign a function key themselves.
- Save preference changes implicitly. Do not show routine “saved” or “default bindings restored” messages or repeat an automatic-save explanation. Keep actionable conflict and unsupported-key feedback.
- Keep storage copy compact: omit the redundant description of deleting every browser record, while preserving the explicit destructive-action confirmation.

## Type and density within the grid

The existing system sans face carries headings and prose. Use tight, heavy display headings for screen identity, regular compact text for explanation, and `--font-mono` only for IDs, measurements, counts, short codes, and symbolic readouts.

Do not use Unicode emoji in the interface, including symbols that can render as emoji through system font fallback or variation selectors. When an icon is needed, use SVG instead of a Unicode character glyph. Define interface icons in `UiIcon` so shape, weight, and alignment remain consistent across platforms. Its name type is inferred from the definition table; adding an icon must not require a second list of names or renderer conditionals. Existing wrappers may own layout, but must delegate their SVG content to `UiIcon`. Module and signal artwork remains in its domain presentation registry; feature-specific marks such as the Defense Archive and Co-op entry marks stay with their owning components. Maps and scene drawings are not interface icons. This applies to controls, status indicators, and decorative icons; ordinary text, punctuation, and mathematical notation remain text. Decorative SVGs must be hidden from assistive technology, and icon-only controls must have a localized accessible label.

Achievement artwork may use richer, multicolor geometric compositions from the foundation palette. Author these marks on a 48-unit grid with 2-unit ink outlines, flat fills, and enough negative space to remain legible at 48px. Keep the artwork in the achievement definition table composed into `UiIcon`; the archive and unlock toast share the same drawing. Use consistent silhouettes and five rank indicators for difficulty families. Locked achievements retain their geometry in grayscale. Avoid shrinking detailed achievement artwork into the ordinary 24px control-icon footprint.

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
- keyboard focus: the shared high-contrast white/violet outline from `foundation.css`, with the selected-category exception described above.

Do not add a badge, tooltip, border, and background change for the same state. One strong signal plus one accessible semantic attribute (`aria-current`, `aria-pressed`, `aria-selected`, or `disabled`) is normally enough.

## Stylesheet boundary

Use Grid for page composition and equal cells, and Flexbox for one-axis flow within a cell. Flexible boundaries require `min-width: 0` and `min-height: 0`. Reduced motion must preserve readable states. Component structure belongs in its same-named stylesheet. CSS custom properties carry contextual identity across component boundaries; shared primitives expose semantic variants. See [Creating stylesheets](creating-stylesheets.md) for ownership and migration steps, and [Rendering performance](rendering-performance.md) for Canvas and effects.
