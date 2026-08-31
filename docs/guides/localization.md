# Localization

> Document type: **Guide** — follow this page to add or change user-facing text while preserving the locale contract.

All interface copy, tutorial text, engine toasts, module presentation, level presentation, signal names, and Canvas labels must resolve through the shared i18next instance.

## Change or add a string

1. Choose a flat dotted key grouped by feature, such as `workshop.clear` or `levels.my-level.name`.
2. Add the same key to every JSON file in `src/i18n/locales/`.
3. Keep each resource value a string; nested objects are not allowed.
4. In React, obtain `t` through `useTranslation()`.
5. Outside React, use the shared instance from `src/i18n/index.ts` or a helper from `src/i18n/presentation.ts`.
6. Run `npm run check:locales`.

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

1. Copy the full key set from `en.json` into a new flat JSON file.
2. Set `lang.name` to that language's native self-name.
3. Add the resource import and language tag to `resources` in `src/i18n/index.ts`.
4. Extend `scripts/check-locales.mjs` so the new file participates in alignment and placeholder validation.
5. Verify initial browser-language matching, manual switching, persistence, and `document.documentElement.lang`.

The language switcher enumerates registered resources, so it does not need a separate option list.

## Repository language boundary

English is used in source, tests, and configuration identifiers. CJK text is permitted only in documentation, README variants, and locale resources by `npm run check:cjk`. Keep translated copy out of components even when it is temporary.

Common mistakes are nesting JSON by dotted segments, adding a key to only one locale, changing placeholder names during translation, embedding concrete module values in prose, or creating a second i18next instance.
