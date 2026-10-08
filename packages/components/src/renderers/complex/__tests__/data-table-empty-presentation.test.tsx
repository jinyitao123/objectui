import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComponentRegistry } from '@object-ui/core';
import { SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import type { DataTableSchema } from '@object-ui/types';
import '../data-table';

interface RuntimeTableProps {
  schema: DataTableSchema;
  hideHeaderWhenEmpty?: boolean;
  hidePaginationWhenEmpty?: boolean;
  emptyStateContent?: React.ReactNode;
}

const Table = ComponentRegistry.get('data-table') as React.ComponentType<RuntimeTableProps>;
const baseSchema: DataTableSchema = {
  type: 'data-table',
  columns: [{ header: 'Name', accessorKey: 'name' }],
  data: [],
  searchable: false,
  exportable: false,
  manualPagination: true,
  rowCount: 0,
  pageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
};

const tableTypes = ['data-table', 'ui:data-table'];
const authorLocations = ['top', 'props', 'properties'] as const;
const emptyOptions = { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true };

function renderRegisteredTable(type: string, metadata: Record<string, unknown> = {}, hostProps: Omit<RuntimeTableProps, 'schema'> = {}) {
  return render(<SchemaRendererProvider dataSource={undefined}>
    <SchemaRenderer schema={{ ...baseSchema, ...metadata, type }} {...hostProps} />
  </SchemaRendererProvider>);
}

afterEach(cleanup);

describe('DataTable React-only empty presentation', () => {
  it.each(tableTypes.flatMap(type => authorLocations.map(location => [type, location] as const)))(
    'ignores authored empty options through SchemaRenderer for %s in %s', (type, location) => {
      const options = { ...emptyOptions, emptyStateContent: 'Authored empty content' };
      const metadata = location === 'top' ? options : { [location]: options };
      renderRegisteredTable(type, metadata);
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.queryByText('Authored empty content')).toBeNull();
    },
  );

  it.each(tableTypes)('preserves real host props over authored options for %s', type => {
    const authored = { hideHeaderWhenEmpty: false, hidePaginationWhenEmpty: false, emptyStateContent: 'Authored empty content' };
    const { container } = renderRegisteredTable(type, { ...authored, props: authored, properties: authored }, {
      ...emptyOptions, emptyStateContent: <span>Host empty content</span>,
    });
    expect(container.querySelector('thead')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Host empty content')).toBeInTheDocument();
    expect(screen.queryByText('Authored empty content')).toBeNull();
  });

  it('preserves declared DataTable row-number metadata through SchemaRenderer', () => {
    const { container } = renderRegisteredTable('data-table', { data: [{ id: 'r1', name: 'Aster' }], rowCount: 1, showRowNumbers: true });
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(Array.from(container.querySelectorAll('tbody tr:first-child td')).map(cell => cell.textContent?.trim())).toEqual(['1', 'Aster']);
  });

  it('leaves same-named authored props on unrelated registered components unchanged', () => {
    const type = 'table-presentation-unrelated';
    ComponentRegistry.register(type, (props: Record<string, unknown>) => <span>{[
      props.hideHeaderWhenEmpty, props.hidePaginationWhenEmpty, props.showRowNumbers, props.emptyStateContent,
    ].map(String).join('|')}</span>);
    try {
      renderRegisteredTable(type, { ...emptyOptions, showRowNumbers: true, emptyStateContent: 'Authored content' });
      expect(screen.getByText('true|true|true|Authored content')).toBeInTheDocument();
    } finally {
      ComponentRegistry.unregister(type);
    }
  });

  it('keeps the header, empty viewport and server pager by default', () => {
    const { container } = render(<Table schema={baseSchema} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="record-table-empty-viewport"]')).not.toBeNull();
    expect(screen.getByRole('combobox')).toHaveTextContent('10');
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['10', '20', '50', '100']);
  });

  it('can hide only the header while keeping the empty viewport and pager', () => {
    const { container } = render(<Table schema={baseSchema} hideHeaderWhenEmpty />);
    expect(container.querySelector('thead')).toBeNull();
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('can hide only the empty pager while retaining the column header', () => {
    render(<Table schema={baseSchema} hidePaginationWhenEmpty />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('restores both chrome regions when rows arrive', () => {
    const { container, rerender } = render(<Table schema={baseSchema} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(container.querySelector('thead')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    rerender(<Table schema={{ ...baseSchema, data: [{ id: 'r1', name: 'Aster' }], rowCount: 1 }} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('Aster')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('remeasures fixed-column offsets when an empty hidden header returns', () => {
    const columns: DataTableSchema['columns'] = [
      { header: 'Name', accessorKey: 'name', width: 150, fixed: 'left' },
      { header: 'Status', accessorKey: 'status', width: 150, fixed: 'left' },
    ];
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, this.textContent === 'Name' ? 70 : 80, 48);
    });
    try {
      const { container, rerender } = render(<Table schema={{ ...baseSchema, columns }} hideHeaderWhenEmpty />);
      expect(container.querySelector('thead')).toBeNull();
      rerender(<Table schema={{ ...baseSchema, columns, data: [{ id: 'r1', name: 'Aster', status: 'Active' }], rowCount: 1 }} hideHeaderWhenEmpty />);
      expect(screen.getByText('Active').closest('td')).toHaveStyle({ left: '70px' });
      expect(screen.getByRole('columnheader', { name: 'Status' })).toHaveStyle({ left: '70px' });
    } finally {
      rect.mockRestore();
    }
  });

  it.each([undefined, 5, Number.NaN])('preserves server paging and headers when the empty window has total %s', rowCount => {
    render(<Table schema={{ ...baseSchema, rowCount }} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('preserves the server page row-number offset while toggling its column', () => {
    const pageSchema: DataTableSchema = {
      ...baseSchema,
      data: [{ id: 'r21', name: 'Aster' }],
      rowCount: 25,
      page: 3,
      showRowNumbers: true,
    };
    const { container, rerender } = render(<Table schema={pageSchema} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(Array.from(container.querySelectorAll('tbody tr:first-child td')).map(cell => cell.textContent?.trim())).toEqual(['21', 'Aster']);
    rerender(<Table schema={{ ...pageSchema, showRowNumbers: false }} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(Array.from(container.querySelectorAll('tbody tr:first-child td')).map(cell => cell.textContent?.trim())).toEqual(['Aster']);
    rerender(<Table schema={pageSchema} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(Array.from(container.querySelectorAll('tbody tr:first-child td')).map(cell => cell.textContent?.trim())).toEqual(['21', 'Aster']);
  });

  it('does not hide chrome for an absent row payload', () => {
    const { data: _rows, ...missingData } = baseSchema;
    render(<Table schema={missingData as DataTableSchema} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('keeps ordinary schema objects from activating the React-only flags', () => {
    const metadata = { ...baseSchema, hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true };
    render(<Table schema={metadata} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('keeps row selection and paging callbacks with both flags on a populated table', () => {
    const select = vi.fn(), page = vi.fn();
    render(<Table schema={{
      ...baseSchema,
      data: [{ id: 'r1', name: 'Aster' }],
      rowCount: 21,
      showRowNumbers: false,
      selectable: true,
      onSelectionChange: select,
      onPageChange: page,
    }} hideHeaderWhenEmpty hidePaginationWhenEmpty />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.queryByText('#')).toBeNull();
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(select).toHaveBeenCalledWith([{ id: 'r1', name: 'Aster' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(page).toHaveBeenCalledWith(2);
  });
});
