# Creating Stylesheets

> Document type: **Guide** — use this page to add component styles or move an existing stylesheet behind a local CSS boundary.

Prism Bastion uses CSS Modules for component-owned styles and ordinary CSS for application-wide foundations. A module keeps short structural names such as `root`, `incoming`, or `activeControl` local to one file, so unrelated components cannot accidentally share their layout or animation rules.

The visual choices still follow the [UI style guide](ui-style.md). This guide only describes stylesheet ownership and implementation.

## Choose local or global ownership

Create `ComponentName.module.css` beside a React component when the rules describe that component's own DOM. Import the generated class map and apply every local class through it:

```tsx
import styles from './StatusPanel.module.css';

export function StatusPanel({ active }: { active: boolean }) {
  return <section className={styles.root} data-active={active || undefined}>...</section>;
}
```

```css
.root {
  display: grid;
}

.root[data-active='true'] {
  background: var(--purple);
}
```

Use camel-case names inside new modules so JSX can use `styles.statusPanel` without bracket notation. Component prefixes are unnecessary because esbuild localizes the names.

Keep a stylesheet global only when it intentionally defines an application-wide contract. The global set includes:

- resets, document sizing, focus defaults, and reduced-motion rules;
- shared design tokens on `:root`;
- globally addressed icon geometry that is emitted outside one React component;
- temporary legacy styles that have not yet been separated at component boundaries.

Import global CSS for side effects. Never import a CSS Module without using its class map.

## Represent state without global class names

Prefer semantic attributes for state that already exists in component data:

```tsx
<div className={styles.module} data-motion={replacement ? 'incoming' : undefined} />
```

```css
.module[data-motion='incoming'] {
  animation: module-in 460ms ease both;
}
```

Use native attributes such as `disabled`, `aria-pressed`, `aria-selected`, and `aria-current` when they describe the state accurately. Use `data-*` for presentation states such as animation phase, drag state, or layout variant. Anchor every attribute selector below a local class; an unqualified `[data-state]` selector is still global.

Conditional classes remain appropriate when the class represents a reusable visual part instead of state. Join imported values rather than mixing them with literal local class names:

```tsx
const className = [styles.card, compact && styles.compact, externalClassName]
  .filter(Boolean)
  .join(' ');
```

## Preserve component boundaries

A component stylesheet may style its own descendants, including native elements. It must not reach into another React component by naming that component's internal class:

```css
/* Avoid: SignalPreview owns this name. */
.header .signalPreviewTag { min-height: 26px; }
```

Use one of these boundaries instead:

1. Pass a `className` to the child's root when the parent owns placement or size.
2. Add a small semantic variant prop when the child owns the visual behavior.
3. Put a wrapper around the child and style the wrapper or its direct child with `> *`.
4. Move a rule into the child when it applies in every placement.

CSS custom properties are the preferred cross-component theming interface. A parent may set `--subject-accent` or another documented property without knowing the child's generated class names.

Avoid `:global(...)` for new component relationships. It is acceptable as a documented, temporary bridge during a staged migration, but it preserves the collision risk that CSS Modules are intended to remove.

## Keep behavior and tests independent from styling

Generated class names are build details. Development and production builds may use different names, so do not copy them into selectors, tests, HTML, or game logic.

For runtime DOM access:

- keep a ref when the component already owns the element;
- use a stable `data-*` hook when another local utility must find it;
- use IDs only for genuinely unique application-level integration points.

For tests, prefer accessible roles, names, labels, and state attributes. Use a dedicated `data-testid` only when there is no useful semantic query. Do not use a CSS class merely because it is convenient to select.

Imperative visual state such as drag-over should become an attribute or receive the imported class token from its owning component. Code such as `classList.add('drag-over')` will stop matching when `drag-over` becomes local.

## Migrate an existing component

Migrate one independent component or one tightly coupled component island at a time:

1. Search the entire repository for every class declared by the stylesheet.
2. Classify each use as local styling, parent layout, runtime behavior, or test selection.
3. Replace cross-component selectors with props, wrappers, variants, or custom properties.
4. Replace behavior and test selectors with refs, semantics, or stable data hooks.
5. Rename the file to `ComponentName.module.css` and bind it as `styles`.
6. Replace JSX class literals with values from the imported map.
7. Convert boolean and enumerated state classes to semantic attributes where practical.
8. Run the component tests, the production build, and browser smoke tests.
9. Inspect the affected screen at desktop and mobile breakpoints, including reduced motion when animation changed.

Do not migrate only one side of a deliberate cross-component styling relationship. For example, Workshop currently customizes ModuleCard, ModuleSlot, ProgramReadout, TriggerNode, and Tag. Either expose explicit styling inputs first or migrate that group as one component island.

## Common mistakes

- A top-level element selector such as `button` remains global. Scope it below a local class.
- CSS custom property names are not localized. Treat shared properties as an explicit API and keep private names component-specific.
- Runtime code and tests must not assume the readable development class name; production minification may shorten it.
- Moving import statements can change cascade order even when all classes are local. Preserve the existing import graph during a mechanical migration.
- `composes` is not a safe replacement for overlapping overrides. Composed rules from separate files have deliberately undefined ordering.
- esbuild performs limited CSS validation. A successful build does not prove that every property value or selector is correct.

## Validation checklist

- The component imports exactly one same-named stylesheet.
- Every component-owned class comes from the imported `styles` map.
- No other component or test references a generated class name.
- State uses semantic attributes or imported class tokens.
- Global selectors and `:global(...)` uses are intentional and documented.
- `npm run check` passes.
- `npm run test:e2e` passes when the migrated styles affect browser layout or animation.
