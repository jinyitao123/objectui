---
'@object-ui/components': minor
'@object-ui/app-shell': minor
---

Take lucide's dynamic-import map off the eager path (objectui#9204).

`lucide-react/dynamic.mjs` publishes `iconNames` as `Object.keys(dynamicIconImports)`
— a list derived at module init from a 120,683-byte import map. Four modules imported
that specifier, three of them for the names alone, so every page load paid for the map.
Beside it, `renderers/action/resolve-icon.ts` indexes lucide's `icons` record, and a
namespace object has no dead members: every icon module was already eager in the same
chunk. `DynamicIcon` was therefore `import()`-ing modules that were already loaded —
laziness that bought nothing and cost the map.

The forgiving icon vocabulary is now REBUILT from the record's own keys, plus a
generated table of the 264 names no key can produce (retired spellings such as
`alert-triangle`, and lucide's alternate digit spellings such as `arrow-down-0-1`),
each mapped to its live record key by object identity. `LazyIcon` / `getLazyIcon` /
`isLucideIconName` accept **exactly** the same 2,039 names as before — asserted in both
directions against the installed lucide by a drift test, so a lucide bump cannot narrow
what the renderer draws in silence.

Measured on one pair of console builds at `69aa9c017`, read from
`apps/console/dist/eager-closure.json`:

    chunk `ui-components`   397,090 -> 353,658 gzipped   -43,432
    eager closure         3,180,382 -> 3,136,585         -43,797
    eager / total chunks       52/528 -> 51/527

**Behaviour.** Icon resolution is now synchronous: `getLazyIcon(name)` returns lucide's
own component rather than a `DynamicIcon` wrapper, so an icon paints on first render
instead of after a chunk fetch, and there are no per-icon micro-chunks to request. The
exported API is unchanged, and unknown names still degrade to the `Database` glyph.

**New export.** `lucideIconNames()` on `@object-ui/components` returns the vocabulary as
a sorted string array — the list `app-shell`'s metadata-admin icon picker used to take
from `lucide-react/dynamic.mjs`.

**Consolidation.** `@object-ui/app-shell`'s `utils/getIcon` and the console's were
transcriptions of the same resolver, each with its own tokeniser, its own `Set` over
lucide's map and its own memo. Both are now re-exports of `getLazyIcon`: one resolver,
one vocabulary, one memo.
