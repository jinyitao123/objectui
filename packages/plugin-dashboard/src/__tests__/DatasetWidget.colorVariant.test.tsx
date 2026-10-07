// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * objectui#3359 / objectstack#5010 ruling B — a dataset-bound metric card must
 * honour its declared `DashboardWidgetSchema.widgets[].colorVariant`.
 *
 * Why it never did: `dataset` is REQUIRED on the widget schema, so every legal
 * widget renders through `DatasetWidget` (DashboardRenderer's two dispatch
 * sites), and `DatasetWidget` read the key nowhere — 16 real authorizations
 * (platform-objects' `system_overview` ×7, app-showcase's dashboards ×9, every
 * one a dataset-bound `metric`) all painted the same. Captured on
 * objectui origin/main@f9d70a72e, `colorVariant: 'success'` and no declaration
 * at all produced DOM identical character-for-character:
 *
 *   PROBE_UNDECLARED and PROBE_SUCCESS both →
 *   `…<span class="text-2xl font-semibold tabular-nums">510000</span>…`
 *
 * The two halves of this file pin OPPOSITE directions on purpose:
 *
 *  - the **default** (undeclared) keeps its metric value and measure. Declared
 *    default/unknown variants are compared with that current render, so host
 *    geometry tokens do not freeze an obsolete Tailwind class list;
 *  - the **per-variant** assertions were RED before (every variant produced the
 *    default markup) and are green after. Those are the feature's evidence.
 *
 * The vocabulary parity block reads the enum out of `@objectstack/spec/ui` at
 * test time rather than restating it, so a spec token added or retired fails
 * here instead of silently becoming a variant the renderer ignores.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
// The parity guard reads the spec's own enum — a direct spec import, as in
// widget-dispatch-spec-parity.test.ts. `@objectstack/spec` is this package's
// devDependency; the schema is deliberately NOT re-exported by
// `@object-ui/types` (decision (a) of objectui#2561), so this is the supported
// way to reach it.
import { WidgetColorVariantSchema } from '@objectstack/spec/ui';
import { enumOptions } from '@object-ui/test-support';
import { DatasetWidget } from '../DatasetWidget';
import { VARIANT_ICON_CLASSES, VARIANT_TEXT_CLASSES, metricAccentTextClass } from '../colorVariants';

afterEach(cleanup);

/** The spec's own token list, read at test time (see the parity block below). */
const specVariants: string[] = enumOptions(WidgetColorVariantSchema);

const renderMetric = async (widgetExtras: Record<string, unknown> = {}, rows = [{ revenue: 510000 }]) => {
  const src = { queryDataset: vi.fn(async () => ({ rows })) };
  const { container } = render(
    <DatasetWidget
      widget={{ type: 'metric', dataset: 'sales', values: ['revenue'], ...widgetExtras }}
      dataSource={src}
    />,
  );
  await screen.findByText('510000');
  return container;
};

/** The big number's class attribute — where a chrome-less KPI carries its accent. */
const valueClass = (container: HTMLElement) =>
  container.querySelector('span.tabular-nums')?.getAttribute('class') ?? '';

async function defaultMarkup(rows?: Array<{ revenue: number; revenue__compare?: number }>, extras: Record<string, unknown> = {}) {
  const container = await renderMetric(extras, rows);
  const html = container.innerHTML;
  const value = valueClass(container);
  cleanup();
  return { html, value };
}

/**
 * The mapping this issue delivers, restated independently of the
 * implementation: spec token → the accent appended to the value's classes.
 * `default` is absent deliberately — the enum's own name for "no accent".
 */
const EXPECTED_ACCENT: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  teal: 'text-teal-600 dark:text-teal-400',
  orange: 'text-orange-600 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
};

