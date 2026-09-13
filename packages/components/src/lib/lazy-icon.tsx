/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * The FORGIVING lucide surface.
 *
 * This repo resolves icon names against two vocabularies, and the split is
 * deliberate (`scripts/check-lucide-icon-record-names.mjs` censuses both):
 *
 *   RECORD   `renderers/action/resolve-icon.ts` — the strict seam. A RETIRED
 *            spelling resolves to nothing, and the caller decides what to draw.
 *   DYNAMIC  this module — accepts everything lucide still publishes a name
 *            for, including retired spellings such as `alert-triangle`, and
 *            degrades an unknown name to the `Database` glyph, because
 *            server-driven schemas reference icons from other libraries.
 *
 * `record-alert`'s severity glyphs depend on that forgiveness at the byte:
 * `AlertTriangle` and `AlertCircle` are ABSENT from the record and present
 * here, pinned by `plugin-detail`'s `record-alert.severityIcons.test.ts`.
 *
 * ## Where the vocabulary comes from, and why it is no longer lucide's map
 *
 * It used to be `iconNames` from `lucide-react/dynamic.mjs`. That list is
 * `Object.keys(dynamicIconImports)` — derived at module init from a
 * 120,683-byte import map — so a module that wanted only the NAMES paid for the
 * whole map, eagerly, and four modules did. The map was 8,253 gzipped bytes of
 * the `ui-components` chunk measured in the chunk (objectui#9250), for a
 * catalogue this bundle already carries twice over: `resolve-icon.ts` indexes
 * lucide's `icons` record, and a namespace object has no dead members, so every
 * icon module is eager regardless. `DynamicIcon` was therefore `import()`-ing
 * modules that were already in the same chunk — laziness that bought nothing
 * and cost the map (objectui#9204).
 *
 * So the vocabulary is REBUILT from the record's keys, which are bytes already
 * paid for, plus the 264 names no record key can produce — generated into
 * `lucide-dynamic-name-aliases.ts` and re-derived from the installed lucide by
 * `lucide-dynamic-name-aliases.test.ts`, in both directions, so a lucide bump
 * cannot narrow what this module draws in silence.
 *
 * ⇒ resolution is now SYNCHRONOUS. `getLazyIcon` returns lucide's own component
 * rather than a `DynamicIcon` wrapper, there is no per-icon chunk to fetch on
 * first paint, and the exported API is unchanged.
 */

import React from 'react';
import { Database } from 'lucide-react';
import { resolveIcon, listIconRecordKeys } from '../renderers/action/resolve-icon';
import {
  LUCIDE_DYNAMIC_NAME_ALIASES,
  LUCIDE_DERIVED_NAME_EXCLUSIONS,
} from './lucide-dynamic-name-aliases';

/** Convert PascalCase / camelCase / mixed names to kebab-case for lookup. */
export function toKebabIconName(name: string): string {
  if (name.includes('-')) return name.toLowerCase();
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * A record KEY in lucide's own kebab spelling (`ArrowDownUp` -> `arrow-down-up`,
 * `Building2` -> `building-2`).
 *
 * ⚠️ Kept byte-identical to the copy in
 * `scripts/gen-lucide-dynamic-name-aliases.mjs`: that script computes which
 * names this cannot produce, so the two disagreeing would leave holes in the
 * vocabulary. The drift test compares the FINAL vocabulary against lucide, which
 * is what actually proves they still agree.
 */
function toDynamicIconName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([A-Za-z])([0-9])/g, '$1-$2')
    .toLowerCase();
}

/**
 * lucide's dynamic name -> the live record key that draws it.
 *
 * Built on first use rather than at module init: a page that renders no icon by
 * name should not pay for 2,039 map entries, and the eager-closure budget is the
 * reason this module exists in its current shape.
 */
let vocabulary: Map<string, string> | null = null;
function dynamicVocabulary(): Map<string, string> {
  if (vocabulary) return vocabulary;
  const excluded = new Set(LUCIDE_DERIVED_NAME_EXCLUSIONS);
  const built = new Map<string, string>();
  for (const key of listIconRecordKeys()) {
    const name = toDynamicIconName(key);
    if (!excluded.has(name)) built.set(name, key);
  }
  for (const [alias, key] of Object.entries(LUCIDE_DYNAMIC_NAME_ALIASES)) built.set(alias, key);
  vocabulary = built;
  return built;
}

/**
 * Every name this surface draws, in lucide's kebab spelling, sorted.
 *
 * Replaces `iconNames` from `lucide-react/dynamic.mjs` for the one caller that
 * needs the list itself — `app-shell`'s metadata-admin icon picker — which used
 * to drag the whole import map for a string array.
 */
export function lucideIconNames(): string[] {
  return [...dynamicVocabulary().keys()].sort();
}

/** Whether `name` (kebab-case or PascalCase) names a real Lucide icon. */
export function isLucideIconName(name?: string): boolean {
  return !!name && dynamicVocabulary().has(toKebabIconName(name));
}

const cache = new Map<string, React.ElementType>();

/**
 * Resolve a Lucide icon by name (kebab-case or PascalCase).
 *
 * Falls back to the `Database` icon when no `name` is provided or when the
 * requested name is not a valid Lucide icon (server-driven schemas often
 * reference icons from other libraries — we silently degrade rather than
 * letting an unresolvable name throw).
 *
 * Memoised per `name`, so call sites get a stable component reference across
 * renders (`react-hooks/static-components` cannot see through the call, which is
 * why the JSX sites that render the result carry a targeted disable pointing
 * back here).
 *
 * ⛔ Callers that have a BETTER fallback than a stray database glyph — a
 * notification would rather show its severity icon — must ask
 * `isLucideIconName` first. Ask, then choose.
 */
export function getLazyIcon(name?: string): React.ElementType {
  if (!name) return Database;
  const cached = cache.get(name);
  if (cached) return cached;
  const key = dynamicVocabulary().get(toKebabIconName(name));
  const resolved = (key ? resolveIcon(key) : null) ?? Database;
  cache.set(name, resolved);
  return resolved;
}

/** Direct ready-to-render component. */
export const LazyIcon: React.FC<{ name?: string } & Record<string, any>> = ({ name, ...rest }) =>
  React.createElement(getLazyIcon(name) as any, rest);
