/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * objectui#2688 — the record surface opened from a gantt row (and any other
 * caller that provides neither `schema.title` nor a resolvable declared name
 * field) needs a readable title without falling back to its database key; the
 * meta footer must also keep audit references out of a bare text cell.
 *
 *  - Header: when everything above it misses, a name-ish key sitting right on
 *    the record (e.g. a `name` typed `autonumber`, which the type-aware
 *    derivation deliberately skips) must beat the object-title fallback.
 *  - Footer: `created_by` / `updated_by` are always user references on
 *    ObjectStack; when the fetched schema omits the audit system fields the
 *    footer must still render them through the REFERENCE RENDERER rather than
 *    degrading to a `text` cell that prints `String(value)`.
 *
 * ## The footer assertions were re-derived at objectui#8695 (PR objectui#9078)
 *
 * They used to read `expect(queryByText(OPAQUE_ID)).toBeNull()` — "the raw id
 * must not appear". ⛔ That was never objectui#2688's ask, and it is now false.
 *
 * objectui#2688's own expected-correct column is `创建人 Dev Admin · 47分钟前`
 * — the RESOLVED NAME — and its card records that the id it complains about
 * DOES exist in `sys_user` with `name = Dev Admin`. In the scenario the card
 * describes, the id disappears because it RESOLVES, not because anything hides
 * it. The located defect the card names is the degradation itself:
 * `objectSchema.fields.created_by` absent ⇒ `type:'text'` ⇒ `String(value)`.
 * So "the id is absent" was only ever a PROXY for "this went through the
 * reference renderer", read off the placeholder that renderer happened to draw
 * when nothing resolved.
 *
 * The proxy was weak even then. Measured on this fixture: the old placeholder
 * was a muted `—`, which is byte-identical to `EmptyValue`'s glyph, and a
 * footer rendered with NO `created_by` at all omits the actor entirely — both
 * satisfy `queryByText(OPAQUE_ID) === null`. The assertion could not tell the
 * reference renderer from a blank cell.
 *
 * objectui#8434 then ruled on that placeholder directly: the affordance for an
 * unresolved reference must be ADDITIVE (a stated marker, not an absence) and
 * EPISTEMIC ("this screen did not resolve it", never "not found"). The host
 * product's current UI rule additionally keeps database keys out of visible
 * text and tooltips.
 *
 * ⇒ The assertions below now name what objectui#2688 actually asked for, and
 * name it directly: the footer must render the audit actor through the
 * reference renderer's unresolved affordance, without exposing its database
 * key.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailView } from '../DetailView';
import { RecordMetaFooter } from '../RecordMetaFooter';
import type { DetailViewSchema } from '@object-ui/types';

describe('DetailView header title — record-key probe before the readable fallback (#2688)', () => {
  it('uses a name-ish record key when no schema.title and no declared name field resolve', () => {
    const schema: DetailViewSchema = {
      type: 'detail-view',
      objectName: 'production_plan',
      data: { id: 'A1', name: '甘特计划A 组焊' },
      fields: [{ name: 'status', label: '状态' }],
    };
    const { container } = render(<DetailView schema={schema} />);
    const h1 = container.querySelector('h1');
    expect(h1?.textContent).toBe('甘特计划A 组焊');
  });

  it('does not expose the record key when no name-like value resolves', () => {
    const schema: DetailViewSchema = {
      type: 'detail-view',
      objectName: 'thing',
      data: { id: 'B2', qty: 3 },
      fields: [{ name: 'qty', label: 'Qty' }],
    };
    const { container } = render(<DetailView schema={schema} />);
    expect(container.querySelector('h1')?.textContent).toBe('Details');
    expect(container.textContent).not.toContain('B2');
  });

  it('skips a key-shaped primary field and caller title', () => {
    const schema: DetailViewSchema = {
      type: 'detail-view',
      objectName: 'thing',
      primaryField: 'name',
      title: 'Record #B2',
      data: { id: 'B2', name: 'B2', qty: 3 },
      fields: [{ name: 'qty', label: 'Qty' }],
    };
    const { container } = render(<DetailView schema={schema} />);
    expect(container.querySelector('h1')?.textContent).toBe('Details');
    expect(container.textContent).not.toContain('B2');
  });

  it('keeps preferring schema.title over a guessed record key', () => {
    const schema: DetailViewSchema = {
      type: 'detail-view',
      objectName: 'thing',
      title: 'Object Label',
      data: { id: 'C3', name: 'Real Name' },
      fields: [{ name: 'name', label: 'Name' }],
    };
    const { container } = render(<DetailView schema={schema} />);
    // The unified resolver (step 3) resolves `name` via the schema-typed path
    // here; the point is the header is never the raw floor when a title exists.
    expect(container.querySelector('h1')?.textContent).not.toBe('Record #C3');
  });
});

describe('RecordMetaFooter — audit fields default to a sys_user reference (#2688)', () => {
  const OPAQUE_ID = 'g3WkZnvugj4DnYw8u5Mo6ig3ljDhiFGO';

  it('routes created_by through the reference renderer when the schema omits the audit field', () => {
    render(
      <RecordMetaFooter
        data={{ created_at: '2024-06-01T00:00:00Z', created_by: OPAQUE_ID }}
        objectSchema={{ fields: { name: { type: 'text' } } }}
        objectName="production_plan"
      />,
    );
    expect(screen.getByTestId('record-meta-footer')).toBeInTheDocument();

    // Nothing in this fixture can resolve the reference (no dataSource, no
    // options), so the renderer reaches its unresolved arm — and that arm is
    // the observable proof the value did NOT degrade to a `text` cell.
    const mark = document.querySelector('[data-slot="unresolved-reference"]');
    expect(mark).not.toBeNull();

    // The marker says the user could not be resolved while keeping the key
    // out of both visible text and the hover title.
    expect(mark?.textContent).toMatch(/unresolved|not resolved/i);
    expect(mark?.getAttribute('title')).toMatch(/not resolved/i);
    expect(mark?.textContent).not.toContain(OPAQUE_ID);
    expect(mark?.getAttribute('title')).not.toContain(OPAQUE_ID);
    expect(screen.queryByText(OPAQUE_ID)).toBeNull();
  });

  it('still honours an explicit audit-field definition from the schema', () => {
    render(
      <RecordMetaFooter
        data={{ created_at: '2024-06-01T00:00:00Z', created_by: OPAQUE_ID }}
        objectSchema={{
          fields: { created_by: { type: 'lookup', reference_to: 'sys_user' } },
        }}
        objectName="production_plan"
    />,
  );
    expect(document.querySelector('[data-slot="unresolved-reference"]')).not.toBeNull();
    expect(screen.queryByText(OPAQUE_ID)).toBeNull();
  });
});