describe('DatasetWidget metric card — the declared colorVariant (#3359)', () => {
  // ── No-regression half: green before AND after this change ───────────────
  it('renders the metric value and measure without an undeclared accent', async () => {
    const container = await renderMetric();
    expect(container.querySelector('span.tabular-nums')?.textContent).toBe('510000');
    expect(container.textContent).toContain('revenue');
    for (const accent of Object.values(EXPECTED_ACCENT)) {
      for (const token of accent.split(' ')) expect(valueClass(container).split(' ')).not.toContain(token);
    }
  });

  it("treats the enum's own 'default' as no accent — identical bytes to undeclared", async () => {
    const baseline = await defaultMarkup();
    const container = await renderMetric({ colorVariant: 'default' });
    expect(container.innerHTML).toBe(baseline.html);
  });

  // An off-spec token gets NO accent and NO aliasing. The designer's swatch
  // picker carries three display-only aliases (`green`/`red`/`amber`) so it can
  // still paint a swatch for a legacy stored value; honouring them HERE would
  // give the renderer a vocabulary the spec does not have — a second de-facto
  // contract for AI-authored metadata to drift into (AGENTS.md #0.1). The spec
  // enum rejects them where the metadata is authored and published; a cosmetic
  // key is also the wrong place to fail a whole widget, hence "no accent"
  // rather than an error.
  it.each(['chartreuse', 'green', 'red', 'amber', '', '#ff0000'])(
    'ignores the off-spec token %j — no accent, no alias, baseline bytes',
    async (token) => {
      const baseline = await defaultMarkup();
      const container = await renderMetric({ colorVariant: token });
      expect(container.innerHTML).toBe(baseline.html);
    },
  );

  it('leaves a non-string colorVariant alone instead of throwing', async () => {
    const baseline = await defaultMarkup();
    const container = await renderMetric({ colorVariant: { token: 'blue' } });
    expect(container.innerHTML).toBe(baseline.html);
  });

  // ── Feature half: RED before this change, green after ────────────────────
  it.each(Object.entries(EXPECTED_ACCENT))(
    'tints the value with the %s accent',
    async (variant, accent) => {
      const baseline = await defaultMarkup();
      const container = await renderMetric({ colorVariant: variant });
      expect(valueClass(container)).toBe(`${baseline.value} ${accent}`);
      // The declared variant changes ONLY the value's colour — the layout, the
      // measure label and the value text are untouched.
      expect(container.innerHTML).toBe(
        baseline.html.replace(baseline.value, `${baseline.value} ${accent}`),
      );
    },
  );

  it('renders all eight enum values distinguishably (七个强调色 + default)', async () => {
    const baseline = await defaultMarkup();
    const seen: string[] = [];
    for (const variant of specVariants) {
      const container = await renderMetric({ colorVariant: variant });
      seen.push(valueClass(container));
      cleanup();
    }
    // 8 tokens → 8 distinct class strings: `default` keeps the bare base class,
    // each accent token adds its own. No two variants render alike.
    expect(new Set(seen).size).toBe(specVariants.length);
    expect(seen[specVariants.indexOf('default')]).toBe(baseline.value);
  });

  it('keeps the comparison trend row untouched by the accent', async () => {
    const rows = [{ revenue: 510000, revenue__compare: 400000 }];
    const plain = await renderMetric({ compareTo: { kind: 'previousPeriod' } }, rows);
    const plainHtml = plain.innerHTML;
    const plainValueClass = valueClass(plain);
    cleanup();
    // The delta row renders (that is what makes this case worth pinning) …
    expect(plainHtml).toContain('data-testid="dataset-compare-trend"');
    const tinted = await renderMetric({ compareTo: { kind: 'previousPeriod' }, colorVariant: 'danger' }, rows);
    // … and the tinted render differs from it in exactly one place: the value's
    // class attribute. The trend's own up/down colouring is data-driven and must
    // not inherit the widget's accent.
    expect(tinted.innerHTML).toBe(
      plainHtml.replace(plainValueClass, `${plainValueClass} ${EXPECTED_ACCENT.danger}`),
    );
  });
});

// ── Vocabulary parity: spec enum ↔ the renderer's tables ───────────────────
describe('colorVariant vocabulary is the spec enum, not a renderer invention', () => {
  it('reads a non-empty enum from the spec', () => {
    // Without this the parity assertions below could pass vacuously against an
    // empty list — the failure mode that makes a "green" parity test worthless.
    expect(specVariants, 'could not read WidgetColorVariantSchema.options from the spec').not.toEqual([]);
  });

  it('the accent tables cover exactly the spec tokens', () => {
    expect(Object.keys(VARIANT_TEXT_CLASSES).sort()).toEqual([...specVariants].sort());
    expect(Object.keys(VARIANT_ICON_CLASSES).sort()).toEqual([...specVariants].sort());
  });

  it('every spec token except `default` resolves to an accent', () => {
    for (const token of specVariants) {
      const resolved = metricAccentTextClass(token);
      if (token === 'default') expect(resolved).toBeUndefined();
      else expect(resolved, `spec token ${token} has no accent class`).toBeTruthy();
    }
  });

  it('the accent classes are pairwise distinct', () => {
    const accents = specVariants.filter((t) => t !== 'default').map((t) => metricAccentTextClass(t));
    expect(new Set(accents).size).toBe(accents.length);
  });

  // The tokens the 16 live authorizations actually use (system_overview +
  // app-showcase). Every one must resolve, or this issue's own metadata is
  // still unenforced after the fix.
  it('resolves every token the shipped dashboards authorize', () => {
    for (const token of ['blue', 'teal', 'orange', 'purple', 'success', 'warning', 'danger']) {
      expect(specVariants, `${token} is no longer a spec token`).toContain(token);
      expect(metricAccentTextClass(token)).toBe(EXPECTED_ACCENT[token]);
    }
  });
});
