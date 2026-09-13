#!/usr/bin/env node
/**
 * Generates `packages/components/src/lib/lucide-dynamic-name-aliases.ts` — the
 * part of lucide's DYNAMIC icon vocabulary that cannot be derived from the
 * `icons` record this bundle already carries.
 *
 * ## Why this file exists
 *
 * This repo resolves icon names against two lucide vocabularies (see
 * `scripts/check-lucide-icon-record-names.mjs`): the strict RECORD (`icons`,
 * 1781 keys) and the forgiving DYNAMIC list (`iconNames` from
 * `lucide-react/dynamic.mjs`, 2039 names, which still carries retired
 * spellings such as `alert-triangle`). Both were EAGER in the `ui-components`
 * chunk, and they are two encodings of the same catalogue: `iconNames` is
 * `Object.keys(dynamicIconImports)`, so reading one name costs the whole
 * 120,683-byte import map.
 *
 * The record is eager anyway (`renderers/action/resolve-icon.ts` indexes it, and
 * a namespace object has no dead members), so its keys are bytes already paid
 * for. Most dynamic names are that key in lucide's own kebab spelling, so they
 * can be DERIVED at runtime for nothing. What cannot be derived is written here:
 *
 *   ALIASES     dynamic names with no record key of their own — retired
 *               spellings (`alert-triangle` -> `TriangleAlert`) and lucide's
 *               alternate digit spellings (`arrow-down-0-1` -> `ArrowDown01`).
 *               The live key is found BY IDENTITY, never by remembering a
 *               rename: the retired root export and its live record entry are
 *               the same object, which is the technique
 *               `check-lucide-icon-record-names.mjs` uses for the same reason.
 *   EXCLUSIONS  spellings the derivation produces that lucide does not publish
 *               (`Grid2X2` -> `grid-2x-2`, where lucide's name is `grid-2x2`).
 *               Listed so the reconstruction is EXACTLY lucide's vocabulary
 *               rather than a superset that quietly accepts invented names.
 *
 * ⚠️ Neither table may be hand-edited. `lucide-dynamic-name-aliases.test.ts`
 * rebuilds the vocabulary the runtime builds and compares it to
 * `Object.keys(dynamicIconImports)` from the INSTALLED lucide, in both
 * directions — so a lucide bump that adds, retires or respells a name reds that
 * test instead of silently narrowing what `LazyIcon` will draw.
 *
 * Usage: `node scripts/gen-lucide-dynamic-name-aliases.mjs [--check]`
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(ROOT, 'packages/components/src/lib/lucide-dynamic-name-aliases.ts');

// Resolve lucide the way `packages/components` does, not the way the repo root
// might: the bundle under budget is the one that package's imports produce.
const lucideRequire = createRequire(pathToFileURL(join(ROOT, 'packages/components/package.json')).href);
const lucide = await import(pathToFileURL(lucideRequire.resolve('lucide-react')).href);
const { iconNames } = await import(pathToFileURL(lucideRequire.resolve('lucide-react/dynamic.mjs')).href);

/**
 * A record KEY in lucide's own kebab spelling. Kept byte-identical to
 * `toDynamicIconName` in `packages/components/src/lib/lazy-icon.tsx` — the
 * runtime applies it to the same keys, and the drift test is what proves the
 * two still agree.
 */
const toDynamicIconName = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([A-Za-z])([0-9])/g, '$1-$2')
    .toLowerCase();

const toPascalCase = (name) =>
  name.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');

const recordKeys = Object.keys(lucide.icons);
const published = new Set(iconNames);

const derived = new Map();
for (const key of recordKeys) derived.set(toDynamicIconName(key), key);

const exclusions = [...derived.keys()].filter((name) => !published.has(name)).sort();

// Identity index: component object -> its LIVE key in the record.
const liveKeyOf = new Map();
for (const key of recordKeys) liveKeyOf.set(lucide.icons[key], key);

const aliases = {};
const unresolved = [];
for (const name of iconNames) {
  if (derived.has(name) && !exclusions.includes(name)) continue;
  const exported = lucide[toPascalCase(name)];
  const live = exported === undefined ? undefined : liveKeyOf.get(exported);
  if (live === undefined) unresolved.push(name);
  else aliases[name] = live;
}

if (unresolved.length > 0) {
  console.error(
    `${unresolved.length} dynamic icon name(s) resolve to no live record key by identity: ` +
      `${unresolved.slice(0, 10).join(', ')}.\n` +
      'That means the DYNAMIC vocabulary carries a name the RECORD cannot draw at all, so the ' +
      'reconstruction would accept a name and then render the fallback glyph — the exact silent ' +
      'degradation this table exists to prevent. Refusing to generate.',
  );
  process.exit(1);
}

const version = JSON.parse(readFileSync(lucideRequire.resolve('lucide-react/package.json'), 'utf8')).version;

const body = `/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * GENERATED by \`scripts/gen-lucide-dynamic-name-aliases.mjs\` from
 * lucide-react@${version}. ⛔ Do not hand-edit — run \`pnpm gen:lucide-aliases\`.
 *
 * The part of lucide's DYNAMIC icon vocabulary that the \`icons\` record this
 * bundle already carries cannot produce on its own. Deriving the rest is what
 * takes \`lucide-react/dynamic.mjs\` (a ${'120,683'}-byte import map whose only
 * job is to be a list of names) off the eager path without narrowing what
 * \`LazyIcon\` will draw. See the generator's header for the mechanism, and
 * \`lucide-dynamic-name-aliases.test.ts\` for the drift guard that keeps this
 * file honest across a lucide bump.
 *
 * Counts at generation time: ${recordKeys.length} record keys, ${iconNames.length} dynamic names,
 * ${Object.keys(aliases).length} aliases, ${exclusions.length} exclusions.
 */

/**
 * Dynamic names with no record key of their own, each mapped to the LIVE record
 * key that draws it. Found by object identity against lucide's own exports, so
 * a rename is read off the installed package rather than remembered here.
 */
export const LUCIDE_DYNAMIC_NAME_ALIASES: Readonly<Record<string, string>> = Object.freeze({
${Object.entries(aliases).map(([k, v]) => `  '${k}': '${v}',`).join('\n')}
});

/**
 * Spellings the runtime derivation produces that lucide does not publish. Listed
 * so the reconstructed vocabulary is EXACTLY lucide's, not a superset that would
 * accept an invented name and answer \`isLucideIconName\` with a false yes.
 */
export const LUCIDE_DERIVED_NAME_EXCLUSIONS: readonly string[] = Object.freeze([
${exclusions.map((n) => `  '${n}',`).join('\n')}
]);
`;

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8');
  if (current !== body) {
    console.error(`${OUT} is STALE — re-run \`pnpm gen:lucide-aliases\`.`);
    process.exit(1);
  }
  console.log(`OK — ${OUT} matches lucide-react@${version}.`);
} else {
  writeFileSync(OUT, body);
  console.log(
    `wrote ${OUT}: ${Object.keys(aliases).length} aliases, ${exclusions.length} exclusions, ` +
      `from lucide-react@${version} (${recordKeys.length} record keys, ${iconNames.length} dynamic names).`,
  );
}
