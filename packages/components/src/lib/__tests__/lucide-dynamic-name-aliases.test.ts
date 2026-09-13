/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, it, expect } from 'vitest';
import { icons, Database } from 'lucide-react';
import { iconNames } from 'lucide-react/dynamic.mjs';
import { getLazyIcon, isLucideIconName, lucideIconNames } from '../lazy-icon';
import {
  LUCIDE_DYNAMIC_NAME_ALIASES,
  LUCIDE_DERIVED_NAME_EXCLUSIONS,
} from '../lucide-dynamic-name-aliases';

/**
 * The drift guard for objectui#9204.
 *
 * `lazy-icon.tsx` no longer imports `lucide-react/dynamic.mjs`. Its 120,683-byte
 * import map was eager in the `ui-components` chunk for four modules that wanted
 * only the NAMES it is keyed by, while the `icons` record those names index was
 * eager beside it — two encodings of one catalogue, both paid for on every page
 * load. The vocabulary is now REBUILT from the record's keys plus a generated
 * table of the names no key can produce.
 *
 * ⚠️ A generated mirror with no drift guard is a worse defect than the one it
 * fixes, and its failure direction is the silent one: a lucide bump that adds,
 * retires or respells a name would narrow what `LazyIcon` draws with nothing
 * going red — the same class `scripts/check-lucide-icon-record-names.mjs` exists
 * for, one level out. So this file consults lucide's OWN map, which is still
 * installed and is still what the gate judges against, and compares the
 * reconstruction to it in BOTH directions. The map is a devDependency of the
 * test, never of the bundle.
 */
describe('the rebuilt lucide dynamic vocabulary', () => {
  it('is EXACTLY what lucide publishes — no name added, none lost', () => {
    // Both directions. A superset silently answers `isLucideIconName` yes for an
    // invented spelling and then paints the fallback glyph; a subset silently
    // stops drawing an icon that used to render.
    expect(lucideIconNames()).toEqual([...iconNames].sort());
  });

  it('is not vacuously equal — the comparison is over a real population', () => {
    // The control for the assertion above: two empty lists are also equal.
    expect(iconNames.length).toBeGreaterThan(2_000);
    expect(lucideIconNames().length).toBe(iconNames.length);
    expect(Object.keys(icons).length).toBeGreaterThan(1_700);
    // And the two vocabularies really are different, which is the whole reason
    // this surface is rebuilt rather than read off the record alone.
    expect(iconNames.length).toBeGreaterThan(Object.keys(icons).length);
  });

  it('draws every published name from the record, not the fallback glyph', () => {
    // Membership is worth nothing if the name resolves to `Database` anyway —
    // that is precisely the defect objectui#7593 caught on `CheckCircle2`.
    // `database` is the one name that draws the fallback component legitimately
    // — it IS that icon. Derived from lucide rather than assumed, so a release
    // that adds a second spelling for it does not read as a regression.
    const drawsDatabase = iconNames.filter((name: string) => getLazyIcon(name) === Database);
    const namesOfDatabase = Object.keys(icons).filter(
      (key) => icons[key as keyof typeof icons] === Database,
    );
    expect(namesOfDatabase).toEqual(['Database']);
    expect(drawsDatabase).toEqual(['database']);
    // Firing control: a name lucide does not publish must still degrade.
    expect(getLazyIcon('not-a-lucide-icon-name')).toBe(Database);
    expect(isLucideIconName('not-a-lucide-icon-name')).toBe(false);
  });

  it('keeps the RETIRED spellings the forgiving surface exists for', () => {
    // `record-alert`'s severity glyphs. These are ABSENT from the `icons` record
    // and present in the dynamic vocabulary, which is the entire reason the two
    // surfaces are distinct (objectui#7593, plugin-detail's severityIcons pin).
    for (const retired of ['AlertTriangle', 'AlertCircle', 'Edit', 'Smile']) {
      expect(isLucideIconName(retired)).toBe(true);
      expect(icons).not.toHaveProperty(retired);
    }
  });

  it('every generated alias names a LIVE record key', () => {
    const live = new Set(Object.keys(icons));
    const entries = Object.entries(LUCIDE_DYNAMIC_NAME_ALIASES);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, key] of entries) {
      expect(live.has(key)).toBe(true);
      expect(iconNames).toContain(name);
    }
  });

  it('every exclusion is a spelling lucide does NOT publish', () => {
    // An exclusion that IS a published name would delete a working icon.
    expect(LUCIDE_DERIVED_NAME_EXCLUSIONS.length).toBeGreaterThan(0);
    for (const name of LUCIDE_DERIVED_NAME_EXCLUSIONS) {
      expect(iconNames).not.toContain(name);
    }
  });
});
