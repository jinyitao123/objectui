// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
// The grid's vocabulary arrives through `import('lucide-react/dynamic.mjs')`
// (objectui#9204). Importing that module here, at module scope, pays for it in
// the import phase — which is under no test or hook timeout — instead of
// letting a saturated transform pipeline spend a `findBy` budget on it.
import 'lucide-react/dynamic.mjs';
import { WIDGETS } from './widgets';

afterEach(cleanup);

const Icon = WIDGETS['icon'];

/**
 * `icon` widget — a searchable Lucide icon picker for page/app/object `icon`
 * fields (replaces the raw text input). Built inline (no Radix portal) so the
 * trigger, search box and result grid all render without a portal in jsdom. The
 * icon previews lazy-load their SVG chunk and degrade to a fallback glyph, so
 * these tests assert on the catalog wiring rather than the rendered <svg>.
 *
 * ⚠️ The GRID is asynchronous since objectui#9204 — the vocabulary is lucide's
 * dynamic-import map, fetched when the dialog opens rather than held on the
 * eager path. The trigger is not: it asks `isLucideIconName`, which reads the
 * `icons` record and needs nothing loaded. That split is why the rows below
 * await the options but not the combobox.
 */
describe('icon widget', () => {
  it('is registered in the WIDGETS map', () => {
    expect(Icon).toBeTypeOf('function');
  });

  it('renders a combobox trigger showing the current icon name', () => {
    render(<Icon value="calendar" onChange={() => {}} schema={{ type: 'string' }} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('calendar');
  });

  it('says it is loading before the catalogue lands, not "no matching icons"', () => {
    // The synchronous frame. An empty grid mid-fetch must not read as a query
    // that found nothing — that sentence would be a false answer to a question
    // nobody has asked yet.
    render(<Icon value="" onChange={() => {}} schema={{ type: 'string' }} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('Loading options…')).toBeInTheDocument();
    expect(screen.queryByText('No matching icons.')).toBeNull();
  });

  it('opens a search box and filters the icon grid by query', async () => {
    render(<Icon value="" onChange={() => {}} schema={{ type: 'string' }} />);
    fireEvent.click(screen.getByRole('combobox'));

    const search = screen.getByLabelText('Search icons…');
    const before = (await screen.findAllByRole('option')).length;
    expect(before).toBeGreaterThan(0);

    fireEvent.change(search, { target: { value: 'ampersand' } });
    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeLessThan(before);
    });
    const after = screen.getAllByRole('option');
    expect(after.length).toBeGreaterThan(0);
    // Every surviving option matches the query.
    for (const opt of after) {
      expect(opt.getAttribute('title')).toContain('ampersand');
    }
  });

  it('writes the selected icon name through onChange', async () => {
    const onChange = vi.fn();
    render(<Icon value="" onChange={onChange} schema={{ type: 'string' }} />);
    fireEvent.click(screen.getByRole('combobox'));
    await screen.findAllByRole('option');
    fireEvent.change(screen.getByLabelText('Search icons…'), { target: { value: 'ampersand' } });
    await waitFor(() => {
      expect(screen.getAllByRole('option')[0]?.getAttribute('title')).toContain('ampersand');
    });
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(String(onChange.mock.calls[0][0])).toContain('ampersand');
  });

  it('offers only names the renderer will resolve — the vocabulary is the record', async () => {
    // objectui#9204: the picker and `getLazyIcon` read ONE vocabulary now. A
    // retired spelling in this grid would be an author-facing trap — pickable,
    // then refused at render time.
    render(<Icon value="" onChange={() => {}} schema={{ type: 'string' }} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByLabelText('Search icons…'), { target: { value: 'filter' } });
    const options = await screen.findAllByRole('option');
    const titles = options.map((o) => o.getAttribute('title'));
    // `filter` is a spelling lucide still LOADS but has dropped from the record
    // (it is `funnel` now). ⭐ The control is `list-filter`: the query DOES match
    // live names, so the absence below is a refusal rather than an empty grid.
    expect(titles).toContain('list-filter');
    expect(titles).not.toContain('filter');
  });

  it('preserves an out-of-catalog value (renders it, offers a keep option)', () => {
    render(<Icon value="totally-made-up-icon" onChange={() => {}} schema={{ type: 'string' }} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('totally-made-up-icon');
    // Re-opening still surfaces the unknown value so it is never silently dropped.
    fireEvent.click(trigger);
    expect(
      screen.getAllByRole('option').some((o) => o.getAttribute('title') === 'totally-made-up-icon'),
    ).toBe(true);
  });
});
