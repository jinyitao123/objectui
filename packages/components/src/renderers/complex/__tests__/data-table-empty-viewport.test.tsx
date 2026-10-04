import React from 'react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import { SchemaRenderer } from '@object-ui/react';
import '../data-table';

const EMPTY_ACTION_TYPE = 'test:data-table-empty-viewport-action';
ComponentRegistry.register(EMPTY_ACTION_TYPE, () => (
  <button type="button">Create a record</button>
));

function renderEmptyTable(overrides: Record<string, unknown> = {}) {
  return render(
    <SchemaRenderer
      schema={{
        type: 'data-table',
        columns: [{ header: 'Name', accessorKey: 'name' }],
        data: [],
        searchable: false,
        selectable: false,
        rowActions: false,
        ...overrides,
      } as never}
    />,
  );
}

describe('data-table empty state placement', () => {
  it('keeps the header and spacer row while rendering one empty state beside the table', () => {
    renderEmptyTable();

    const table = screen.getByRole('table');
    const emptyState = screen.getByRole('status');
    const spacerRow = table.querySelector('tbody tr');

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(spacerRow).toHaveAttribute('aria-hidden', 'true');
    expect(spacerRow?.querySelector('td')?.textContent).toBe('');
    expect(emptyState).toHaveAttribute('data-slot', 'data-empty-state');
    expect(table).not.toContainElement(emptyState);
    expect(table.parentElement?.nextElementSibling).toContainElement(emptyState);
    expect(screen.getAllByText(/No results found/)).toHaveLength(1);
    expect(screen.getAllByText(/Try adjusting your filters or search query/)).toHaveLength(1);
  });

  it('keeps the emptyAction in that single state through SchemaRenderer', () => {
    renderEmptyTable({
      emptyAction: { type: EMPTY_ACTION_TYPE },
    });

    const emptyState = screen.getByRole('status');
    expect(within(emptyState).getByRole('button', { name: 'Create a record' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create a record' })).toHaveLength(1);
  });

  it('leaves empty content in the table cell when the parent owns scrolling', () => {
    renderEmptyTable({ disableInnerScroll: true });

    const table = screen.getByRole('table');
    const emptyState = screen.getByRole('status');

    expect(table).toContainElement(emptyState);
    expect(table.parentElement?.nextElementSibling).toBeNull();
    expect(table.querySelector('tbody tr')).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('preserves the automatic pager rule for empty local data and manual pages', () => {
    const { rerender } = render(
      <SchemaRenderer
        schema={{
          type: 'data-table',
          columns: [{ header: 'Name', accessorKey: 'name' }],
          data: [],
          searchable: false,
          selectable: false,
          rowActions: false,
        } as never}
      />,
    );
    expect(screen.queryByText(/Page 1 of 1/)).not.toBeInTheDocument();

    rerender(
      <SchemaRenderer
        schema={{
          type: 'data-table',
          columns: [{ header: 'Name', accessorKey: 'name' }],
          data: [],
          pagination: true,
          manualPagination: true,
          page: 1,
          pageSize: 10,
          rowCount: 0,
          searchable: false,
          selectable: false,
          rowActions: false,
        } as never}
      />,
    );
    expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
