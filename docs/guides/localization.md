# Localization

> Document type: **Guide** — follow this page to add or change user-facing text while preserving the locale contract.

All interface copy, tutorial text, engine toasts, module presentation, level presentation, signal names, and Canvas labels must resolve through the shared i18next instance.

## Change or add a string

1. Choose a flat dotted key grouped by feature, such as `workshop.clear` or `levels.my-level.name`.
2. Add the English string to `src/i18n/locales/en.json`.
3. Run `npm run format:locales` to add the key to every other locale with a `null` value.
4. Replace `null` with translated strings where translations are available. A remaining `null` falls back to English at runtime; nested objects are not allowed.
5. In React, obtain `t` through `useTranslation()`.
6. Outside React, use the shared instance from `src/i18n/index.ts` or a helper from `src/i18n/presentation.ts`.
7. Run `npm run check:locales`.

`npm run format:locales` scans every JSON file in the locale directory. It refuses to continue if another locale contains a key missing from `en.json`; otherwise it completes every locale with `null`, applies the key order from `en.json`, keeps the resources flat with one key per line, and uses tabs for indentation.

Do not use fallback literals such as `t('key', 'English text')` to hide a missing resource. Missing keys should fail review and tests visibly.

## Module text

Each module has four keys:

```text
modules.<id>.name
modules.<id>.short
modules.<id>.description
modules.<id>.detail
```

Descriptions and details may interpolate values from `ModuleDefinition.meta.text`. Their locale templates must not contain literal digits after placeholders are removed, and every locale must use exactly the same placeholder names.

```json
"modules.ion.detail": "+{{speed}}% projectile speed"
```

Derive `speed` from the module's `stats` constant so mechanics and display values cannot drift apart.

## Add a locale

1. Create a flat JSON file containing a translated `lang.name`.
2. Run `npm run format:locales` to add the remaining keys as `null` in English order.
3. Add the resource import and language tag to `resources` in `src/i18n/index.ts`.
4. Verify initial browser-language matching, manual switching, persistence, and `document.documentElement.lang`.

The language switcher enumerates registered resources, so it does not need a separate option list.

## Repository language boundary

English is used in source, tests, and configuration identifiers. CJK text is permitted only in documentation, README variants, and locale resources by `npm run check:cjk`. Keep translated copy out of components even when it is temporary.

Common mistakes are nesting JSON by dotted segments, adding a key outside `en.json`, changing placeholder names during translation, embedding concrete module values in prose, or creating a second i18next instance.
